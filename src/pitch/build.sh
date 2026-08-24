#!/bin/sh
# Ensamblado de estudio-de-pitch.html
# El IIFE se abre en cabeza.html y se cierra al final de parte-js.js,
# así que camara-js.js va ANTES de parte-js.js para quedar dentro
# del mismo ámbito (y no colgar nada de window).
cd "$(dirname "$0")"
{ cat cabeza.html; cat prefijo-js.js; cat camara-js.js; cat parte-js.js; \
  printf '</script>\n</body>\n</html>\n'; } > estudio-de-pitch.html
python3 -c "
import re
h=open('estudio-de-pitch.html',encoding='utf8').read()
open('_check.js','w',encoding='utf8').write(re.findall(r'<script>(.*?)</script>',h,re.S)[-1])
"
node --check _check.js && echo "SINTAXIS OK"
