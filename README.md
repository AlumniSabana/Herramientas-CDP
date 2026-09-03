# Herramientas del Centro de Desarrollo Profesional

Dos herramientas de trabajo autónomo para la comunidad de la Universidad de
La Sabana, más la portada que las reúne.

**En producción:** https://herramientas-cdp.vercel.app

| Herramienta | Qué hace |
|---|---|
| **Estudio de Pitch** | Ensayas tu pitch en voz alta contra el reloj y recibes un reporte de ritmo, muletillas, estructura y presencia visual. |
| **Construye tu portafolio** | Te lleva por las cinco secciones de un portafolio profesional, adaptadas a tu programa académico, y te lo entrega en PDF. |
| **Portada** | Punto de entrada y único sitio donde se crea la cuenta. |

---

## Cómo está montado

Cada herramienta es **un solo archivo HTML autónomo**. No pide nada a ninguna
red para funcionar: ni tipografías, ni bibliotecas de un CDN, ni imágenes
externas. Todo, incluidos los logos y el generador de PDF, va dentro.

Esa decisión tiene una razón: la herramienta tiene que seguir funcionando
descargada, en una sala de cómputo sin buena conexión, o si mañana el CDP
decide alojarla en otro sitio. Lo único que sí sale a la red es lo opcional,
y siempre con aviso: la cuenta, el historial y la inteligencia artificial.

Como un archivo de 650 KB no se puede editar a mano, cada herramienta se
escribe repartida en `src/` y se cose con un guion.

```
├── index.html                      ← lo que Vercel publica
├── estudio-de-pitch.html
├── portafolio-alumni-sabana.html
├── auth.js                         ← cuenta y sesión, compartido por las tres
├── construir.sh                    ← arma los tres HTML desde src/
│
├── src/
│   ├── portada/                    fuente.html + logos en base64
│   ├── pitch/                      cabeza.html · prefijo · cámara · aplicación
│   └── portafolio/                 head · body · app · pdf · traductor
│
├── supabase/
│   ├── functions/                  las tres Edge Functions
│   │   ├── observaciones/          retroalimentación del pitch (Anthropic)
│   │   ├── traducir/               portafolio al inglés (Gemini)
│   │   └── revisar-portafolio/     revisión antes de publicar (Gemini)
│   └── sql/                        migraciones y permisos
│       ├── portafolios.sql        histórico: la tabla de métricas anterior
│       ├── revisiones.sql         histórico: las segundas opiniones antes de revisiones_ia
│       └── portafolio-contenido.sql   columnas, políticas y vista que faltaban
│                                      al esquema nuevo del portafolio
│
├── docs/                           instalación y despliegue
└── pruebas/                        suites de Playwright
```

### Construir

```sh
sh construir.sh
```

Necesita `python3` y `node`. Deja los tres HTML en la raíz, listos para
publicar. **Los archivos de la raíz están generados: no los edites a mano**,
porque el siguiente `construir.sh` se lleva por delante el cambio. La
excepción es `auth.js`, que no se compila.

### Probar

```sh
python3 -m http.server 8000        # desde la raíz
python3 pruebas/pitch.py           # en otra terminal
```

Las suites usan Playwright con Chromium y simulan las respuestas de Supabase,
así que no tocan la base de datos real. Ver `pruebas/LEEME.md`.

---

## La cuenta

`auth.js` es el único sitio donde vive la autenticación. Lo cargan las tres
páginas y trae dentro el modal completo: registro, inicio de sesión,
verificación por correo, recuperación de contraseña y la sesión compartida.

La sesión se guarda en `sessionStorage`, de modo que vale para las tres
herramientas mientras la pestaña esté abierta y **se cierra sola al cerrarla**.
Es a propósito: en un equipo compartido del campus no queda la cuenta abierta
para el siguiente.

**La cuenta se abre solo desde la portada.** Las herramientas muestran quién
entró, pero no ofrecen crear cuenta, para que haya un único sitio donde se
hace.

Detrás hay Supabase: Auth para las cuentas, PostgREST para el historial y
Edge Functions para lo que necesita una clave. Se llama con `fetch` a secas,
sin `supabase-js`, para que el HTML siga siendo autónomo.

---

## Sobre las claves

**En este repositorio no hay ninguna clave secreta, y no debe haberla nunca.**

Lo que sí aparece en `auth.js` es la clave *publicable* de Supabase
(`sb_publishable_…`). Está diseñada para ir en el navegador y ya es visible en
el HTML publicado. No da acceso a nada por sí sola.

Lo que de verdad protege los datos son las **políticas RLS** de la base: cada
quien ve solo sus propias rondas. Si alguna vez se desactiva RLS en una tabla,
esa clave pasa a abrir la puerta de par en par. Antes de tocar los permisos,
lee `docs/supabase-instalacion.md`.

Las claves de Anthropic y de Gemini viven en los secretos de Supabase y solo
las ven las Edge Functions. El navegador nunca las toca.

---

## La regla que conviene no revertir

La revisión con inteligencia artificial del portafolio **devuelve
observaciones y preguntas, nunca texto redactado**.

No es una limitación técnica: está escrito en la instrucción que recibe el
modelo y repetido en la interfaz. Si el modelo escribe las fichas, el
estudiante llega a la entrevista con un portafolio que no sabe defender, y eso
es peor que un portafolio flojo.

Toda la herramienta está construida sobre esa idea: los mínimos de palabras
por campo, el aviso de «si no tienes cifras, no las inventes», la nota sobre
uso de inteligencia artificial en la hoja de asesoría. Si alguien pide más
adelante que la revisión «también escriba el perfil», conviene recordar por
qué no lo hace.

---

## Privacidad

- **El audio no se graba, no se almacena y no sale del dispositivo.** Se
  transcribe en el navegador y se descarta.
- **El video de la cámara tampoco.** El análisis visual ocurre en el equipo;
  solo se conservan métricas agregadas, y solo si hay cuenta.
- Sin cuenta no se guarda nada, ni siquiera en el propio navegador.
- A los servicios de inteligencia artificial se les manda el texto que la
  persona escribió, nunca su nombre ni su correo.

---

## Créditos y licencia

Centro de Desarrollo Profesional · Alumni Sabana · Universidad de La Sabana.

El **código** está bajo licencia MIT (ver `LICENSE`).

Los **logos, el nombre y la identidad visual de la Universidad de La Sabana y
de Alumni Sabana no están cubiertos por esa licencia**: son marcas de la
Universidad y no se pueden reutilizar sin su autorización. Si reutilizas este
código, sustituye los archivos de `src/*/_logo_*.txt` por los tuyos.

Incluye [jsPDF](https://github.com/parallax/jsPDF) (MIT), incrustado en
`src/portafolio/_jspdf.js`.
