# Estudio de Pitch — Especificación de API

**Para:** Dirección de Tecnología, Universidad de La Sabana
**De:** Centro de Desarrollo Profesional — Alumni Sabana
**Versión:** 1.4 · agosto de 2026

> **Cambios frente a la 1.3:** texto del acuerdo actualizado a la redacción aprobada por dirección (`ACUERDO_VERSION = "1.1"`); botones de acceso siempre visibles; **modo demostración** que permite probar el registro completo sin backend — ver §10.
>
> **Cambios de la 1.2 a la 1.3:** acuerdo de confidencialidad obligatorio en el registro, con persistencia de versión, fecha, IP y navegador como prueba del consentimiento.
>
> **Cambios de la 1.1 a la 1.2:** el registro ya **no** devuelve token — ahora exige verificación por código enviado al correo (`POST /auth/verificar`, `POST /auth/codigo`); nuevo campo `rol` en el usuario; endpoint administrativo `GET /admin/rondas`; el Excel dejó de estar a la vista del usuario final y pasó a ser exclusivo del administrador.
>
> **Cambios de la 1.0 a la 1.1:** registro restringido a `@unisabana.edu.co`; campos obligatorios de facultad y programa; endpoint `POST /observaciones` como proxy hacia la API de Anthropic; exportación a Excel; automatización opcional hacia OneDrive.

---

## 1. Qué es y qué se necesita

**Estudio de Pitch** es una herramienta web de práctica de pitch. Es un único archivo HTML estático, sin dependencias ni build: todo el procesamiento (cronómetro, análisis de voz, cálculo del reporte) ocurre en el navegador de quien la usa.

Lo único que se le pide a TI es **una API que guarde el historial de práctica de las personas que decidan crear una cuenta**. Nada más. La herramienta ya funciona sin ella.

### Principio de diseño, no negociable

> **La grabación de audio nunca sale del navegador.** No se sube, no se almacena, no se transmite. Se descarta al cerrar la pestaña.

Esto es deliberado: el audio de voz es el dato de mayor sensibilidad y el de menor valor de consulta. Se persisten **la transcripción en texto y las cifras del reporte**, que es lo que permite ver progreso. Cualquier requerimiento futuro de guardar audio debe pasar antes por protección de datos.

### Volumen estimado

| | Por ronda | 500 personas × 10 rondas/año |
|---|---|---|
| Registro completo (JSON) | ~3–8 KB | **~40 MB/año** |

Es una carga despreciable para cualquier instancia de PostgreSQL existente.

---

## 2. Modelo de acceso

- **Sin cuenta:** la herramienta funciona completa. El historial se guarda en `localStorage` del navegador. La API no interviene.
- **Con cuenta:** el historial se guarda en el servidor y está disponible desde cualquier dispositivo. Requiere correo `@unisabana.edu.co`, verificación por código y aceptación del acuerdo de confidencialidad.
- **Dos roles:** `usuario` ve solo sus datos; `admin` ve el consolidado de todas las personas y puede exportarlo a Excel.

Al iniciar sesión, si hay rondas guardadas localmente, el cliente ofrece subirlas. Esa sincronización usa el mismo `POST /rondas`; no requiere endpoint adicional.

> **Nota sobre el alcance.** Restringir a correo institucional deja por fuera a los egresados que ya perdieron su cuenta de la Universidad. Si el CDP quiere atenderlos, hará falta abrir el dominio o habilitar un mecanismo alterno de verificación. Vale la pena decidirlo antes de publicar.

---

## 3. Contrato de la API

**Base URL:** a definir. Ejemplo: `https://api.unisabana.edu.co/estudio-pitch`

Todas las respuestas son `application/json` con `charset=utf-8`. Los errores devuelven `{"error": "mensaje legible en español"}` — el cliente muestra ese texto directamente a la persona, así que debe ser comprensible, no un stack trace.

### 3.1 `POST /auth/registro`

Crea la cuenta en estado pendiente y dispara el correo con el código. **Facultad, programa y aceptación del acuerdo son obligatorios** — el cliente pide facultad y programa antes que el correo, en dos listas desplegables encadenadas, y no deja enviar sin la casilla marcada.

