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

### 4 · Crea la tabla donde se guardan las segundas opiniones

**SQL Editor → New query.** Pega el contenido completo de
`supabase/sql/revisiones.sql` y presiona **Run**. Necesita que antes hayas
corrido `portafolios.sql`, de donde sale la función `es_admin()`.

Eso crea la tabla `revisiones`, sus tres políticas y un disparador que deja solo
las diez últimas de cada persona.

**Qué guarda y qué no.** Guarda la respuesta del modelo: el veredicto, la
prioridad y las observaciones por ficha y por sección. No guarda el borrador del
portafolio, que sigue viviendo solo en el navegador de cada quien. La tabla es
estrictamente privada: cada persona lee únicamente las suyas y **el
administrador no tiene acceso**, a diferencia de lo que pasa con el avance y con
las rondas del Pitch. Si algún día el Centro necesita leerlas, no basta con
añadir una política: hay que decírselo antes en pantalla a quien las escribe.

**Si no corres este script**, la revisión sigue funcionando igual. Simplemente no
se guarda: aparece en pantalla y desaparece al recargar, con un aviso discreto
que lo dice.

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

Lo que sí se conserva, si corriste el paso 4, es **la respuesta**: queda en la
tabla `revisiones`, en la cuenta de quien la pidió y a la vista de nadie más.
Conviene tener presente un matiz al leer esa tabla: la instrucción le pide al
modelo citar entre comillas las palabras del estudiante cuando señala un
problema, así que una observación puede contener frases sueltas de su
portafolio. No es el borrador, pero tampoco es texto anónimo.

---

## Los tres estados, y por qué ninguno descalifica

Cada ficha y cada sección vuelve con un estado: `solido`, `afinar` o
`desarrollar`. El tercero fue `insuficiente` hasta agosto de 2026 y se cambió a
propósito.

«Insuficiente» es un juicio sobre la persona, y dicho por una máquina que no
conoce su trabajo no es ni justo ni útil: quien lo lee cierra la herramienta en
vez de arreglar la ficha, que es el único desenlace que no le sirve a nadie.
«Por desarrollar» dice exactamente lo mismo del texto y además dice qué sigue.
La regla 8 de la instrucción lo extiende a las observaciones: se describe lo que
falta, no se reparten notas.

La interfaz traduce los nombres antiguos por si la Edge Function tarda en
actualizarse, así que **se puede desplegar en cualquier orden**. Pero mientras no
la redespliegues, el modelo seguirá recibiendo la instrucción vieja y podrá usar
la palabra «insuficiente» dentro de una observación, donde la interfaz ya no
puede traducirla.

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
