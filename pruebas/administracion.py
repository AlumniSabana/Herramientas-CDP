import json, zipfile, io
from playwright.sync_api import sync_playwright

PORT = "http://127.0.0.1:8941/portafolio-alumni-sabana.html"
PITCH = "http://127.0.0.1:8941/estudio-de-pitch.html"
SB = "https://vfuexivozypglggxpqsy.supabase.co"
fallos, pedidos = [], []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

ADMIN = {"token":"tok","refresh":"ref","correo":"cdp.admin@unisabana.edu.co","nombre":"Desarrollo Profesional",
         "facultad":"Otra","programa":"Otro","rol":"admin","id":"adm-1"}
ALUMNO = {"token":"tok","refresh":"ref","correo":"ana.perez@unisabana.edu.co","nombre":"Ana Pérez",
          "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","rol":"usuario","id":"u-1"}

# El admin puede leer las rondas de todos: es lo que provoca el fallo
RONDAS_TODAS = [
  {"id":"r1","usuario_id":"u-1","creada_en":"2026-08-06T17:01:00","tipo_nombre":"Pitch de empleo",
   "modo":"voz","duracion_objetivo":180,"duracion_real":4,"puntaje":32,"palabras":5,"ppm":68,
   "muletillas_total":0,"secciones_cubiertas":1,"secciones_total":5,"dimensiones":[]},
  {"id":"r2","usuario_id":"u-1","creada_en":"2026-08-11T14:28:00","tipo_nombre":"Pitch de empleo",
   "modo":"voz","duracion_objetivo":180,"duracion_real":36,"puntaje":45,"palabras":29,"ppm":49,
   "muletillas_total":0,"secciones_cubiertas":2,"secciones_total":5,"dimensiones":[]},
]
PERFILES = [
  {"id":"u-1","correo":ALUMNO["correo"],"nombre":"Ana Pérez","facultad":"Facultad de Ingeniería",
   "programa":"Ingeniería Industrial","rol":"usuario","ultimo_acceso":"2026-08-11T14:00:00"},
  {"id":"u-2","correo":"luis@unisabana.edu.co","nombre":"Luis Gómez","facultad":"Facultad de Medicina",
   "programa":"Medicina","rol":"usuario","ultimo_acceso":"2026-08-10T10:00:00"},
  {"id":"adm-1","correo":ADMIN["correo"],"nombre":"Desarrollo Profesional","facultad":"Otra",
   "programa":"Otro","rol":"admin","ultimo_acceso":"2026-08-12T09:00:00"},
]
PORTAFOLIOS = [
  {"usuario_id":"u-1","correo":ALUMNO["correo"],"nombre":"Ana Pérez","facultad":"Facultad de Ingeniería",
   "programa":"Ingeniería Industrial","area":"ing","etapa":"Estudiante","objetivo":"Conseguir práctica",
   "hojas_completas":4,"fichas_total":3,"fichas_completas":2,"descargado":True,"revisado_ia":False,
   "creado_en":"2026-08-01T10:00:00","actualizado_en":"2026-08-12T11:30:00"},
  {"usuario_id":"u-2","correo":"luis@unisabana.edu.co","nombre":"Luis Gómez","facultad":"Facultad de Medicina",
   "programa":"Medicina","area":"sal","etapa":"Egresado","objetivo":"Cambiar de sector",
   "hojas_completas":2,"fichas_total":1,"fichas_completas":0,"descargado":False,"revisado_ia":True,
   "creado_en":"2026-08-05T09:00:00","actualizado_en":"2026-08-09T16:00:00"},
]