El catálogo de facultades y programas vive en el HTML (constante `FACULTADES`: 9 unidades académicas, 29 pregrados, más una opción «Otra / no está en la lista» para posgrados y programas descontinuados). El servidor **no** debe validar contra una lista cerrada: guarda el texto tal como llega, para que actualizar la oferta académica no requiera desplegar el backend.

```json
// Petición
{
  "correo": "nombre.apellido@unisabana.edu.co",
  "clave": "…",
  "nombre": "Nombre Apellido",
  "facultad": "Facultad de Ingeniería",
  "programa": "Ingeniería Industrial",
  "acuerdo": { "aceptado": true, "version": "1.0", "fecha": "2026-08-06T00:54:37.439Z" }
}

// 202 Accepted — NO devuelve token
{ "mensaje": "Código enviado" }
```

**Importante:** el registro crea la cuenta en estado *pendiente de verificación* y envía un código de seis dígitos al correo. La sesión se abre en `/auth/verificar`, no aquí.

| Código | Caso | `error` sugerido |
|---|---|---|
| `409` | Correo ya registrado y verificado | `Ese correo ya está registrado. Inicia sesión.` |
| `422` | Correo fuera del dominio institucional | `El correo debe terminar en @unisabana.edu.co` |
| `422` | Clave < 8 caracteres, o falta facultad o programa | mensaje específico del campo |
| `422` | `acuerdo.aceptado` no es `true` | `Debes aceptar el acuerdo de confidencialidad.` |

**El campo `acuerdo` es la prueba del consentimiento.** Guárdenlo íntegro y de forma inmutable: es lo que demuestra ante la SIC que hubo autorización previa y expresa. El servidor debe rechazar el registro si falta o si `aceptado` no es `true`, y **debe registrar su propia marca de tiempo** además de la que envía el cliente (la del navegador es manipulable). Cuando el texto de la casilla cambie, se sube `ACUERDO_VERSION` en el HTML y quienes ya estaban registrados conservan la versión que aceptaron.

Si el correo existe pero **no** está verificado, reenvíen el código y devuelvan `202`: es el caso de quien abandonó el registro a medias.

`nombre` es opcional y puede llegar vacío. **La validación del dominio debe repetirse en el servidor**: la del cliente es solo comodidad de interfaz.

### 3.1 bis `POST /auth/verificar`

Valida el código y abre la sesión.

```json
// Petición
{ "correo": "nombre.apellido@unisabana.edu.co", "codigo": "482913" }

// 200 OK
{
  "token": "eyJhbGciOi…",
  "usuario": {
    "id": "550e8400-…",
    "correo": "nombre.apellido@unisabana.edu.co",
    "nombre": "Nombre Apellido",
    "facultad": "Facultad de Ingeniería",
    "programa": "Ingeniería Industrial",
    "rol": "usuario"
  }
}
```

| Código | Caso | `error` sugerido |
|---|---|---|
| `401` | Código incorrecto | `El código no es correcto.` |
| `410` | Código vencido | `El código venció. Pide uno nuevo.` |
| `404` | No hay registro pendiente | `No hay registro pendiente para ese correo.` |
| `429` | Demasiados intentos | `Demasiados intentos. Espera unos minutos.` |

**Requisitos del código**

- Seis dígitos, generados con un generador criptográficamente seguro (`crypto.randomInt`, no `Math.random`).
- Vigencia **10 minutos** — el cliente muestra una cuenta regresiva de 10:00 sincronizada con este valor. Si lo cambian, avisen para ajustarlo.
- Máximo **5 intentos** por código; al sexto, invalidarlo y exigir reenvío.
- Guardar **el hash** del código, no el código en claro.
- Un solo código válido por correo: emitir uno nuevo invalida el anterior.

### 3.1 ter `POST /auth/codigo`

Reenvía el código. `{ "correo": "…" }` → `202 { "mensaje": "Código reenviado" }`.

