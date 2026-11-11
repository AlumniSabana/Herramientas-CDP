# ══════════════════════════════════════════════════════════════
#  LA HOJA «REVISIÓN USUARIOS»
#
#  El consolidado cuenta; esta hoja mira persona por persona, con la
#  misma rosca del panel del Pitch, filtros por facultad y programa,
#  y la revisión de cada quien.
#
#  Uso:  python3 pruebas/revision-usuarios.py
#  Necesita un servidor estático sobre la raíz del repositorio:
#    python3 -m http.server 8941
# ══════════════════════════════════════════════════════════════
import json
from playwright.sync_api import sync_playwright

PORT = "http://127.0.0.1:8941/portafolio-alumni-sabana.html"
SB   = "https://vfuexivozypglggxpqsy.supabase.co"
fallos = []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

ADMIN  = {"token":"t","refresh":"r","correo":"cdp@unisabana.edu.co","nombre":"Desarrollo Profesional",
          "facultad":"Otra","programa":"Otro","rol":"admin","id":"adm-1"}
ALUMNO = {"token":"t","refresh":"r","correo":"ana@unisabana.edu.co","nombre":"Ana Pérez",
          "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","rol":"usuario","id":"u-1"}

# Seis facultades para que la rosca tenga que agrupar: pinta las
# cuatro mayores con nombre propio y junta el resto.
GENTE = [
  ("u-1",  "Ana Pérez",      "Facultad de Ingeniería",  "Ingeniería Industrial"),
  ("u-2",  "Luis Gómez",     "Facultad de Ingeniería",  "Ingeniería Industrial"),
  ("u-3",  "Sara Ruiz",      "Facultad de Ingeniería",  "Ingeniería Informática"),
  ("u-4",  "Diego Rojas",    "Facultad de Derecho",     "Derecho"),
  ("u-5",  "Marta Peña",     "Facultad de Derecho",     "Derecho"),
  ("u-6",  "Iván Castro",    "Facultad de Medicina",    "Medicina"),
  ("u-7",  "Nora Vidal",     "Facultad de Medicina",    "Medicina"),
  ("u-8",  "Pablo Sáenz",    "Facultad de Comunicación","Comunicación Social"),
  ("u-9",  "Elena Duque",    "Facultad de Enfermería",  "Enfermería"),
  ("u-10", "Tomás Lara",     "Facultad de Educación",   "Pedagogía Infantil"),
]

CONSOLIDADO = [
  {"usuario_id": i, "correo": n.split()[0].lower() + "@unisabana.edu.co", "nombre": n,
   "facultad": f, "programa": pr, "area": "x", "etapa": "estudiante", "objetivo": "practica",
   "hojas_completas": 3, "fichas_total": 2, "fichas_completas": 1,
   "descargado": i in ("u-1", "u-4"), "revisado_ia": i == "u-1", "es_admin": False,
   "creado_en": "2026-08-01T10:00:00", "actualizado_en": "2026-08-2%d T09:00:00".replace(" ", "") % (len(n) % 9)}
  for i, n, f, pr in GENTE
] + [
  # La propia cuenta del Centro: la vista la devuelve marcada, no la
  # esconde. Quien administra tiene que poder verse a sí mismo para
  # saber que la herramienta está guardando algo.
  {"usuario_id": "adm-1", "correo": "cdp@unisabana.edu.co", "nombre": "Desarrollo Profesional",
   "facultad": "Otra", "programa": "Otro", "area": "x", "etapa": "estudiante",
   "objetivo": "practica", "hojas_completas": 1, "fichas_total": 0, "fichas_completas": 0,
   "descargado": False, "revisado_ia": False, "es_admin": True,
   "creado_en": "2026-08-01T10:00:00", "actualizado_en": "2026-08-27T09:00:00"},
]

REVISIONES = [
  {"id": "rev-1", "usuario_id": "u-1", "portafolio_id": "port-1",
   "correo": "ana@unisabana.edu.co", "nombre": "Ana Pérez",
   "facultad": "Facultad de Ingeniería", "programa": "Ingeniería Industrial",
   "resultado": {"veredicto": "El perfil todavía habla en adjetivos.", "listo": False,
                 "prioridad": "Ponle una cifra a la ficha 1.", "fichas": 1,
                 "proyectos": [{"ficha": 1, "titulo": "Rediseño de la línea", "estado": "afinar",
                                "observaciones": ["Dices «las paradas bajaron». ¿De cuánto a cuánto?"]}],
                 "secciones": []},
   "creado_en": "2026-08-20T11:00:00"},
]

def montar(ctx):
    def ruta(route):
        u, m = route.request.url, route.request.method
        if "rpc/portafolios_admin" in u:
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps(CONSOLIDADO))
        if "rpc/revisiones_admin" in u:
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps(REVISIONES))
        if "/rest/v1/" in u:
            if m == "GET":
                return route.fulfill(status=200, content_type="application/json", body="[]")
            if m == "POST":
                return route.fulfill(status=201, content_type="application/json",
                                     body=json.dumps([{"id": "x-1"}]))
            return route.fulfill(status=204, body="")
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

