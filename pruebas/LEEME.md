# Pruebas

Suites de Playwright que abren las herramientas en un Chromium sin ventana y
comprueban el comportamiento de verdad: anchos medidos en píxeles, botones que
existen o no, archivos que se descargan y se abren, llamadas de red que se
hacen o no se hacen.

**No tocan Supabase.** Cada suite intercepta las peticiones al proyecto real y
devuelve respuestas simuladas, así que se pueden correr las veces que haga
falta sin crear cuentas, sin gastar cupo de inteligencia artificial y sin
ensuciar el historial de nadie.

## Correrlas

```sh
pip install playwright openpyxl
playwright install chromium

python3 -m http.server 8000          # desde la raíz del repositorio
```

En otra terminal, ajusta el puerto que espera cada archivo (variable `BASE`
en la cabecera) y ejecuta:

```sh
python3 pruebas/pitch.py
python3 pruebas/portafolio.py
python3 pruebas/revision-con-ia.py
python3 pruebas/segunda-opinion-guardada.py
python3 pruebas/recuperacion-de-contrasena.py
```

Cada una termina con `TODO CORRECTO` o con la lista de lo que falló.

## Qué cubre cada una

| Archivo | Qué comprueba |
|---|---|
| `pitch.py` | Que el contenido ocupa el ancho de la página, que las notas de apoyo aparecen en Practica sin tener que grabar, y que el historial se descarga en un `.xlsx` que abre de verdad |
| `portafolio.py` | Programa y facultad tomados de la cuenta y bloqueados, párrafos a ancho completo, ausencia de guiones largos, traducción con IA de respaldo |
| `revision-con-ia.py` | La revisión en «Antes de publicar»: sin sesión, con portafolio vacío, respuesta completa, error del servicio y respuesta sin formato |
| `segunda-opinion-guardada.py` | Que se avisa de que la revisión la escribe una IA, que ningún estado descalifica, que la revisión se guarda en la cuenta de quien la pidió y solo ahí, y que «Evidencia» explica que va un enlace y no un archivo |
| `recuperacion-de-contrasena.py` | El flujo entero: enlace, correo inválido, enlace vencido, contraseña nueva, y que el inicio de sesión de siempre sigue funcionando |

## Al añadir una prueba

Los correos y nombres de las simulaciones **tienen que ser inventados**. Este
repositorio es público: un correo institucional real dentro de un archivo de
pruebas es un dato personal publicado.
