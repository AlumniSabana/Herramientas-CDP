import json
from playwright.sync_api import sync_playwright

PITCH = "http://127.0.0.1:8941/estudio-de-pitch.html"
SB = "https://vfuexivozypglggxpqsy.supabase.co"
fallos = []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

ADMIN = {"token":"tok","refresh":"ref","correo":"cdp.admin@unisabana.edu.co","nombre":"Desarrollo Profesional",
         "facultad":"Otra","programa":"Otro","rol":"admin","id":"adm-1"}

PERFILES = [
  {"id":"u-1","correo":"joel@unisabana.edu.co","nombre":"Joel Montenegro",
   "facultad":"Facultad de Ingeniería","programa":"Ciencia de Datos","rol":"usuario","ultimo_acceso":"2026-08-11T14:00:00"},
  {"id":"u-2","correo":"dalia@unisabana.edu.co","nombre":"Dalia Carvajal",
   "facultad":"Facultad de Ciencias del Comportamiento","programa":"Psicología","rol":"usuario","ultimo_acceso":"2026-08-10T10:00:00"},
  {"id":"u-3","correo":"sara@unisabana.edu.co","nombre":"Sara Rojas",
   "facultad":"Facultad de Ingeniería","programa":"Ciencia de Datos","rol":"usuario","ultimo_acceso":"2026-08-09T10:00:00"},
  {"id":"adm-1","correo":ADMIN["correo"],"nombre":"Desarrollo Profesional","facultad":"Otra",
   "programa":"Otro","rol":"admin","ultimo_acceso":"2026-08-12T09:00:00"},
]
RONDAS = [
  {"id":"r1","correo":"joel@unisabana.edu.co","nombre":"Joel Montenegro","facultad":"Facultad de Ingeniería",
   "programa":"Ciencia de Datos","creada_en":"2026-08-06T17:01:00","tipo_nombre":"Pitch de empleo","modo":"voz",
   "duracion_objetivo":180,"duracion_real":4,"puntaje":32,"palabras":5,"ppm":68,
   "muletillas_total":0,"secciones_cubiertas":1,"secciones_total":5,"dimensiones":[]},
  {"id":"r2","correo":"joel@unisabana.edu.co","nombre":"Joel Montenegro","facultad":"Facultad de Ingeniería",
   "programa":"Ciencia de Datos","creada_en":"2026-08-11T14:28:00","tipo_nombre":"Pitch de empleo","modo":"voz",
   "duracion_objetivo":180,"duracion_real":36,"puntaje":46,"palabras":29,"ppm":49,
   "muletillas_total":0,"secciones_cubiertas":2,"secciones_total":5,"dimensiones":[]},
]

def montar(ctx):
    def ruta(route):
        u, m = route.request.url, route.request.method
        if "/rest/v1/rondas_admin" in u:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(RONDAS))
        if "/rest/v1/rondas" in u and m == "GET":
            return route.fulfill(status=200, content_type="application/json", body="[]")
        if ("perfiles_admin" in u or "/rest/v1/perfiles" in u) and m == "GET":
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(PERFILES))
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