Limitar a **3 reenvíos por correo cada 15 minutos** (`429` al superarlo). Devolver `202` también cuando el correo no exista, para no revelar qué direcciones están registradas — el cliente ya muestra un mensaje neutro.

#### Correo de verificación

Enviarlo desde una dirección institucional (por ejemplo `no-responder@unisabana.edu.co`) con SPF, DKIM y DMARC configurados: sin eso, seis dígitos en un correo transaccional caen en spam con frecuencia. Asunto sugerido: *«Tu código de verificación — Estudio de Pitch»*. El cuerpo debe indicar la vigencia de 10 minutos y advertir que el CDP nunca pide ese código por teléfono ni por chat.

### 3.2 `POST /auth/sesion`

```json
// Petición
{ "correo": "nombre.apellido@unisabana.edu.co", "clave": "…" }

// 200 OK — mismo cuerpo que /auth/verificar
```

`401` si las credenciales no coinciden. **Usar el mismo mensaje para correo inexistente y clave incorrecta** (`Correo o contraseña incorrectos.`) para no revelar qué correos están registrados.

`403` si la cuenta existe pero no está verificada: `Debes verificar tu correo antes de entrar.`

### 3.3 `GET /rondas`

Requiere `Authorization: Bearer <token>`. Devuelve todas las rondas del usuario autenticado.

```json
{ "rondas": [ { "id": "…", "creada_en": "2026-08-05T21:14:32.711Z", "…": "…" } ] }
```

El cliente ordena por `creada_en` descendente; el servidor no necesita garantizar orden.

### 3.4 `POST /rondas`

```json
{ "ronda": { …objeto completo, ver §4… } }
```

Respuesta `201` con `{"ronda": {…, "id": "<id asignado>"}}`. El servidor **asigna el `id`** e **ignora cualquier `id` que llegue** en la petición.

### 3.5 `DELETE /rondas/{id}`

`204 No Content`. `404` si la ronda no existe o no pertenece al usuario — **nunca `403`**, para no confirmar la existencia de rondas ajenas.

### 3.6 `DELETE /rondas`

Borra todo el historial del usuario. `204 No Content`. Es el mecanismo de ejercicio del derecho de supresión (§7).

### 3.6 bis `GET /admin/rondas` — solo administradores

Devuelve **todas** las rondas de **todas** las personas, con los datos de quien las hizo.

```json
{
  "rondas": [
    {
      "correo": "ana.perez@unisabana.edu.co",
      "nombre": "Ana Pérez",
      "facultad": "Facultad de Ingeniería",
      "programa": "Ingeniería Industrial",
      "id": "…", "creada_en": "…", "puntaje": 78, "…": "…"
    }
  ]
}
```

`403` con `Requiere rol de administrador.` si el token no es de un administrador. **La verificación va en el servidor**: el cliente oculta el panel, pero eso es comodidad de interfaz, no un control de seguridad.

#### Sobre el rol

El campo `rol` del usuario admite `"usuario"` (por omisión) o `"admin"`. **No debe existir forma de auto-asignarse el rol de administrador desde el formulario de registro.** Se asigna manualmente en base de datos, o mediante una lista blanca de correos del CDP en la configuración del servidor:

```sql
UPDATE usuarios SET rol = 'admin' WHERE correo = 'cdp.admin@unisabana.edu.co';
```

Cada cuenta de administrador ve datos personales de terceros, así que conviene: que sean pocas y nominales (nunca una cuenta compartida), y que quede registro de auditoría de cada `GET /admin/rondas` y de cada exportación.

### 3.7 `POST /observaciones` — proxy de IA

Recibe una ronda y devuelve un texto redactado por un modelo de lenguaje. **Este endpoint existe para que la clave de la API nunca toque el navegador.**

```json
// Petición — mismo objeto de ronda de §4
{ "ronda": { … } }

// 200 OK
{ "texto": "**Lectura general.** …\n\n**Dónde poner el esfuerzo.** …" }
```

El cliente interpreta `\n\n` como separador de párrafo y `**texto**` como negrita. Nada más: no envíen HTML.

