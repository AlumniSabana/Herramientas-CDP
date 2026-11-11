#!/bin/sh
cd "$(dirname "$0")"
python3 - <<'PY'
# Recupera los logos incrustados si los .txt no estan a mano
import io, os, re
if not os.path.exists("_logo_claro.txt") and os.path.exists("portafolio-alumni-sabana.html"):
    h = io.open("portafolio-alumni-sabana.html", encoding="utf8").read()
    m = re.search(r'class="logo-claro" src="data:image/png;base64,([^"]+)"', h)
    if m:
        open("_logo_claro.txt", "w").write(m.group(1))

def img(nombre):
    return "data:image/png;base64," + open(nombre).read().strip()

claro   = img("_logo_claro.txt")
us_navy = img("_logo_usabana_navy.txt")
us_bco  = img("_logo_usabana_blanco.txt")

head = io.open("head.html", encoding="utf8").read()
body = (io.open("body.html", encoding="utf8").read()
        .replace("LOGO_CLARO", claro)
        .replace("LOGO_USABANA_NAVY", us_navy)
        .replace("LOGO_USABANA_BLANCO", us_bco))

# jsPDF (MIT) va incrustado: el archivo debe seguir siendo autonomo,
# sin ninguna peticion a la red.
jspdf = io.open("_jspdf.js", encoding="utf8").read()
# El bundle trae un byte de control literal dentro de una cadena (la
# constante de relleno del cifrado PDF). Dentro de <script> el navegador
# lo tolera, pero deja el HTML tecnicamente invalido; escaparlo es
# equivalente para JS y deja el documento limpio.
import re as _re
jspdf = _re.sub("[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]",
                lambda m: "\\u%04x" % ord(m.group()), jspdf)
pdf   = io.open("pdf.js", encoding="utf8").read()
trad  = io.open("traductor.js", encoding="utf8").read()
js    = io.open("app.js", encoding="utf8").read()

# El logo que se estampa en el PDF, disponible para el script
puente = ('<script>/* jsPDF 4.2.1 — MIT License — https://github.com/parallax/jsPDF */\n'
          + jspdf + '\n</script>\n'
          + '<script>\nvar LOGO_PDF = "' + claro + '";\n' + pdf + '\n' + trad + '\n</script>\n')

io.open("portafolio-alumni-sabana.html", "w", encoding="utf8").write(
    head + body + "\n" + puente + js)
PY
python3 - <<'PY'
import re, io
h = io.open("portafolio-alumni-sabana.html", encoding="utf8").read()
# El ultimo bloque <script> es la aplicacion
m = re.findall(r"<script>(.*?)</script>", h, re.S)
io.open("_check.js", "w", encoding="utf8").write(m[-1])
io.open("_check_pdf.js", "w", encoding="utf8").write(m[-2])
PY
node --check _check.js && node --check _check_pdf.js && echo "SINTAXIS JS OK"
