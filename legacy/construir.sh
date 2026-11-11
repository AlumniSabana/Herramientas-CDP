#!/bin/sh
# ══════════════════════════════════════════════════════════════
#  Arma las tres herramientas y deja el resultado en la raíz,
#  que es lo que Vercel publica.
#
#  Cada herramienta se escribe repartida en varios archivos para
#  poder trabajarla, y se entrega como un solo HTML autónomo, sin
#  una sola petición a la red. Este guion hace esa costura.
#
#  Uso:  sh construir.sh
#  Necesita: python3 y node (node solo para comprobar la sintaxis)
# ══════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")"

echo "── Portada ────────────────────────────────"
sh src/portada/build.sh
cp src/portada/herramientas-alumni-sabana.html index.html

echo "── Estudio de Pitch ───────────────────────"
sh src/pitch/build.sh
cp src/pitch/estudio-de-pitch.html .

echo "── Construye tu portafolio ────────────────"
sh src/portafolio/build.sh
cp src/portafolio/portafolio-alumni-sabana.html .

echo
echo "Listo. En la raíz quedaron:"
ls -la index.html estudio-de-pitch.html portafolio-alumni-sabana.html auth.js
echo
echo "auth.js no se compila: es un archivo suelto que cargan las tres"
echo "páginas. Se edita directamente en la raíz."