**Comportamiento ante fallo.** Si este endpoint no existe, falla o tarda demasiado, el cliente **no muestra error bloqueante**: genera las observaciones localmente con reglas y avisa de la degradación. Es decir, pueden desplegar sin este endpoint y agregarlo después.

#### Implementación sugerida (API de Anthropic)

```
POST https://api.anthropic.com/v1/messages
x-api-key: <clave en variable de entorno del servidor, jamás en el cliente>
anthropic-version: 2023-06-01
```

```json
{
  "model": "claude-sonnet-4-5",
  "max_tokens": 700,
  "system": "Eres asesor del Centro de Desarrollo Profesional de la Universidad de La Sabana. Recibes las métricas de una ronda de práctica de pitch de un estudiante y su transcripción. Escribe observaciones en español de Colombia, en segunda persona, entre 180 y 260 palabras, en 4 o 5 párrafos, cada uno abriendo con un rótulo en negrita. Sé concreto y accionable: cita cifras de las métricas. Señala primero lo que funcionó, luego la dimensión más baja con una instrucción ejecutable. No inventes datos que no estén en la entrada. No evalúes la calidad de los argumentos ni des concepto académico. No uses listas ni viñetas.",
  "messages": [{ "role": "user", "content": "<JSON de la ronda>" }]
}
```

Devuelvan al cliente únicamente `content[0].text`.

**Recomendaciones de operación**

- Tiempo de espera de 25 s; ante vencimiento, `504` y el cliente cae al modo local.
- Límite de tasa por usuario (sugerido: 20 observaciones/día) — cada llamada tiene costo.
- Registrar consumo de tokens por usuario para presupuestar.
- **No almacenar** la respuesta del modelo asociada al usuario salvo que el CDP lo pida explícitamente; hoy el cliente no la persiste.
- Si más adelante prefieren un proveedor dentro del tenant de Microsoft, este mismo contrato sirve: solo cambia lo que hay detrás del endpoint.

---

## 4. Estructura de una ronda

Objeto que envía el cliente. Todos los campos son datos derivados del análisis; **no hay ningún campo binario ni referencia a audio**.

