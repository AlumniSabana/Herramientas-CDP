# Edge Functions (IA): una sola clave de Gemini

Las tres funciones de `supabase/functions/` usan **la misma clave**, `GEMINI_API_KEY`.

| Función | Para qué | Quién la llama |
|---|---|---|
| `observaciones` | Observaciones escritas sobre una ronda de Pitch | Reporte del Pitch (con sesión) |
| `revisar-portafolio` | Segunda opinión del portafolio | «Antes de publicar» |
| `traducir` | Portafolio al inglés (respaldo si el navegador no traduce) | «Resultado» |

Se despliegan **en el mismo proyecto de Supabase** que usa Vercel. La clave solo vive en los secretos de Supabase: nunca va en el front ni en el repositorio.

## 1 · Conseguir la clave
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key**. Copia el valor.

## 2 · Guardarla como secreto
Supabase → **Edge Functions → Secrets → Add new secret**

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | la clave copiada |

(Opcional) `GEMINI_MODELO` para cambiar el modelo. Por defecto es `gemini-3.7-flash`; si Google lo renombra, basta con poner aquí el nombre nuevo, sin tocar código.

## 3 · Desplegar las tres funciones

**Con el panel (sin instalar nada):** Edge Functions → **Deploy a new function → Via Editor**. Crea una por cada carpeta, con el nombre exacto, pega su `index.ts` y pulsa **Deploy**. Deja **Verify JWT** activado: es lo que impide que alguien sin sesión gaste tu cuota.

**Con la CLI:**
```bash
npx supabase login
npx supabase link --project-ref axeajsicxnppxwftpwml
npx supabase secrets set GEMINI_API_KEY=la-clave
npx supabase functions deploy observaciones
npx supabase functions deploy revisar-portafolio
npx supabase functions deploy traducir
```

## 4 · Comprobar
Con sesión iniciada:
- **Portafolio → Antes de publicar → «Revisar mi portafolio»** devuelve un veredicto en segundos.
- **Pitch → Reporte → «Generar observaciones»** muestra el texto.
- **Administración → Estudio de Pitch → Diagnóstico de IA** revisa paso a paso: función desplegada, clave cargada y modelo respondiendo.

## Si falla
| Síntoma | Causa habitual |
|---|---|
| «El servicio de inteligencia artificial no está disponible» / error CORS en la consola | La función no está desplegada o no se llama exactamente igual |
| «No tiene configurada la clave» (503) | Falta `GEMINI_API_KEY`; después de crearla hay que volver a desplegar |
| «La clave … no es válida» | Clave mal copiada o sin permisos |
| «Saturado» (429) | Cuota del plan gratuito de Gemini; espera o activa facturación |
| «Llegaste al tope de 20 observaciones» | Es el tope diario por persona de `observaciones` (`TOPE_DIARIO`, en el código) |

## Qué se envía y qué no
- **Observaciones:** métricas de la ronda y la transcripción (hasta 20 000 caracteres), el programa y las rondas anteriores. Nunca audio ni imágenes.
- **Revisión del portafolio:** el texto de las fichas, para que el modelo señale problemas. Solo se ejecuta cuando la persona pulsa el botón.
- **Traducción:** el texto del portafolio.

Activar la IA envía texto de estudiantes identificables a un proveedor fuera de Colombia (transferencia internacional de datos). Antes de difundirla, el oficial de protección de datos de la Universidad debe dar el visto bueno.

## La decisión que no se debe revertir
La revisión del portafolio **señala** qué falta y pregunta lo que la persona tendría que responder; **no redacta** su texto. Está escrito también en la instrucción que recibe el modelo.
