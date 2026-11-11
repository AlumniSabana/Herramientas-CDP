import json, zipfile, io, re
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8921/estudio-de-pitch.html"
SB   = "https://vfuexivozypglggxpqsy.supabase.co"
fallos = []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

SESION = {"token":"tok","refresh":"ref","correo":"ana.perez@unisabana.edu.co","nombre":"Ana Pérez",
          "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","rol":"usuario","id":"u-1"}

RONDAS = [
  {"id":"r1","creada_en":"2026-08-06T17:01:00","tipo":"empleo","tipo_nombre":"Pitch para búsqueda de empleo",
   "modo":"voz","duracion_objetivo":180,"duracion_real":4,"puntaje":32,"palabras":5,"ppm":68,
   "muletillas_total":0,"secciones_cubiertas":1,"secciones_total":5,
   "dimensiones":[{"id":"duracion","pct":10},{"id":"ritmo","pct":60}],
   "muletillas_top":[],"transcripcion":"Hola qué tal soy Ana"},
  {"id":"r2","creada_en":"2026-08-11T14:28:00","tipo":"empleo","tipo_nombre":"Pitch para búsqueda de empleo",
   "modo":"voz","duracion_objetivo":180,"duracion_real":36,"puntaje":45,"palabras":29,"ppm":49,
   "muletillas_total":0,"secciones_cubiertas":2,"secciones_total":5,
   "dimensiones":[{"id":"duracion","pct":20},{"id":"ritmo","pct":70}],
   "muletillas_top":[{"palabra":"este","veces":2}],"transcripcion":"Buenas, mi nombre es Ana y estudio ingeniería"}
]