```json
{
  "creada_en": "2026-08-05T21:14:32.711Z",
  "tipo": "empleo",
  "tipo_nombre": "Pitch para búsqueda de empleo",
  "duracion_objetivo": 180,
  "duracion_real": 176,
  "modo": "mic",
  "puntaje": 78,
  "palabras": 402,
  "ppm": 137,
  "muletillas_total": 5,
  "muletillas_top": [ { "palabra": "o sea", "veces": 3 } ],
  "secciones_cubiertas": 5,
  "secciones_total": 6,
  "dimensiones": [
    { "id": "duracion", "nombre": "Duración", "valor": "2:56",
      "pct": 88, "dato": "objetivo 3:00 · desvío −2%", "texto": "Cerraste dentro del margen…" }
  ],
  "ejercicio": { "titulo": "…", "texto": "…", "pasos": ["…"] },
  "visual": {
    "medida": true, "puntaje": 84,
    "encuadre": 90, "orientacion": 82, "postura": 85,
    "movimiento": "moderado", "gestualidad": "moderada",
    "estabilidad": 88, "repetitivo": false,
    "rostro_pct": 97, "cuerpo_pct": 91, "manos_pct": 64,
    "muestras": 580, "segundos": 58
  },
  "transcripcion": "Soy ingeniera industrial y llevo cuatro años…"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `tipo` | enum | `elevator` · `comercial` · `emprendimiento` · `empleo` · `academico` · `final` |
| `modo` | enum | `mic` (con micrófono) · `manual` (sin micrófono) |
| `duracion_*` | entero | segundos |
| `puntaje` | entero | 0–100 |
| `dimensiones` | array | siempre 8 elementos; `pct` es `null` en «Energía vocal» cuando `modo = "manual"`, y en «Presencia visual» cuando no se usó cámara |
| `visual` | objeto | métricas del módulo de cámara. `{"medida": false}` si no se usó. **Nunca contiene video, imágenes ni fotogramas**: solo cifras y etiquetas. Rechazar en el servidor cualquier clave que parezca binaria |
| `transcripcion` | texto | **limitar a 20.000 caracteres**; 10 min de habla son ~8.000 |

---

## 5. Esquema de base de datos (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE usuarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correo        citext UNIQUE NOT NULL
                CHECK (correo LIKE '%@unisabana.edu.co'),
  clave_hash    text NOT NULL,
  nombre        text NOT NULL DEFAULT '',
  facultad      text NOT NULL,
  programa      text NOT NULL,
  rol           text NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario','admin')),
  verificado    boolean NOT NULL DEFAULT false,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  ultimo_acceso timestamptz,
  -- Prueba del consentimiento (Ley 1581, art. 9)
  acuerdo_version   text NOT NULL,
  acuerdo_fecha     timestamptz NOT NULL DEFAULT now(),  -- marca del servidor
  acuerdo_ip        inet,
  acuerdo_navegador text
);

CREATE INDEX idx_usuarios_facultad ON usuarios (facultad, programa);

CREATE TABLE codigos_verificacion (
  correo      citext PRIMARY KEY,
  codigo_hash text NOT NULL,
  intentos    smallint NOT NULL DEFAULT 0,
  vence_en    timestamptz NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Limpieza periódica de códigos vencidos
DELETE FROM codigos_verificacion WHERE vence_en < now() - interval '1 day';

CREATE TABLE rondas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creada_en           timestamptz NOT NULL DEFAULT now(),
  tipo                text NOT NULL CHECK (tipo IN ('emprendimiento','empleo','academico','final')),
  tipo_nombre         text NOT NULL,
  modo                text NOT NULL CHECK (modo IN ('mic','manual')),
  duracion_objetivo   integer NOT NULL CHECK (duracion_objetivo BETWEEN 1 AND 3600),
  duracion_real       integer NOT NULL CHECK (duracion_real BETWEEN 0 AND 7200),
  puntaje             smallint NOT NULL CHECK (puntaje BETWEEN 0 AND 100),
  palabras            integer NOT NULL CHECK (palabras >= 0),
  ppm                 integer NOT NULL CHECK (ppm >= 0),
  muletillas_total    integer NOT NULL CHECK (muletillas_total >= 0),
  muletillas_top      jsonb   NOT NULL DEFAULT '[]'::jsonb,
  secciones_cubiertas smallint NOT NULL,
  secciones_total     smallint NOT NULL,
  dimensiones         jsonb   NOT NULL,
  ejercicio           jsonb   NOT NULL,
  transcripcion       text    NOT NULL CHECK (length(transcripcion) <= 20000)
);

CREATE INDEX idx_rondas_usuario_fecha ON rondas (usuario_id, creada_en DESC);
```

`ON DELETE CASCADE` es lo que hace que eliminar la cuenta elimine el historial en una sola operación.

---

## 6. Seguridad

**Contraseñas.** `argon2id` (preferido) o `bcrypt` con coste ≥ 12. Nunca en texto plano, nunca con SHA sin salt. La herramienta advierte a las personas que no reutilicen la contraseña del correo institucional, pero eso no exime al servidor.

**Tokens.** JWT firmado, vigencia recomendada de 8 horas. El cliente lo guarda en `localStorage` y lo envía como `Authorization: Bearer`. Ante un `401` el cliente cierra la sesión automáticamente y pide reingreso.

> Si TI prefiere **cookie `httpOnly` + `SameSite=Lax`** en lugar de Bearer —más resistente a XSS—, es un cambio de tres líneas en el cliente. Díganme y lo ajusto. Requiere que la API y el HTML se sirvan desde el mismo dominio, o CORS con `credentials`.

**Aislamiento.** Toda consulta a `rondas` debe filtrar por el `usuario_id` del token. Nunca aceptar un `usuario_id` que venga del cliente.

**CORS.** Restringir `Access-Control-Allow-Origin` al dominio exacto donde se publique el HTML. No usar `*`.

**Límites de tasa.** Sugerido: 5 intentos de `/auth/sesion` por IP cada 15 minutos; 60 `POST /rondas` por usuario por hora.

