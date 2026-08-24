# Activar las observaciones con IA

**Estudio de Pitch · Alumni Sabana**

Todo lo demás ya funciona: cuentas, historial, reporte, presencia visual, panel de administración. Falta una sola pieza — la **Edge Function** que habla con el modelo.

Sin ella, el botón «Generar observaciones» muestra un aviso y el resto del reporte sigue funcionando igual.

---

## Qué camino conviene: el panel web

Hay dos formas de desplegar y **te recomiendo el panel web de Supabase**, no la terminal. Las razones son concretas para el caso del CDP:

- Es **un solo archivo sin dependencias**. La CLI existe para proyectos con varias funciones, librerías compartidas y despliegues frecuentes. Aquí no hay nada de eso: es copiar, pegar y darle a un botón.
- **No hay que instalar nada** ni pedirle permisos de administrador a TI en tu equipo. La CLI necesita Node, un token de acceso personal y vincular el proyecto local.
- Vas a desplegar esto **una vez, quizá dos**. El costo de aprender la CLI no se amortiza.

La CLI solo tiene sentido si más adelante TI se hace cargo del mantenimiento y quiere el código versionado en un repositorio. Si llega ese día, los comandos están al final de este documento.

---

## Antes de empezar: dos cosas que no son técnicas

**1. Hace falta una clave de la API de Anthropic.** No es la misma cuenta con la que usas Claude en el navegador: se crea en [console.anthropic.com](https://console.anthropic.com), se carga saldo y se genera una clave que empieza por `sk-ant-`. Es un gasto por consumo — cada observación cuesta fracciones de centavo de dólar, pero alguien del CDP tiene que poner el medio de pago.

**2. Falta el visto bueno de protección de datos.** Activar esto significa enviar transcripciones de estudiantes identificables a un proveedor fuera de Colombia. Eso es transferencia internacional de datos y exige autorización específica, revisión jurídica y contrato de encargo. Está explicado en la sección 7.1 de `API-estudio-de-pitch.md`.

> Mi recomendación: haz el despliegue técnico y pruébalo con tu propia cuenta para ver cómo queda, pero no lo anuncies a estudiantes hasta cerrar el trámite.

---

## Paso 1 · Guardar la clave como secreto

En el panel de Supabase, con el proyecto abierto:

**Edge Functions → Secrets → Add new secret**

| Campo | Valor |
|---|---|
| Name | `ANTHROPIC_API_KEY` |
| Value | tu clave `sk-ant-…` |

El nombre tiene que estar **exactamente así**: mayúsculas y guiones bajos incluidos.

Guárdala aquí y **nunca** en el HTML. Este es el motivo por el que existe la Edge Function: la clave vive en el servidor de Supabase y jamás llega al navegador de nadie. Si la pusieras en el HTML, cualquier estudiante podría verla con clic derecho → ver código fuente, y gastarla.

---

## Paso 2 · Crear la función

**Edge Functions → Deploy a new function → Via editor**

- Nombre: **`observaciones`** — exactamente así, en minúsculas y sin tildes. El HTML llama a esa ruta.
- Borra el código de ejemplo que trae el editor.
- Pega el contenido **completo** de `observaciones/index.ts`.
- **Deploy function**.

Tarda menos de un minuto. En la lista de funciones debe aparecer `observaciones` como *Active*.

Deja activada la opción **Verify JWT** si aparece. Eso es lo que impide que alguien de fuera llame a la función —y gaste tu saldo— sin tener cuenta en la herramienta.

---

## Paso 3 · Comprobar desde la propia página

No hace falta terminal ni `curl`. Entra a la herramienta **con la cuenta de administrador**, ve a la etapa **04 Reporte** y baja hasta el panel de administración. Al final hay un bloque nuevo:

> **Estado del servicio de inteligencia artificial** → botón **Comprobar ahora**

Recorre la cadena eslabón por eslabón y te dice cuál está roto y qué hacer:

| Eslabón | Qué comprueba |
|---|---|
| Sesión iniciada | Que estás dentro y con qué rol |
| Base de datos | Que las tablas responden y las políticas por fila funcionan |
| Columna «visual» | Si corriste la migración de la cámara |
| Edge Function desplegada | Distingue «no existe» (404) de «rechazó la sesión» (401) |
| Clave del proveedor cargada | Si el secreto del paso 1 llegó bien, y qué modelo y tope hay configurados |
| El modelo responde | Prueba real de extremo a extremo |

**La comprobación no consume saldo.** La función tiene una sonda de diagnóstico que contesta sin llamar al modelo. Solo el último paso —botón aparte, **«Probar una observación real»**— hace una llamada de verdad, y aparece únicamente cuando todo lo anterior está en verde.

---

## Tope de gasto

La función trae un tope de **20 observaciones por persona y por día**. Es una red de seguridad: evita que un clic repetido, o alguien probando, dispare la factura.

Para cambiarlo, edita esta línea al principio de `observaciones/index.ts` y vuelve a desplegar:

```ts
const TOPE_DIARIO = 20;   // 0 = sin tope
```

Quien llega al tope ve un mensaje claro en el reporte y **conserva todo lo demás**: su análisis de cifras, su reporte y su historial siguen funcionando.

Si la consulta que cuenta los usos falla por cualquier motivo, la petición **se deja pasar**. El tope protege el presupuesto; no es un control de acceso, y no debe dejar a nadie sin servicio por un fallo de red.

---

## Qué hacer si algo falla

| Síntoma en la página | Causa |
|---|---|
| «todavía no está desplegado» | Falta el paso 2, o el nombre de la función está mal escrito |
| «le falta la clave del proveedor» | Falta el paso 1, o el nombre del secreto tiene una errata |
| «tardó demasiado en responder» | El modelo se demoró más de 25 s. Reintentar suele bastar |
| «Llegaste al tope de 20…» | Funciona bien: es el tope diario |
| «no devolvió texto» | Revisa los *Logs* |

Los registros están en **Edge Functions → observaciones → Logs**. Ahí aparece el consumo de tokens de cada llamada, útil para presupuestar. **La transcripción no se registra.**

Un detalle que confunde: si en los logs ves algo sobre *credit balance* o *authentication*, el problema está en la cuenta de Anthropic —saldo agotado o clave revocada—, no en Supabase.

---

## Camino B · Desde la terminal

Solo si vas a versionar el código:

```bash
npm install -g supabase
supabase login
supabase link --project-ref vfuexivozypglggxpqsy

supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy observaciones
```

La carpeta `observaciones/` debe estar dentro de `supabase/functions/` de tu proyecto local.

---

## Comprobación manual con curl

Por si alguna vez la necesitas, reemplazando `<TU_CLAVE_PUBLICABLE>`:

```bash
curl -i -X POST \
  "https://vfuexivozypglggxpqsy.supabase.co/functions/v1/observaciones" \
  -H "apikey: <TU_CLAVE_PUBLICABLE>" \
  -H "Authorization: Bearer <TU_CLAVE_PUBLICABLE>" \
  -H "Content-Type: application/json" \
  -d '{"diagnostico":true}'
```

| Respuesta | Qué significa |
|---|---|
| `404 NOT_FOUND` | La función no está desplegada |
| `401` | Desplegada y protegida. Normal con clave publicable: necesita sesión de usuario |
| `200` con `"clave_cargada": false` | Desplegada, pero falta el secreto |
| `200` con `"clave_cargada": true` | Todo listo |