def montar(ctx):
    def ruta(route):
        u, m = route.request.url, route.request.method
        if "/rest/v1/rondas" in u and m == "GET":
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(RONDAS))
        if "/rest/v1/perfiles" in u and m == "GET":
            return route.fulfill(status=200, content_type="application/json",
                body=json.dumps([{"id":"u-1","correo":SESION["correo"],"nombre":"Ana Pérez",
                                  "facultad":SESION["facultad"],"programa":SESION["programa"],"rol":"usuario"}]))
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    # ══════ ANCHO ══════
    print("\n1 · EL CONTENIDO CUBRE LA PÁGINA")
    ctx = br.new_context(viewport={"width":1920,"height":1080}); montar(ctx); pg = ctx.new_page()
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(900)

    env = pg.evaluate("""document.querySelector('#p-aprende .envoltura').getBoundingClientRect().width""")
    ok("la envoltura se ensanchó", env > 1300, "%.0f px" % env)

    medidas = pg.evaluate("""(function(){
      var e = document.querySelector('#p-aprende .envoltura').getBoundingClientRect().width;
      var r = {};
      [['bajada','.hero-bajada'],['cabecera','.seccion-cab p'],['aviso','.aviso-nada']].forEach(function(par){
        var el = document.querySelector(par[1]);
        if(el) r[par[0]] = Math.round(el.getBoundingClientRect().width);
      });
      r.envoltura = Math.round(e);
      return r;
    })()""")
    # la envoltura lleva 24 px de aire a cada lado
    util = medidas["envoltura"] - 48
    ok("el párrafo de cabecera llega al borde",
       abs(medidas.get("cabecera",0) - util) < 6, medidas)
    ok("el aviso de «sin cuenta» también",
       abs(medidas.get("aviso",0) - util) < 6, medidas)

    # el hero es una rejilla de dos columnas a propósito: la bajada
    # debe llenar la suya, no la página entera
    hb = pg.evaluate("""(function(){var e=document.querySelector('.hero-bajada');
        return {w:Math.round(e.getBoundingClientRect().width),
                col:Math.round(e.parentElement.getBoundingClientRect().width)}})()""")
    ok("la bajada llena su columna del hero", abs(hb["w"] - hb["col"]) < 3, hb)
    ok("sin errores de JS", not errs, errs)

    # ══════ NOTAS EN PRACTICA ══════
    print("\n2 · LAS NOTAS DE APOYO APARECEN EN PRACTICA")
    pg.evaluate("""document.querySelector('[aria-controls=p-prepara]').click()""")
    pg.wait_for_timeout(400)
    pg.fill("#notas", "Hola, como estás, hoy yo\ncifra clave: 31 horas")
    pg.wait_for_timeout(300)
    ok("en Prepara todavía no se ven (es otra hoja)",
       pg.evaluate("document.getElementById('p-practica').hidden"))

    pg.evaluate("""document.querySelector('[aria-controls=p-practica]').click()""")
    pg.wait_for_timeout(500)
    ok("al entrar a Practica se ven, sin grabar nada",
       pg.evaluate("document.getElementById('notas-vivas').style.display === 'block'"))
    ok("dicen lo que se escribió",
       "cifra clave: 31 horas" in pg.inner_text("#notas-eco"), pg.inner_text("#notas-eco"))

    print("\n3 · SE ACTUALIZAN AL EDITARLAS")
    pg.evaluate("""document.querySelector('[aria-controls=p-prepara]').click()""")
    pg.wait_for_timeout(300)
    pg.fill("#notas", "pedir reunión con operaciones")
    pg.evaluate("""document.querySelector('[aria-controls=p-practica]').click()""")
    pg.wait_for_timeout(400)
    ok("el eco cambió", pg.inner_text("#notas-eco").strip() == "pedir reunión con operaciones",
       pg.inner_text("#notas-eco"))

    pg.evaluate("""document.querySelector('[aria-controls=p-prepara]').click()""")
    pg.wait_for_timeout(200)
    pg.fill("#notas", "")
    pg.evaluate("""document.querySelector('[aria-controls=p-practica]').click()""")
    pg.wait_for_timeout(400)
    ok("sin notas, el bloque desaparece",
       pg.evaluate("document.getElementById('notas-vivas').style.display === 'none'"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    # ══════ EXCEL ══════
    print("\n4 · EL HISTORIAL SE DESCARGA EN EXCEL")
    ctx = br.new_context(viewport={"width":1920,"height":1080}, accept_downloads=True); montar(ctx)
    pg = ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE)
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(SESION)))
    pg.goto(BASE); pg.wait_for_timeout(1200)
    pg.evaluate("""document.querySelector('[aria-controls=p-reporte]').click()""")
    pg.wait_for_timeout(900)

    ok("ya no existe el botón de JSON", pg.query_selector("#hist-descargar") is None)
    btn = pg.query_selector("#hist-excel")
    ok("el botón de Excel existe y es visible", bool(btn) and btn.is_visible())
    ok("se llama «Descargar Excel»", btn.inner_text().strip() == "Descargar Excel", btn.inner_text())
    ok("el historial cargó las dos rondas", "45" in pg.inner_text("#hist-tabla, .hist-tabla, #p-reporte"))

    with pg.expect_download(timeout=15000) as info:
        btn.click()
    d = info.value
    nombre = d.suggested_filename
    ok("el archivo es .xlsx", nombre.endswith(".xlsx"), nombre)
    ruta = "/tmp/" + nombre
    d.save_as(ruta)

    with open(ruta, "rb") as f:
        crudo = f.read()
    ok("pesa algo", len(crudo) > 500, "%d bytes" % len(crudo))
    z = zipfile.ZipFile(io.BytesIO(crudo))
    nombres = z.namelist()
    ok("es un zip de Office válido", z.testzip() is None)
    ok("tiene la hoja de cálculo", any("worksheets/sheet1.xml" in n for n in nombres), nombres)
    ok("tiene el content types", "[Content_Types].xml" in nombres)
    hoja = z.read([n for n in nombres if "sheet1.xml" in n][0]).decode("utf8")
    compartidas = ""
    if any("sharedStrings" in n for n in nombres):
        compartidas = z.read([n for n in nombres if "sharedStrings" in n][0]).decode("utf8")
    todo = hoja + compartidas
    ok("trae la cabecera de columnas", "Puntaje" in todo and "Escenario" in todo)
    ok("trae las dos rondas", "Pitch para b" in todo, todo.count("Pitch para b"))
    ok("trae el correo de la persona", "ana.perez@unisabana.edu.co" in todo)
    ok("trae la transcripción", "estudio ingenier" in todo)
    ok("avisa cuántas rondas exportó", "2 rondas" in pg.inner_text("#p-reporte"),
       [l for l in pg.inner_text("#p-reporte").split("\n") if "Excel" in l][:2])
    ok("sin errores de JS", not errs, errs)
    ctx.close()
    br.close()

print("\n" + "="*54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