def montar(ctx, rondas_admin_falla=False):
    def ruta(route):
        req = route.request; u, m = req.url, req.method
        if "rpc/portafolios_admin" in u:
            pedidos.append({"_consolidado": u, "_metodo": m})
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(PORTAFOLIOS))
        if "/rest/v1/portafolios_admin" in u:
            # La vista ya no existe. Si alguien vuelve a apuntar aquí,
            # en producción son cero filas sin ningún error.
            pedidos.append({"_vista_muerta": u})
            return route.fulfill(status=200, content_type="application/json", body="[]")
        if "/rest/v1/portafolios" in u and m == "GET":
            return route.fulfill(status=200, content_type="application/json", body="[]")
        if "/rest/v1/portafolios" in u and m == "POST":
            cuerpo = json.loads(req.post_data)
            pedidos.append(cuerpo)
            cuerpo = dict(cuerpo); cuerpo["id"] = "port-1"
            return route.fulfill(status=201, content_type="application/json",
                                 body=json.dumps([cuerpo]))
        if ("/rest/v1/proyectos" in u or "/rest/v1/secciones_portafolio" in u):
            if m == "GET":
                return route.fulfill(status=200, content_type="application/json", body="[]")
            if m == "POST":
                cuerpo = json.loads(req.post_data)
                pedidos.append(cuerpo)
                cuerpo = dict(cuerpo); cuerpo["id"] = "fila-1"
                return route.fulfill(status=201, content_type="application/json",
                                     body=json.dumps([cuerpo]))
            return route.fulfill(status=204, body="")
        if "/rest/v1/portafolios" in u and m == "DELETE":
            pedidos.append({"_borrado": True})
            return route.fulfill(status=204, body="")
        if "/rest/v1/rondas_admin" in u:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(RONDAS_TODAS))
        if "/rest/v1/rondas" in u and m == "GET":
            pedidos.append({"_consulta_rondas": u})
            # Sin filtro devolvería todo; con filtro, solo lo del dueño
            if "usuario_id=eq." in u:
                quien = u.split("usuario_id=eq.")[1].split("&")[0]
                return route.fulfill(status=200, content_type="application/json",
                                     body=json.dumps([r for r in RONDAS_TODAS if r["usuario_id"] == quien]))
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(RONDAS_TODAS))
        if ("perfiles_admin" in u or "/rest/v1/perfiles" in u) and m == "GET":
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(PERFILES))
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

