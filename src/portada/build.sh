#!/bin/sh
cd "$(dirname "$0")"
python3 - <<'PY'
import io
def img(n): return "data:image/png;base64," + open(n).read().strip()
s = io.open("fuente.html", encoding="utf8").read()
s = (s.replace("LOGO_ALUMNI", img("_logo_claro.txt"))
      .replace("LOGO_USABANA_NAVY", img("_logo_usabana_navy.txt"))
      .replace("LOGO_USABANA_BLANCO", img("_logo_usabana_blanco.txt")))
io.open("herramientas-alumni-sabana.html", "w", encoding="utf8").write(s)
PY
python3 - <<'PY'
import re, io
h = io.open("herramientas-alumni-sabana.html", encoding="utf8").read()
io.open("_check.js", "w", encoding="utf8").write(re.findall(r"<script>(.*?)</script>", h, re.S)[-1])
PY
node --check _check.js && rm -f _check.js && echo "SINTAXIS JS OK"