**Validación.** Validar tamaño y forma del JSON en el servidor. El cliente es código que corre en la máquina de otra persona: puede ser modificado.

**Transporte.** HTTPS obligatorio. Además, el micrófono y el reconocimiento de voz del navegador **solo funcionan bajo HTTPS**, así que no hay alternativa.

---

## 6 bis. Excel y OneDrive

### Lo que ya funciona

El botón **Exportar a Excel** de la sección Reporte genera un `.xlsx` real —no un CSV renombrado— con una fila por ronda y 25 columnas: correo, nombre, facultad, programa, fecha, escenario, modo, objetivo, duración, puntaje, palabras, ppm, muletillas, cobertura, el porcentaje de cada una de las siete dimensiones, muletillas frecuentes, ejercicio sugerido y transcripción. Los valores numéricos van como números, listos para tabla dinámica.

El generador está escrito dentro del propio HTML (ZIP + OOXML, ~90 líneas): **no carga ninguna librería externa**, así que funciona sin conexión y no depende de que un CDN siga vivo dentro de tres años.

**Solo lo ve el administrador.** Las personas que practican no tienen acceso a la exportación: para ellas hay únicamente *Descargar JSON*, que contiene sus propios datos y existe para satisfacer el derecho de acceso y portabilidad. El administrador tiene dos botones: el Excel de su propio historial y **Exportar todo a Excel**, que consolida a todas las personas en un solo archivo.

El panel de administración también muestra, en pantalla, el total de personas y rondas, el promedio de puntaje y una tabla por facultad y programa.

Hoy ese archivo lo descarga el administrador y lo guarda en la carpeta restringida del CDP en OneDrive. Es manual pero inmediato.

### Automatización (cuando TI pueda)

Para consolidar **todas** las personas en un solo Excel de OneDrive sin intervención manual, dos caminos:

**Microsoft Graph desde el backend.** Un job programado (por ejemplo diario) consulta la base y actualiza un libro en OneDrive o SharePoint:

```
PATCH /v1.0/drives/{drive-id}/items/{item-id}/workbook/worksheets/{hoja}/range(address='A2:Y5000')
POST  /v1.0/drives/{drive-id}/items/{item-id}/workbook/tables/{tabla}/rows/add
```

Requiere registrar la aplicación en Entra ID con permiso `Files.ReadWrite.All` (o `Sites.ReadWrite.All` si el libro vive en SharePoint) y consentimiento del administrador.

**Power Automate.** Un flujo programado que llame a un endpoint de la API —por ejemplo `GET /admin/rondas` con clave de servicio— y use la acción *Agregar fila a una tabla*. Más fácil de aprobar si ya tienen licencias, y no requiere código nuevo.

En ambos casos hace falta un endpoint administrativo que devuelva las rondas de todas las personas, con autenticación separada de la de usuario final. No está especificado arriba porque implica decidir quién del CDP puede ver datos de terceros — conviene definirlo con protección de datos antes de construirlo.

---

## 7. Protección de datos (Ley 1581 de 2012)

Guardar transcripciones asociadas a un correo es tratamiento de datos personales. Antes de publicar:

1. **Autorización previa y expresa.** ✅ Implementada: casilla obligatoria, sin marcar por defecto, que bloquea el registro si no se acepta. El texto declara responsable, datos recogidos, finalidad, confidencialidad y derechos, y enlaza a la Política de Tratamiento. Se persiste versión, fecha, IP y navegador. **Pendiente:** que el oficial de protección de datos revise la redacción y confirme la URL de la política (hoy apunta a `unisabana.edu.co/politica-de-tratamiento-de-datos-personales/`, sin verificar). El texto vive en el HTML, en el bloque `#bloque-acuerdo`, y su versión en la constante `ACUERDO_VERSION`.

   > **Texto vigente — versión 1.1, aprobado por dirección del CDP en agosto de 2026:**
   >
   > *«Autorizo a la Universidad de La Sabana, a través del Centro de Desarrollo Profesional, a almacenar y tratar mis datos de uso, la recurrencia de acceso, las transcripciones de mis prácticas, las retroalimentaciones ofrecidas en la página y las cifras de mis reportes, con el fin de mostrarme mi progreso y elaborar estadísticas agregadas del servicio.*
   >
   > *Entiendo que el audio no se almacena ni se envía a servidores; que las observaciones con inteligencia artificial se generan únicamente cuando las solicito; que la información es confidencial y no se comparte con docentes, empleadores ni terceros, salvo obligación legal; y que puedo consultar, corregir o solicitar la eliminación de mis datos conforme a la Política de Tratamiento de Datos Personales de la Universidad.»*

   Nota para el desarrollo: el acuerdo declara que se tratan **datos de uso y recurrencia de acceso**. Eso habilita registrar fecha y hora de cada inicio de sesión (columna `ultimo_acceso`, o una tabla de accesos si el CDP quiere la serie completa), algo que la versión anterior del texto no cubría.
2. **Política de tratamiento** enlazada desde el formulario de registro, alineada con la política vigente de la Universidad.
3. **Retención definida.** Propuesta: 24 meses desde la última actividad, luego borrado automático con aviso previo por correo.
4. **Derechos de acceso, actualización y supresión.** Ya implementados en el cliente: *Descargar historial* (JSON completo) y *Borrar todo*. Falta el endpoint de **eliminación de cuenta** si el CDP lo quiere autoservicio.
5. **Registro Nacional de Bases de Datos** ante la SIC, si aplica según el tamaño de la base y la política institucional.

> Al no almacenar audio, la herramienta se mantiene fuera de la discusión sobre datos biométricos, que es donde el análisis jurídico se vuelve considerablemente más exigente. Vale la pena conservar esa decisión.

### 7.1 Transferencia internacional por el uso de IA

Activar `POST /observaciones` con la API de Anthropic implica **enviar transcripciones de estudiantes identificables a un proveedor ubicado fuera de Colombia**. Eso agrega tres requisitos que no existían:

1. **Autorización específica** para esa finalidad, distinta de la autorización general de tratamiento. No basta con la casilla del registro.
2. **Revisión de transferencia internacional** conforme al régimen de la Ley 1581 y sus decretos reglamentarios: verificar si el país destino ofrece nivel adecuado de protección o si se requieren cláusulas contractuales.
3. **Contrato de encargo de tratamiento** con el proveedor, con compromiso de no usar los datos para entrenar modelos.

El diseño ya mitiga parte del riesgo: el envío **nunca es automático** —ocurre solo si la persona presiona el botón—, el audio no viaja nunca, y sin el endpoint la herramienta genera observaciones localmente con la misma interfaz.

**Recomendación:** publiquen primero con las observaciones locales, que no tienen ninguna de estas implicaciones, y activen el proxy cuando el trámite esté cerrado. No hace falta cambiar el HTML: es la misma línea de `API_BASE`.

> Esto es orientación técnica, no asesoría legal. La revisión final corresponde al oficial de protección de datos de la Universidad.

---

## 8. Puesta en marcha

Cuando la API esté publicada, **una sola línea** conecta la herramienta. En el archivo `estudio-de-pitch.html`, buscar:

```js
const API_BASE = "";
```

y reemplazar por:

```js
const API_BASE = "https://api.unisabana.edu.co/estudio-pitch";
```

Con la cadena vacía, la herramienta funciona en modo local y el botón de cuenta ni siquiera aparece. Eso permite publicarla ya y activar las cuentas después, sin tocar nada más.

El HTML puede servirse desde cualquier hosting estático: servidor web de la Universidad, SharePoint con página publicada, o similar. No requiere Node, PHP ni base de datos del lado del sitio.

---

## 9. Lista de verificación de aceptación