def filas(pg):
    # El semáforo añade una etiqueta oculta dentro de la celda; para
    # comparar cifras hay que quedarse con el número que se ve.
    return pg.evaluate("""Array.from(document.querySelectorAll('#admin-cuerpo tr'))
        .map(tr => Array.from(tr.children).map(td => {
            var n = td.querySelector('.sem-n');
            return (n ? n.textContent : td.textContent).trim().split('\\n')[0];
        }))""")

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    ctx = br.new_context(viewport={"width":1600,"height":1000}); montar(ctx)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(PITCH)
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(ADMIN)))
    pg.goto(PITCH); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('[aria-controls=p-reporte]').click()"); pg.wait_for_timeout(1200)
    pg.click("#at-programas"); pg.wait_for_timeout(600)

    print("\n1 · NIVEL 1: TODAS LAS FACULTADES")
    f = filas(pg)
    ok("salen las diez facultades de la Universidad", len(f) >= 10, "%d filas" % len(f))
    nombres = [x[0] for x in f]
    for esperada in ["Facultad de Ingeniería", "Facultad de Medicina", "Facultad de Educación",
                     "Escuela Internacional de Ciencias Económicas y Administrativas"]:
        ok("está «%s»" % esperada[:34], esperada in nombres)
    ing = [x for x in f if x[0] == "Facultad de Ingeniería"]
    ok("Ingeniería cuenta 2 personas", ing and ing[0][2] == "2", ing)
    ok("Ingeniería cuenta 1 con rondas", ing and ing[0][3] == "1", ing)
    ok("Ingeniería cuenta 2 rondas", ing and ing[0][4] == "2", ing)
    med = [x for x in f if x[0] == "Facultad de Medicina"]
    ok("Medicina aparece aunque esté en cero", med and med[0][2] == "0", med)
    ok("las vacías se ven apagadas",
       pg.evaluate("""!!document.querySelector('#admin-cuerpo tr.vacia')"""))
    ok("la pista explica el nivel", "facultades" in pg.inner_text("#admin-prog-pista"),
       pg.inner_text("#admin-prog-pista"))
    ok("sin errores de JS", not errs, errs)

    print("\n2 · NIVEL 2: LOS PROGRAMAS DE INGENIERÍA")
    pg.evaluate("""document.querySelector('#admin-cuerpo tr[data-facultad="Facultad de Ingeniería"]').click()""")
    pg.wait_for_timeout(500)
    f = filas(pg)
    progs = [x[0] for x in f]
    ok("salen todos los programas de la facultad", len(f) >= 3, progs)
    ok("está Ciencia de Datos", "Ciencia de Datos" in progs, progs)
    cd = [x for x in f if x[0] == "Ciencia de Datos"]
    ok("Ciencia de Datos cuenta 2 personas", cd and cd[0][1] == "2", cd)
    ok("y 2 rondas", cd and cd[0][3] == "2", cd)
    otros = [x for x in f if x[0] != "Ciencia de Datos"]
    ok("los programas sin nadie también salen", otros and otros[0][1] == "0", otros[:2])
    ok("la ruta muestra dónde estás", "Facultad de Ingeniería" in pg.inner_text("#admin-ruta"),
       pg.inner_text("#admin-ruta"))
    ok("sin errores de JS", not errs, errs)

    print("\n3 · NIVEL 3: LAS PERSONAS DEL PROGRAMA")
    pg.evaluate("""document.querySelector('#admin-cuerpo tr[data-programa="Ciencia de Datos"]').click()""")
    pg.wait_for_timeout(500)
    f = filas(pg)
    quienes = [x[0] for x in f]
    ok("salen las dos personas del programa", len(f) == 2, quienes)
    ok("está Joel", any("Joel" in q for q in quienes), quienes)
    ok("está Sara, que no ha practicado", any("Sara" in q for q in quienes), quienes)
    joel = [x for x in f if "Joel" in x[0]]
    ok("Joel tiene 2 rondas", joel and joel[1 - 1][1] == "2", joel)
    ok("su promedio es 39", joel and joel[0][3] == "39", joel)
    sara = [x for x in f if "Sara" in x[0]]
    ok("Sara sale con cero", sara and sara[0][1] == "0", sara)
    ok("el admin NO aparece en ningún nivel", "Desarrollo Profesional" not in pg.inner_text("#admin-cuerpo"))
    ok("la ruta tiene los tres pasos",
       pg.evaluate("document.querySelectorAll('#admin-ruta button').length") == 2,
       pg.inner_text("#admin-ruta"))
    ok("sin errores de JS", not errs, errs)

    print("\n4 · VOLVER POR LA RUTA")
    pg.evaluate("""document.querySelector('#admin-ruta [data-ruta="facultad"]').click()""")
    pg.wait_for_timeout(400)
    ok("vuelve a los programas", "Ciencia de Datos" in [x[0] for x in filas(pg)])
    pg.evaluate("""document.querySelector('#admin-ruta [data-ruta="raiz"]').click()""")
    pg.wait_for_timeout(400)
    ok("vuelve a las facultades", len(filas(pg)) >= 10, len(filas(pg)))
    ok("sin errores de JS", not errs, errs)
    pg.screenshot(path="/tmp/prog-n1.png", clip={"x":0,"y":180,"width":1600,"height":760})
    ctx.close()
    br.close()

print("\n" + "="*54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