def abrir(br, url, sesion, **kw):
    ctx = br.new_context(viewport={"width":1500,"height":1000}, accept_downloads=True); montar(ctx, **kw)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(url)
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(sesion)))
    pg.goto(url); pg.wait_for_timeout(1300)
    return ctx, pg, errs

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    print("\n1 · EL HISTORIAL DEL ADMIN ES SOLO SUYO")
    del pedidos[:]
    ctx, pg, errs = abrir(br, PITCH, ADMIN)
    pg.evaluate("document.querySelector('[aria-controls=p-reporte]').click()"); pg.wait_for_timeout(1000)
    consultas = [x["_consulta_rondas"] for x in pedidos if "_consulta_rondas" in x]
    ok("la consulta filtra por usuario_id", consultas and all("usuario_id=eq.adm-1" in c for c in consultas),
       consultas[:1])
    filas = pg.evaluate("document.querySelectorAll('#historial-cuerpo tr').length")
    ok("el admin no ve rondas ajenas en su historial", filas == 0, "%d filas" % filas)
    ok("sin errores de JS", not errs, errs)

    print("\n2 · EL ADMIN NO CUENTA COMO PERSONA")
    pg.wait_for_timeout(800)
    texto = pg.inner_text("#admin-panel")
    ok("la tabla de personas no lo incluye",
       "Desarrollo Profesional" not in pg.inner_text("#admin-personas"),
       [l for l in pg.inner_text("#admin-personas").split("\n") if "@" in l][:3])
    ok("siguen las dos personas reales",
       "Ana Pérez" in pg.inner_text("#admin-personas") and "Luis" in pg.inner_text("#admin-personas"))
    kpis = pg.evaluate("""Array.from(document.querySelectorAll('#admin-kpis .admin-kpi'))
        .map(e => e.querySelector('.t').textContent + '=' + e.querySelector('.n').textContent)""")
    personas = [k for k in kpis if k.startswith("Personas")]
    ok("el indicador dice 2, no 3", personas and personas[0] == "Personas=2", kpis)
    ok("lo explica en el subtítulo", "cuenta de administración" in pg.inner_text("#admin-sub"),
       pg.inner_text("#admin-sub"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n3 · EL ALUMNO SÍ VE SUS RONDAS")
    del pedidos[:]
    ctx, pg, errs = abrir(br, PITCH, ALUMNO)
    pg.evaluate("document.querySelector('[aria-controls=p-reporte]').click()"); pg.wait_for_timeout(900)
    filas = pg.evaluate("document.querySelectorAll('#historial-cuerpo tr').length")
    ok("ve sus dos rondas", filas == 2, "%d filas" % filas)
    ok("no ve el panel de administración", pg.evaluate("document.getElementById('admin-panel').hidden"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n4 · PORTAFOLIO: EL ALUMNO NO VE ADMINISTRACIÓN")
    del pedidos[:]
    ctx, pg, errs = abrir(br, PORT, ALUMNO)
    ok("no hay entrada en el índice", pg.evaluate("document.getElementById('nav-admin').hidden"))
    ok("la hoja está oculta", pg.evaluate("document.getElementById('admin').hidden"))
    ok("sin errores de JS", not errs, errs)

    print("\n5 · PORTAFOLIO: EL CONTENIDO SE GUARDA EN LA CUENTA")
    # Antes se mandaba a una tabla de métricas una contabilidad
    # («hojas_completas», «fichas_total») mientras el texto se quedaba
    # en el navegador. Ahora se guarda el contenido de verdad y las
    # cifras las calcula la vista del consolidado.
    pg.evaluate("location.hash='#identidad'"); pg.wait_for_timeout(300)
    pg.fill("#f-nombre", "Ana Pérez")
    pg.fill("#f-valor", "Ingeniera industrial que reduce paradas de línea en planta")
    pg.wait_for_timeout(4200)

    cabecera = [x for x in pedidos if "titulo" in x]
    ok("creó la cabecera del portafolio", len(cabecera) >= 1, len(cabecera))
    if cabecera:
        ok("con el nombre como título", cabecera[-1].get("titulo") == "Ana Pérez",
           cabecera[-1].get("titulo"))

    secciones = [x for x in pedidos if x.get("tipo")]
    ok("guardó la propuesta de valor",
       any("reduce paradas" in (x.get("contenido") or "") for x in secciones),
       [x.get("tipo") for x in secciones])
    ok("y el programa en claro para el consolidado",
       any(x.get("tipo") == "programa_nombre" and x.get("contenido") == "Ingeniería Industrial"
           for x in secciones),
       [x.get("tipo") for x in secciones])
    ok("ya no manda la contabilidad aparte",
       not [x for x in pedidos if "hojas_completas" in x], pedidos[:2])
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n6 · PORTAFOLIO: EL ADMIN VE EL CONSOLIDADO")
    del pedidos[:]
    ctx, pg, errs = abrir(br, PORT, ADMIN)
    ok("aparece la entrada en el índice", not pg.evaluate("document.getElementById('nav-admin').hidden"))
    pg.evaluate("""document.querySelector('a[href="#admin"]').click()""")
    pg.wait_for_timeout(900)
    ok("la hoja se muestra", pg.evaluate("document.getElementById('admin').classList.contains('on')"))
    # El consolidado entra por una función «security definer», no por
    # una vista: con vista el RLS dejaba al administrador viendo solo
    # su propia fila, y el panel salía en blanco sin dar ningún error.
    ok("pide la función, no la vista",
       any(x.get("_consolidado") for x in pedidos) and
       not any(x.get("_vista_muerta") for x in pedidos),
       [k for x in pedidos for k in x if k.startswith("_")])
    ok("y la pide por POST, como hace PostgREST con las funciones",
       any(x.get("_metodo") == "POST" for x in pedidos if x.get("_consolidado")),
       [x.get("_metodo") for x in pedidos if x.get("_consolidado")])
    t = pg.inner_text("#admin")
    ok("lista a las dos personas", "Ana Pérez" in t and "Luis Gómez" in t)
    ok("muestra el avance", "4 de 5" in t and "2 de 5" in t, [l for l in t.split("\n") if "de 5" in l][:4])
    kp = pg.evaluate("""Array.from(document.querySelectorAll('#adm-kpis .adm-kpi'))
        .map(e => e.querySelector('.t').textContent + '=' + e.querySelector('.n').textContent)""")
    ok("los indicadores cuadran", "Personas=2" in kp and "Descargaron el PDF=1" in kp, kp)
    ok("el desglose por programa está", "Ingeniería Industrial" in pg.inner_text("#adm-prog-cuerpo"))
    ok("dice qué NO contiene", "No hay una sola palabra" in t)
    ok("no cuenta como hoja del recorrido",
       "de 12" not in pg.inner_text("#admin") and pg.evaluate(
           "document.querySelectorAll('.hoja').length") == 11,
       pg.evaluate("document.querySelectorAll('.hoja').length"))

    print("\n7 · PORTAFOLIO: EXCEL DEL CONSOLIDADO")
    with pg.expect_download(timeout=15000) as info:
        pg.click("#adm-excel")
    d = info.value
    ok("se llama portafolios-cdp.xlsx", d.suggested_filename == "portafolios-cdp.xlsx", d.suggested_filename)
    d.save_as("/tmp/" + d.suggested_filename)
    z = zipfile.ZipFile("/tmp/" + d.suggested_filename)
    hoja = z.read([n for n in z.namelist() if "sheet1.xml" in n][0]).decode("utf8")
    ok("es un xlsx válido", z.testzip() is None)
    ok("trae las dos personas", "Ana P" in hoja and "Luis" in hoja)
    ok("trae las columnas", "Secciones completas" in hoja and "Descargó el PDF" in hoja)
    ok("sin errores de JS", not errs, errs)
    ctx.close()
    br.close()

print("\n" + "="*54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