- [ ] Registro con correo nuevo devuelve `202` y **no** devuelve token
- [ ] Registro con correo fuera de `@unisabana.edu.co` devuelve `422`
- [ ] Registro sin facultad o sin programa devuelve `422`
- [ ] Registro sin `acuerdo.aceptado === true` devuelve `422` y **no** crea la cuenta
- [ ] `acuerdo_version` y `acuerdo_fecha` quedan persistidos, con marca de tiempo del servidor
- [ ] El código llega al correo en menos de un minuto y no cae en spam
- [ ] Código correcto devuelve token; código incorrecto devuelve `401`
- [ ] Código vencido (> 10 min) devuelve `410`
- [ ] Al sexto intento fallido el código se invalida (`429`)
- [ ] El código se guarda hasheado, nunca en claro
- [ ] Iniciar sesión sin haber verificado devuelve `403`
- [ ] Reenviar más de 3 veces en 15 minutos devuelve `429`
- [ ] `facultad`, `programa` y `rol` vuelven en el objeto `usuario` de verificación **y** de sesión
- [ ] Registro con correo ya verificado devuelve `409`
- [ ] Sesión con clave incorrecta devuelve `401` con mensaje genérico
- [ ] `GET /admin/rondas` con token de usuario normal devuelve `403`
- [ ] `GET /admin/rondas` con token de administrador incluye correo, facultad y programa de cada ronda
- [ ] No existe forma de auto-asignarse `rol = 'admin'` desde el registro
- [ ] Queda registro de auditoría de cada consulta administrativa
- [ ] `GET /rondas` sin token devuelve `401`
- [ ] `GET /rondas` con token de A no devuelve rondas de B
- [ ] `DELETE /rondas/{id}` de una ronda ajena devuelve `404`
- [ ] `POST /rondas` ignora un `id` enviado por el cliente
- [ ] `POST /rondas` rechaza transcripción de más de 20.000 caracteres
- [ ] `DELETE /rondas` deja el historial vacío y devuelve `204`
- [ ] Eliminar el usuario elimina sus rondas en cascada
- [ ] CORS restringido al dominio de publicación
- [ ] Las contraseñas en base de datos no son legibles ni reversibles
- [ ] `POST /observaciones` devuelve texto plano con `\n\n` y `**negrita**`, sin HTML
- [ ] La clave del proveedor de IA no aparece en ninguna respuesta ni en el bundle del cliente
- [ ] Con `/observaciones` apagado, el cliente sigue mostrando observaciones locales sin error visible
- [ ] **Ningún endpoint acepta ni almacena audio**

---

## 10. Modo demostración — leer antes de publicar

Mientras `API_BASE` esté vacío, el HTML **no se queda inerte**: activa un backend simulado en `localStorage` que reproduce todos los endpoints de este documento. Sirve para mostrar el flujo completo —registro con facultad y programa, acuerdo, código de verificación, historial, rol de administrador, exportación a Excel— sin haber construido nada.

Es una herramienta de demostración y de aceptación, no un producto:

| | Modo demostración | Con `API_BASE` configurado |
|---|---|---|
| Dónde viven los datos | navegador de cada persona | servidor de la Universidad |
| Código de verificación | **se muestra en pantalla** | llega por correo |
| Contraseña | hash SHA-256 en `localStorage` | hash del servidor, `argon2id`/`bcrypt` |
| Rol de administrador | lista `ADMINS_DEMO` en el HTML | columna `rol` en base de datos |
| Consolidado del CDP | solo lo registrado en ese navegador | todas las personas |
| Observaciones con IA | siempre locales | proxy hacia el modelo |

**Riesgos que deben conocerse:** cualquiera que abra la consola del navegador puede leer y modificar los datos, incluida la asignación del rol de administrador. Por eso el panel muestra la etiqueta «Demostración» y el formulario advierte que no se use con datos reales.

**Apagarlo es automático:** en cuanto `API_BASE` tenga una URL, la capa de demostración deja de ejecutarse por completo. No hay que borrar código ni cambiar ninguna otra línea. Conviene, eso sí, verificar en la lista de §9 que el servidor real rechaza lo que la demostración permite —en particular, que nadie pueda auto-asignarse el rol de administrador.

---

*Documento preparado para acompañar el archivo `estudio-de-pitch.html`. Cualquier ajuste al contrato de la API implica cambios en el cliente; conviene acordarlo antes de implementar.*
