# Estudio de Pitch — Puesta en marcha con Supabase

**Centro de Desarrollo Profesional · Alumni Sabana**
Agosto de 2026

Esta guía va del proyecto vacío a la herramienta funcionando con cuentas reales. Son unos 40 minutos si nada se atraviesa. No hace falta escribir código: se pega un script, se ajusta una plantilla de correo y se copian dos claves.

**Archivos que acompañan esta guía**

| Archivo | Para qué |
|---|---|
| `estudio-de-pitch.html` | La herramienta. Es lo único que se publica. |
| `supabase-instalacion.sql` | Crea tablas, permisos y disparadores. |
| `observaciones/index.ts` | Edge Function que activa las observaciones con IA. Opcional. |
| `API-estudio-de-pitch.md` | Referencia técnica del contrato de datos. |

---

## Paso 1 · Crear el proyecto

En [supabase.com](https://supabase.com), **New project**. Región **East US** o **South America (São Paulo)** — la segunda da menos latencia desde Colombia.

Guarda la contraseña de la base de datos que te pide: no vuelve a mostrarse.

> **Sobre el plan gratuito.** Alcanza de sobra para los datos (unos 40 MB al año con 500 personas), pero tiene un límite que sí importa: **los correos de verificación están topados a unos pocos por hora**. Sirve para probar; para abrir el servicio a estudiantes hay que conectar un proveedor de correo propio. Está en el paso 3.

---

## Paso 2 · Crear las tablas

**SQL Editor → New query.** Pega el contenido completo de `supabase-instalacion.sql` y presiona **Run**.

Debe terminar con *Success. No rows returned*. Eso crea:

- `perfiles` — correo, facultad, programa, rol y la prueba del consentimiento
- `rondas` — una fila por práctica, con transcripción y cifras
- Las políticas de seguridad por fila, que son lo que impide que una persona vea los datos de otra
- Un disparador que valida el dominio `@unisabana.edu.co` y la aceptación del acuerdo
- La vista `rondas_admin`, que solo devuelve filas a quien tenga rol de administrador
- Los permisos explícitos de cada rol: quien no ha iniciado sesión no puede leer nada

Este script está probado contra un PostgreSQL 16 real, no solo escrito. Se verificó el aislamiento entre personas, el rechazo de correos fuera del dominio, la imposibilidad de auto-asignarse el rol de administrador y el borrado en cascada.

En **Table Editor** deben aparecer `perfiles` y `rondas`, ambas con el candado de RLS activo.

---

## Paso 3 · Configurar el correo con código de seis dígitos

Este es el paso que más se falla, así que va con detalle.

### 3.1 Cambiar la plantilla

**Authentication → Emails → Confirm signup.**

Supabase envía por defecto un **enlace** de confirmación. Nosotros necesitamos un **código**, porque así está construido el formulario. Reemplaza el cuerpo de la plantilla por esto:

```html
<h2>Tu código de verificación</h2>
<p>Hola,</p>
<p>Usa este código para activar tu cuenta en <strong>Estudio de Pitch</strong>,
   el servicio de práctica del Centro de Desarrollo Profesional:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:24px 0">{{ .Token }}</p>
<p>El código vence en 10 minutos.</p>
<p style="color:#666;font-size:13px">
  El CDP nunca te pedirá este código por teléfono, chat ni correo.
  Si no intentaste registrarte, ignora este mensaje.
</p>
```

Lo esencial es **`{{ .Token }}`**: esa variable es el código de seis dígitos, confirmado en la documentación oficial de Supabase.

> **Si prefieres dejar el enlace, también funciona.** La herramienta detecta la sesión que Supabase devuelve en la URL al hacer clic, inicia sesión sola y limpia la barra de direcciones. Es decir: sirve con código, con enlace, o con los dos en el mismo correo. Solo recuerda agregar la dirección del sitio en **Authentication → URL Configuration** para que el enlace sepa a dónde volver.

Asunto sugerido: `Tu código de verificación — Estudio de Pitch`

### 3.2 Confirmar que la verificación está activa

**Authentication → Sign In / Providers → Email.** Debe estar habilitado y con **Confirm email** activado. Si lo desactivas, las cuentas se crean sin verificar y el paso del código se salta.

### 3.3 Conectar un proveedor de correo propio

**Project Settings → Authentication → SMTP Settings.**

Sin esto, el límite de correos por hora dejará a la mayoría de estudiantes sin poder registrarse. Habla con TI para que les den credenciales SMTP institucionales; el remitente ideal es algo como `no-responder@unisabana.edu.co`, con SPF, DKIM y DMARC ya configurados. Sin esos tres registros, los códigos caen en correo no deseado con mucha frecuencia.

---

## Paso 4 · Conectar la herramienta

**Project Settings → API.** Copia dos valores y pégalos en `estudio-de-pitch.html`, cerca del inicio del bloque `<script>`:

```js
const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

Búscalos con `Ctrl+F` sobre `SUPABASE_URL`. Están juntos y tienen comentarios que los explican.

> **La clave `anon` es pública por diseño** y no tiene problema en estar dentro del HTML: sin sesión iniciada no da acceso a nada, porque las políticas del paso 2 filtran todo. La que **nunca** debe salir del panel de Supabase es la `service_role`.

En cuanto pegues las dos, el modo demostración se apaga solo y las cuentas pasan a ser reales.

---

## Paso 5 · Publicar

El HTML es un archivo estático. Sirve cualquier hosting; lo importante es que sea **HTTPS**, porque el micrófono y el reconocimiento de voz no funcionan sin él.

Después de publicarlo, vuelve a **Authentication → URL Configuration** y agrega la dirección del sitio en **Site URL** y **Redirect URLs**.

---

## Paso 6 · Crear el administrador

1. Regístrate normalmente en la página con el correo que administrará el servicio.
2. Verifica con el código que llega por correo.
3. En **SQL Editor**, ejecuta:

```sql
update public.perfiles set rol = 'admin'
where correo = 'cdp.admin@unisabana.edu.co';
```

4. Cierra sesión y vuelve a entrar. Ahora aparece el panel **Consolidado del servicio** y el botón **Exportar todo a Excel**.

Recomendación: que las cuentas de administrador sean pocas y nominales. Nunca una cuenta compartida entre varias personas — si algo se filtra, no habría forma de saber por dónde.

---

## Paso 7 · Observaciones con IA

**Este paso ya no es opcional si quieres que el bloque de observaciones funcione.** Las observaciones las redacta siempre el modelo: no hay versión de respaldo generada en el navegador. Sin la Edge Function desplegada, el bloque muestra un aviso explicando que el servicio no está disponible, y el resto del reporte —las siete dimensiones, el gráfico y el ejercicio— sigue funcionando igual.

El análisis es distinto para cada persona porque además de las cifras se envía su programa académico, un fragmento de su transcripción y el resumen de sus rondas anteriores, de modo que el modelo pueda comparar la evolución. El texto generado se guarda junto a la ronda: no vuelve a redactarse cada vez que se abre el reporte, y el CDP puede leerlo desde el panel de administración.

Requiere la CLI de Supabase:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <ref-del-proyecto>

supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy observaciones
```

La carpeta `observaciones/` debe quedar dentro de `supabase/functions/` del proyecto local.

Si la función falla o tarda más de 25 segundos, el bloque muestra el motivo y deja volver a intentar. El resto del reporte no se ve afectado.

> **Antes de activarlo, lee la sección 7.1 de `API-estudio-de-pitch.md`.** Enviar transcripciones a un proveedor fuera de Colombia es transferencia internacional de datos y exige autorización específica, revisión jurídica y contrato de encargo. Es un trámite, no un obstáculo, pero hay que hacerlo antes y no después.

---

## Paso 8 · Presencia visual (cámara)

No requiere configuración: el análisis de cámara ocurre entero en el navegador de cada persona y **no envía video ni imágenes a Supabase**. Solo hay dos cosas que tener en cuenta.

**1. Correr de nuevo `supabase-instalacion.sql`.** La versión con cámara agrega la columna `visual` a `rondas`, corrige el `check` de `tipo` —que todavía no admitía los escenarios `elevator` ni `comercial`, así que esas rondas fallaban al guardarse— y reconstruye la vista `rondas_admin`. El script es idempotente: se puede correr sobre una instalación existente sin perder datos. Si no se corre, la herramienta sigue funcionando y guarda la ronda sin las métricas visuales, avisando en pantalla.

**2. El sitio debe servirse por HTTPS.** Los navegadores solo dan acceso a la cámara en páginas con certificado (o en `localhost`). Si la página se abre desde un archivo local o por `http://`, el botón «Practicar con cámara» pedirá permiso y el navegador lo negará.

Una restricción adicional que conviene conocer: la primera vez que alguien usa la cámara, el navegador descarga el analizador (unos 19 MB entre el motor y los dos modelos) desde `cdn.jsdelivr.net` y `storage.googleapis.com`. Queda en la caché del navegador, así que solo pasa una vez por equipo. Si la red de la Universidad bloquea esos dominios, la vista previa se verá pero la dimensión quedará como «No medida» — sin romper nada más. Si TI prefiere no depender de un CDN externo, esos archivos pueden alojarse en el propio servidor y cambiarse las tres constantes `VIS_CDN`, `VIS_MODELO_ROSTRO` y `VIS_MODELO_POSE` al principio del módulo de cámara.

---

## Verificación final

Con dos cuentas de prueba, comprueba:

- [ ] Un correo que no sea `@unisabana.edu.co` es rechazado al registrarse
- [ ] Sin marcar la casilla del acuerdo, el registro no avanza
- [ ] El código llega por correo en menos de un minuto y no cae en spam
- [ ] Un código equivocado muestra mensaje claro y permite reintentar
- [ ] Al terminar una práctica, aparece una fila nueva en `rondas` (Table Editor)
- [ ] En `perfiles` quedaron `facultad`, `programa`, `acuerdo_version` y `acuerdo_fecha`
- [ ] La persona A no ve las rondas de la persona B
- [ ] Un usuario normal no ve el botón de Excel ni el panel de administración
- [ ] El administrador sí los ve, y el Excel trae ambas personas
- [ ] «Borrar todo» deja el historial vacío en la base, no solo en pantalla
- [ ] Ninguna columna de `rondas` contiene audio
- [ ] **Sin cuenta no se guarda nada:** practica sin iniciar sesión, recarga, y el reporte debe estar vacío
- [ ] Sin cuenta, `localStorage` no contiene ninguna clave que empiece por `estudio-pitch`
- [ ] El administrador puede abrir una persona y leer su transcripción y sus observaciones
- [ ] Las observaciones quedan guardadas en la columna `observaciones` de `rondas`

La última se comprueba con la consulta que está comentada al final del SQL. Debe devolver cero filas.

---

## Si algo falla

| Síntoma | Causa habitual |
|---|---|
| Llega un enlace en vez de un código | La plantilla sigue con `{{ .ConfirmationURL }}` (paso 3.1) |
| «Email rate limit exceeded» | Falta el SMTP propio (paso 3.3) |
| El registro pasa sin pedir código | **Confirm email** está desactivado (paso 3.2) |
| «El correo debe terminar en @unisabana.edu.co» con un correo correcto | El SQL del paso 2 no se ejecutó completo |
| El historial sale vacío pese a haber practicado | Faltan las políticas de RLS, o `SUPABASE_ANON_KEY` está mal pegada |
| El panel de administración no aparece | Falta ejecutar el `update` del paso 6, o no se cerró y reabrió sesión |
| Sigue apareciendo «Modo demostración» | Alguna de las dos constantes quedó vacía (paso 4) |
| Las observaciones dicen «Análisis local» | La Edge Function no está desplegada, o falta el secreto |

---

## Qué queda pendiente

**Trámite de protección de datos.** El acuerdo está implementado y se guarda la prueba del consentimiento, pero la revisión final es del oficial de protección de datos de la Universidad. Si además se activa la IA, hace falta la revisión de transferencia internacional.

**Egresados sin correo institucional.** Al exigir `@unisabana.edu.co`, quien ya perdió su cuenta no puede registrarse. Siendo un servicio de Alumni, conviene decidir esto antes de difundirlo.

**Retención.** No hay borrado automático configurado. La propuesta es 24 meses desde la última actividad; se implementa con un `cron` de Supabase cuando el CDP defina el plazo.
