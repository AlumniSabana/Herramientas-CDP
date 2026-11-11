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

def persona(i, fac, prog):
    return {"id":"u-%d" % i, "correo":"p%d@unisabana.edu.co" % i, "nombre":"Persona %d" % i,
            "facultad":fac, "programa":prog, "rol":"usuario", "ultimo_acceso":"2026-08-11T14:00:00"}

# Seis facultades con gente, para que la rosca tenga que agrupar en «Otras»
PERFILES = (
  [persona(i, "Facultad de Ingeniería", "Ciencia de Datos") for i in range(1, 7)] +
  [persona(i, "Facultad de Ingeniería", "Ingeniería Industrial") for i in range(7, 10)] +
  [persona(i, "Facultad de Medicina", "Medicina") for i in range(10, 15)] +
  [persona(i, "Facultad de Comunicación", "Comunicación Social y Periodismo") for i in range(15, 18)] +
  [persona(i, "Facultad de Educación", "Licenciatura en Educación Infantil") for i in range(18, 20)] +
  [persona(i, "Facultad de Filosofía y Ciencias Humanas", "Filosofía") for i in range(20, 22)] +
  [persona(i, "Facultad de Ciencias del Comportamiento", "Psicología") for i in range(22, 23)] +
  [{"id":"adm-1","correo":ADMIN["correo"],"nombre":"Desarrollo Profesional","facultad":"Otra",
    "programa":"Otro","rol":"admin","ultimo_acceso":"2026-08-12T09:00:00"}]
)
RONDAS = [
  {"id":"r1","correo":"p1@unisabana.edu.co","nombre":"Persona 1","facultad":"Facultad de Ingeniería",
   "programa":"Ciencia de Datos","creada_en":"2026-08-06T17:01:00","tipo_nombre":"Pitch de empleo","modo":"voz",
   "duracion_objetivo":180,"duracion_real":95,"puntaje":72,"palabras":150,"ppm":95,
   "muletillas_total":3,"secciones_cubiertas":4,"secciones_total":5,
   "dimensiones":[{"id":"duracion","nombre":"Duración","pct":80},{"id":"ritmo","nombre":"Ritmo","pct":70}],
   "muletillas_top":[{"palabra":"este","veces":3}],
   "transcripcion":"Buenas, soy Persona 1 y trabajo con datos de operación en planta.",
   "observaciones":"Abriste con el problema y eso funcionó. El cierre se quedó sin petición concreta.",
   "ejercicio":{"titulo":"Cierra con una pregunta","texto":"Termina pidiendo algo específico."}},
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

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    ctx = br.new_context(viewport={"width":1600,"height":1050}); montar(ctx)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(PITCH)
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(ADMIN)))
    pg.goto(PITCH); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('[aria-controls=p-reporte]').click()"); pg.wait_for_timeout(1200)
    pg.click("#at-programas"); pg.wait_for_timeout(700)

    print("\n1 · LA ROSCA POR FACULTAD")
    ok("se ve", not pg.query_selector("#rosca-zona").is_hidden())
    ok("el título dice de qué es", "por facultad" in pg.inner_text("#rosca-titulo"),
       pg.inner_text("#rosca-titulo"))
    total = pg.inner_text("#rosca-total")
    ok("el centro lleva el total de personas", total == "22", total)
    n = pg.evaluate("document.querySelectorAll('#rosca-svg .rosca-sector').length")
    ok("nunca pasa de cinco sectores", 1 <= n <= 5, "%d sectores" % n)
    leyenda = pg.evaluate("""Array.from(document.querySelectorAll('#rosca-item, .rosca-item')).map(e=>
        e.querySelector('.rosca-nom').textContent + '=' + e.querySelector('.rosca-val').textContent)""")
    ok("la leyenda nombra cada sector", len(leyenda) == n, leyenda)
    ok("el mayor va primero", leyenda and leyenda[0].endswith("=9"), leyenda)
    ok("agrupa el resto en «Otras»", any("Otras" in l for l in leyenda), leyenda)
    suma = sum(int(l.split("=")[1]) for l in leyenda)
    ok("los sectores suman el total", suma == 22, suma)
    pcts = pg.evaluate("""Array.from(document.querySelectorAll('.rosca-pct')).map(e=>e.textContent)""")
    ok("cada uno lleva su porcentaje", len(pcts) == n and all("%" in x for x in pcts), pcts)

    print("\n2 · LA IDENTIDAD NO DEPENDE DEL COLOR")
    ok("hay descripción para lectores de pantalla",
       len(pg.evaluate("document.getElementById('rosca-alt').textContent")) > 40)
    ok("cada arco lleva su propio título", pg.evaluate(
       """Array.from(document.querySelectorAll('#rosca-svg .rosca-sector title'))
            .every(t => t.textContent.indexOf('%') > -1)"""),
       pg.evaluate("""Array.from(document.querySelectorAll('#rosca-svg .rosca-sector title')).map(t=>t.textContent)"""))
    ok("la tabla completa sigue debajo",
       pg.evaluate("document.querySelectorAll('#admin-cuerpo tr').length") >= 10)
    ok("sin errores de JS", not errs, errs)
    pg.screenshot(path="/tmp/rosca-fac.png", clip={"x":0,"y":150,"width":1600,"height":700})

    print("\n3 · LA ROSCA POR PROGRAMA")
    pg.evaluate("""document.querySelector('#admin-cuerpo tr[data-facultad="Facultad de Ingeniería"]').click()""")
    pg.wait_for_timeout(600)
    ok("cambia de nivel", "por programa" in pg.inner_text("#rosca-titulo"), pg.inner_text("#rosca-titulo"))
    ok("nombra la facultad", "Ingeniería" in pg.inner_text("#rosca-titulo"))
    ok("el total es el de la facultad", pg.inner_text("#rosca-total") == "9", pg.inner_text("#rosca-total"))
    leyenda = pg.evaluate("""Array.from(document.querySelectorAll('.rosca-item')).map(e=>
        e.querySelector('.rosca-nom').textContent + '=' + e.querySelector('.rosca-val').textContent)""")
    ok("solo salen los programas con gente", len(leyenda) == 2, leyenda)
    ok("Ciencia de Datos va primero con 6", leyenda and leyenda[0] == "Ciencia de Datos=6", leyenda)
    ok("sin errores de JS", not errs, errs)
    pg.screenshot(path="/tmp/rosca-prog.png", clip={"x":0,"y":150,"width":1600,"height":700})

    print("\n4 · EL REPORTE Y LAS OBSERVACIONES DESDE EL RECORRIDO")
    pg.evaluate("""document.querySelector('#admin-cuerpo tr[data-programa="Ciencia de Datos"]').click()""")
    pg.wait_for_timeout(600)
    ok("en el nivel de personas la rosca se retira",
       pg.query_selector("#rosca-zona").is_hidden())
    ok("hay botón para ver el reporte",
       pg.evaluate("document.querySelectorAll('#admin-cuerpo [data-ver-persona]').length") >= 1)

    pg.evaluate("""document.querySelector('#admin-cuerpo [data-ver-persona]').click()""")
    pg.wait_for_timeout(600)
    ok("se abre el detalle de la persona", not pg.query_selector("#admin-detalle").is_hidden())
    ok("nombra a la persona", "Persona" in pg.inner_text("#det-nombre"), pg.inner_text("#det-nombre"))
    ok("lista sus rondas", pg.evaluate("document.querySelectorAll('#det-rondas [data-ronda]').length") == 1)

    pg.evaluate("""document.querySelector('#det-rondas [data-ronda]').click()""")
    pg.wait_for_timeout(600)
    det = pg.inner_text("#det-ronda")
    ok("muestra el reporte de la ronda", "72" in det and "DURACIÓN" in det.upper(), det[:60])
    ok("muestra la transcripción", "datos de operación en planta" in det)
    ok("muestra las observaciones", "sin petición concreta" in det)
    ok("muestra el ejercicio sugerido", "Cierra con una pregunta" in det)
    ok("sin errores de JS", not errs, errs)
    pg.screenshot(path="/tmp/detalle-ronda.png", clip={"x":0,"y":150,"width":1600,"height":800})

    print("\n5 · VOLVER")
    pg.evaluate("document.getElementById('det-volver').click()"); pg.wait_for_timeout(500)
    ok("vuelve al recorrido por programa",
       not pg.query_selector("#admin-vista-programas").is_hidden())
    ok("sin errores de JS", not errs, errs)
    print("\n7 · LA ROSCA COMO FILTRO")
    pg.evaluate("""document.querySelector('#admin-ruta [data-ruta="raiz"]') &&
        document.querySelector('#admin-ruta [data-ruta="raiz"]').click()""")
    pg.wait_for_timeout(500)
    ok("volvimos al nivel de facultades", "Todas las facultades" in pg.inner_text("#admin-ruta"),
       pg.inner_text("#admin-ruta"))

    leyenda = pg.evaluate("""Array.from(document.querySelectorAll('.rosca-item')).map(e=>
        (e.tagName === 'BUTTON' ? 'boton:' : 'texto:') + e.querySelector('.rosca-nom').textContent)""")
    ok("los sectores con destino son botones",
       sum(1 for l in leyenda if l.startswith("boton:")) >= 4, leyenda)
    ok("el agrupado NO es botón, porque son varias",
       any(l.startswith("texto:") and "Otras" in l for l in leyenda), leyenda)
    ok("el arco también es pulsable",
       pg.evaluate("document.querySelectorAll('#rosca-svg .rosca-sector.navega').length") >= 4)
    ok("el title invita a pulsar",
       "Pulsa para ver" in pg.evaluate(
         """document.querySelector('#rosca-svg .rosca-sector.navega title').textContent"""))

    # Se pulsa el arco de Medicina desde la propia rosca
    pg.evaluate("""(function(){
        var b = Array.from(document.querySelectorAll('.rosca-item'))
          .find(e => e.querySelector('.rosca-nom').textContent === 'Medicina');
        b.click();
    })()""")
    pg.wait_for_timeout(600)
    ok("la leyenda lleva a la facultad", "Medicina" in pg.inner_text("#admin-ruta"),
       pg.inner_text("#admin-ruta"))
    ok("y muestra sus programas", "por programa" in pg.inner_text("#rosca-titulo"),
       pg.inner_text("#rosca-titulo"))

    # Y desde el nivel de programas, al programa
    pg.evaluate("""document.querySelector('#rosca-svg .rosca-sector.navega').dispatchEvent(
        new MouseEvent('click', {bubbles:true}))""")
    pg.wait_for_timeout(600)
    ok("el arco lleva al programa", "Medicina" in pg.inner_text("#admin-ruta"),
       pg.inner_text("#admin-ruta"))
    ok("llegamos al nivel de personas",
       pg.evaluate("document.querySelectorAll('#admin-cuerpo [data-ver-persona]').length") >= 1)
    ok("sin errores de JS", not errs, errs)
    ctx.close()
    br.close()

print("\n" + "="*54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