def abrir(br, sesion):
    ctx = br.new_context(viewport={"width":1500,"height":1050})
    montar(ctx)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(PORT)
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(sesion)))
    pg.goto(PORT)
    pg.wait_for_timeout(2000)
    return ctx, pg, errs

def filas(pg):
    return pg.evaluate("""Array.from(document.querySelectorAll('#us-cuerpo tr[data-persona]'))
        .map(t => t.getAttribute('data-persona'))""")

def leyenda(pg):
    return pg.evaluate("""Array.from(document.querySelectorAll('#rosca-leyenda .rosca-item'))
        .map(e => e.querySelector('.rosca-nom').textContent + '=' + e.querySelector('.rosca-val').textContent)""")


with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    print("\n1 · SOLO EXISTE PARA ADMINISTRACIÓN")
    ctx, pg, errs = abrir(br, ALUMNO)
    ok("la hoja está oculta", pg.evaluate("document.getElementById('usuarios').hidden"))
    ok("y no hay enlace en el índice", pg.evaluate(
       """document.getElementById('g-admin').hidden"""))
    ok("no cuenta como hoja del recorrido",
       pg.evaluate("document.querySelectorAll('.hoja').length") == 11,
       pg.evaluate("document.querySelectorAll('.hoja').length"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n2 · EL CENTRO LA ABRE DESDE EL ÍNDICE")
    ctx, pg, errs = abrir(br, ADMIN)
    ok("el enlace está", pg.evaluate("""!!document.querySelector('a[href="#usuarios"]')"""))
    pg.evaluate("""document.querySelector('a[href="#usuarios"]').click()""")
    pg.wait_for_timeout(1200)
    ok("la hoja se muestra", pg.evaluate(
       """document.getElementById('usuarios').classList.contains('on')"""))
    ok("y el consolidado se apaga", pg.evaluate(
       """!document.getElementById('admin').classList.contains('on')"""))
    ok("se llama Revisión usuarios",
       "Revisión usuarios" in pg.inner_text("#usuarios .admin-cab"))
    ok("están las diez personas", len(filas(pg)) == 10, len(filas(pg)))

    print("\n3 · LA ROSCA REPARTE POR FACULTAD")
    ok("la rosca se ve", not pg.evaluate("document.getElementById('rosca-zona').hidden"))
    ok("el centro suma el total", pg.inner_text("#rosca-total") == "10",
       pg.inner_text("#rosca-total"))
    ley = leyenda(pg)
    ok("Ingeniería es el mayor", ley and ley[0].startswith("Facultad de Ingeniería=3"), ley)
    ok("agrupa las de la cola", any(l.startswith("Otras") for l in ley), ley)
    ok("hay como mucho cinco sectores", len(ley) <= 5, len(ley))
    ok("el título lo dice", "por facultad" in pg.inner_text("#rosca-titulo").lower(),
       pg.inner_text("#rosca-titulo"))
    ok("hay texto alternativo para lectores de pantalla",
       "Total 10" in pg.evaluate("document.getElementById('rosca-alt').textContent"))

    print("\n4 · PULSAR UN SECTOR BAJA A PROGRAMA")
    pg.evaluate("""document.querySelector('#rosca-leyenda [data-rosca]').click()""")
    pg.wait_for_timeout(600)
    ok("la tabla se filtra a esa facultad", len(filas(pg)) == 3, len(filas(pg)))
    ok("la rosca pasa a programas",
       "por programa" in pg.inner_text("#rosca-titulo").lower(), pg.inner_text("#rosca-titulo"))
    ley = leyenda(pg)
    ok("con sus dos programas", len(ley) == 2, ley)
    ok("el desplegable de facultad quedó puesto",
       pg.input_value("#us-facultad") == "Facultad de Ingeniería", pg.input_value("#us-facultad"))
    # «data-ir» es el atributo del paginador de hojas. Cuando la
    # leyenda lo usaba, pulsarla filtraba Y saltaba a la hoja 1 del
    # recorrido, sacando al Centro del panel sin avisar.
    ok("no se sale de la hoja al pulsar la leyenda", pg.evaluate(
       """document.getElementById('usuarios').classList.contains('on')"""),
       pg.evaluate("""(document.querySelector('.hoja.on')||{}).id"""))
    ok("las migas dicen dónde estás",
       "Facultad de Ingeniería" in pg.inner_text("#us-ruta"), pg.inner_text("#us-ruta"))

    print("\n5 · Y OTRA VEZ BAJA A LAS PERSONAS DE UN PROGRAMA")
    pg.evaluate("""(function(){
        var bs = document.querySelectorAll('#rosca-leyenda [data-rosca]');
        bs[0].click();
    })()""")
    pg.wait_for_timeout(600)
    ok("quedan solo los de ese programa", len(filas(pg)) == 2, len(filas(pg)))
    ok("la rosca se retira", pg.evaluate("document.getElementById('rosca-zona').hidden"))
    ok("la cuenta lo dice", "2 personas" in pg.inner_text("#us-cuenta"), pg.inner_text("#us-cuenta"))

    print("\n6 · LAS MIGAS DEVUELVEN")
    pg.evaluate("""document.querySelectorAll('#us-ruta button')[1].click()""")
    pg.wait_for_timeout(500)
    ok("vuelve a la facultad entera", len(filas(pg)) == 3, len(filas(pg)))
    pg.evaluate("""document.querySelectorAll('#us-ruta button')[0].click()""")
    pg.wait_for_timeout(500)
    ok("y de ahí a todas", len(filas(pg)) == 10, len(filas(pg)))
    ok("la rosca vuelve a facultades",
       "por facultad" in pg.inner_text("#rosca-titulo").lower())

    print("\n7 · LOS FILTROS Y EL BUSCADOR")
    pg.select_option("#us-facultad", "Facultad de Derecho")
    pg.wait_for_timeout(500)
    ok("filtra por facultad", len(filas(pg)) == 2, len(filas(pg)))
    pg.fill("#us-busca", "marta")
    pg.wait_for_timeout(500)
    ok("y el buscador afina", filas(pg) == ["u-5"], filas(pg))
    ok("dice cuántas quedan", "1 persona" in pg.inner_text("#us-cuenta"), pg.inner_text("#us-cuenta"))
    pg.evaluate("document.getElementById('us-limpiar').click()")
    pg.wait_for_timeout(500)
    ok("«Quitar filtros» lo restablece todo", len(filas(pg)) == 10, len(filas(pg)))
    ok("y vacía el buscador", pg.input_value("#us-busca") == "")
    ok("el desplegable de facultad también",
       pg.input_value("#us-facultad") == "", pg.input_value("#us-facultad"))

    print("\n8 · LA REVISIÓN SE ABRE EN ESTA HOJA")
    ok("solo Ana tiene botón", pg.evaluate(
       """document.querySelectorAll('#us-cuerpo [data-revisiones]').length""") == 1)
    pg.evaluate("""document.querySelector('#us-cuerpo [data-revisiones]').click()""")
    pg.wait_for_timeout(700)
    ok("se abre aquí, no en el consolidado",
       not pg.evaluate("document.getElementById('us-revision').hidden") and
       pg.evaluate("document.getElementById('adm-revision').hidden"))
    det = pg.inner_text("#us-revision")
    ok("dice de quién es", "Ana Pérez" in det)
    ok("con sus observaciones", "¿De cuánto a cuánto?" in det)
    ok("la fila queda marcada", pg.evaluate("!!document.querySelector('#us-cuerpo tr.elegida')"))
    ok("sin errores de JS", not errs, errs)

    print("\n9 · PULSAR LA FILA ENTERA TAMBIÉN ABRE")
    pg.evaluate("""(function(){
        var bs = document.querySelectorAll('#us-revision .adm-revision-cab button');
        bs[bs.length-1].click();
    })()""")
    pg.wait_for_timeout(300)
    ok("se puede cerrar", pg.evaluate("document.getElementById('us-revision').hidden"))
    pg.evaluate("""document.querySelector('#us-cuerpo tr[data-persona="u-1"]').click()""")
    pg.wait_for_timeout(600)
    ok("y la fila la vuelve a abrir",
       not pg.evaluate("document.getElementById('us-revision').hidden"))
    ok("sin errores de JS", not errs, errs)

    print("\n10 · LA CUENTA DEL CENTRO SE VE, PERO NO CUENTA")
    ok("no sale entre las personas por defecto",
       "adm-1" not in filas(pg), filas(pg))
    pg.evaluate("document.getElementById('us-centro').click()")
    pg.wait_for_timeout(600)
    ok("al marcar la casilla aparece", "adm-1" in filas(pg), filas(pg))
    ok("y va señalada como del Centro",
       "CENTRO" in pg.inner_text("#us-cuerpo").upper())
    ok("ahora son once", len(filas(pg)) == 11, len(filas(pg)))
    pg.evaluate("""document.querySelector('a[href="#admin"]').click()""")
    pg.wait_for_timeout(900)
    kp = pg.evaluate("""Array.from(document.querySelectorAll('#adm-kpis .adm-kpi'))
        .map(e => e.querySelector('.t').textContent + '=' + e.querySelector('.n').textContent)""")
    ok("el consolidado sigue contando diez",
       any(k.upper().startswith("PERSONAS=10") for k in kp), kp)
    ok("y lo explica", "Queda fuera una cuenta del Centro" in pg.inner_text("#adm-sub"),
       pg.inner_text("#adm-sub"))
    pg.evaluate("""document.querySelector('a[href="#usuarios"]').click()""")
    pg.wait_for_timeout(700)

    print("\n11 · NO SE FILTRA EL TEXTO DEL PORTAFOLIO")
    hoja = pg.inner_text("#usuarios")
    ok("se dice qué NO hay aquí", "No su portafolio" in hoja)
    ok("y cómo conseguirlo", "pídeselo" in hoja.lower())
    pg.evaluate("document.getElementById('usuarios').scrollIntoView()")
    pg.wait_for_timeout(400)
    pg.screenshot(path="/tmp/revision-usuarios.png")
    ctx.close()

    br.close()

print("\n" + "=" * 54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
