# Las dos funciones de inteligencia artificial del portafolio

Aquí van dos Edge Functions de Supabase. Las dos usan Gemini y las dos comparten
la misma clave, así que se configuran una sola vez.

| Función | Qué hace | Dónde aparece |
|---|---|---|
| `traducir` | Traduce el portafolio al inglés cuando el navegador no trae traductor propio | Fichas de proyecto y «Tu portafolio» |
| `revisar-portafolio` | Lee lo escrito y devuelve observaciones, empezando por las fichas | «Antes de publicar» |

Las dos exigen sesión iniciada, porque consumen cupo de la Universidad y conviene
poder atribuir ese consumo.

**Mientras no las despliegues, el portafolio sigue funcionando.** La traducción
la hace igual quien use Chrome o Edge; la revisión aparece con el botón apagado y
una explicación. Nada se rompe, solo falta.

---

## Los tres pasos

### 1 · Consigue la clave de Gemini

Entra a **https://aistudio.google.com/apikey** con la cuenta de Google de la
Universidad y crea una clave. Google ofrece capa gratuita; revisa los límites
vigentes antes de abrirlo a toda la comunidad.

No guardes la clave en ningún archivo del proyecto ni la pegues en un chat: solo
va al comando del paso siguiente.

### 2 · Guárdala en Supabase

```sh
supabase login
supabase link --project-ref vfuexivozypglggxpqsy
supabase secrets set GEMINI_API_KEY=la-clave-que-copiaste
```

Con la interfaz web: **Project Settings → Edge Functions → Secrets**.

### 3 · Despliega las dos

Copia las dos carpetas dentro de `supabase/functions/` de tu proyecto y ejecuta:

```sh
supabase functions deploy traducir
supabase functions deploy revisar-portafolio
```

El portafolio las encuentra solo. No hay que tocar el HTML.

---

## Comprobar que quedaron bien

**La revisión.** Inicia sesión desde la portada, escribe una ficha de proyecto
completa, ve a «Antes de publicar» y pulsa «Revisar mi portafolio». Debe
devolver observaciones sobre tus fichas en menos de medio minuto.

**La traducción.** Ábrelo en **Safari o Firefox**, que es donde de verdad se usa
el respaldo, y pulsa «Traducir al inglés» en una ficha.

Si algo falla, el mensaje en pantalla dice qué falta:

| Lo que ves | Lo que significa |
|---|---|
| «todavía no está desplegado» | Falta el paso 3 para esa función |
| «le falta la clave del proveedor» | Falta el paso 2 |
| «La clave no es válida» | Está mal copiada o fue revocada |
| «Necesitas iniciar sesión» | La persona no ha entrado a su cuenta |

Los registros están en **Edge Functions → (la función) → Logs**.

---

## Si Google cambia el nombre del modelo

Las dos usan `gemini-3.7-flash`. Google renombra sus modelos con cierta
frecuencia, así que el nombre es configurable sin volver a desplegar:

```sh
supabase secrets set GEMINI_MODELO=el-nombre-nuevo
```

---

## Qué se envía y qué no

Se envía el texto que la persona escribió, y solo cuando pulsa el botón. **No se
envía su nombre, su correo ni su identificador de cuenta.** La revisión sí manda
el programa, la etapa y el objetivo del portafolio, porque sin eso las
observaciones serían genéricas: lo que se le exige a una ficha de Ingeniería no
es lo que se le exige a una de Derecho.

Las dos funciones piden `store: false`, de modo que Google no conserva la
conversación.

---

## La decisión de diseño que conviene no revertir

`revisar-portafolio` **devuelve observaciones y preguntas, nunca texto
redactado**. Está escrito en la instrucción que recibe el modelo y repetido en
la interfaz.

No es una limitación técnica. Si el modelo escribe las fichas, el estudiante
llega a la entrevista con un portafolio que no sabe defender, y eso es peor que
un portafolio flojo. Toda la herramienta está construida sobre esa idea: los
mínimos de palabras, el aviso de «si no tienes cifras, no las inventes», la nota
sobre uso de inteligencia artificial en la hoja de asesoría. Si alguien pide más
adelante que la revisión «también escriba el perfil», conviene recordar por qué
no lo hace.
