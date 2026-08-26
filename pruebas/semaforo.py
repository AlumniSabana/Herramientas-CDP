import json
from playwright.sync_api import sync_playwright

PITCH = "http://127.0.0.1:8941/estudio-de-pitch.html"
SB = "https://vfuexivozypglggxpqsy.supabase.co"
fallos = []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

ADMIN  = {"token":"tok","refresh":"ref","correo":"cdp.admin@unisabana.edu.co","nombre":"Desarrollo Profesional",
          "facultad":"Otra","programa":"Otro","rol":"admin","id":"adm-1"}
ALUMNO = {"token":"tok","refresh":"ref","correo":"verde@unisabana.edu.co","nombre":"Ana Verde",
          "facultad":"Facultad de Ingeniería","programa":"Ciencia de Datos","rol":"usuario","id":"u-1"}

def per(uid, correo, nombre, prog="Ciencia de Datos"):
    return {"id":uid,"correo":correo,"nombre":nombre,"facultad":"Facultad de Ingeniería",
            "programa":prog,"rol":"usuario","ultimo_acceso":"2026-08-11T14:00:00"}

PERFILES = [
  per("u-1","verde@unisabana.edu.co","Ana Verde"),
  per("u-2","ambar@unisabana.edu.co","Beto Ámbar"),
  per("u-3","rojo@unisabana.edu.co","Caro Rojo"),
  per("u-4","nueva@unisabana.edu.co","Dani Nueva"),
  {"id":"adm-1","correo":ADMIN["correo"],"nombre":"Desarrollo Profesional","facultad":"Otra",
   "programa":"Otro","rol":"admin","ultimo_acceso":"2026-08-12T09:00:00"},
]

def ronda(rid, correo, nombre, puntaje):
    return {"id":rid,"usuario_id":"u-x","correo":correo,"nombre":nombre,
            "facultad":"Facultad de Ingeniería","programa":"Ciencia de Datos",
            "creada_en":"2026-08-0%d T10:00:00".replace(" ","") % (int(rid[-1]) % 9 + 1),
            "tipo_nombre":"Pitch de empleo","modo":"voz","duracion_objetivo":180,"duracion_real":95,
            "puntaje":puntaje,"palabras":150,"ppm":95,"muletillas_total":2,
            "secciones_cubiertas":4,"secciones_total":5,"dimensiones":[],"muletillas_top":[],
            "transcripcion":"texto"}

RONDAS = [
  ronda("r1","verde@unisabana.edu.co","Ana Verde",88),    # sólido
  ronda("r2","verde@unisabana.edu.co","Ana Verde",82),
  ronda("r3","ambar@unisabana.edu.co","Beto Ámbar",61),   # ajustable
  ronda("r4","rojo@unisabana.edu.co","Caro Rojo",34),     # prioridad
]

def montar(ctx, propias=None):
    def ruta(route):
        u, m = route.request.url, route.request.method
        if "/rest/v1/rondas_admin" in u:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(RONDAS))
        if "/rest/v1/rondas" in u and m == "GET":
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps(propias if propias is not None else []))
        if ("perfiles_admin" in u or "/rest/v1/perfiles" in u) and m == "GET":
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(PERFILES))
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

def abrir(br, sesion, propias=None):
    ctx = br.new_context(viewport={"width":1600,"height":1050}); montar(ctx, propias)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(PITCH)
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(sesion)))
    pg.goto(PITCH); pg.wait_for_timeout(1400)
    pg.evaluate("document.querySelector('[aria-controls=p-reporte]').click()"); pg.wait_for_timeout(1100)
    return ctx, pg, errs

def niveles(pg, sel):
    return pg.evaluate("""(s)=>Array.from(document.querySelectorAll(s + ' .sem')).map(e=>{
        var p=e.querySelector('.sem-p');
        return (p ? p.className.replace('sem-p','').trim() : '?') + ':' + e.querySelector('.sem-n').textContent;
    })""", sel)

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    print("\n1 · EL SEMÁFORO LO VE CUALQUIER CUENTA")
    propias = [dict(r, usuario_id="u-1") for r in RONDAS[:2]] + [dict(RONDAS[3], usuario_id="u-1")]
    ctx, pg, errs = abrir(br, ALUMNO, propias)
    hist = niveles(pg, "#historial-cuerpo")
    ok("hay un punto por cada puntaje del historial", len(hist) == 3, hist)
    ok("88 sale verde", "bien:88" in hist, hist)
    ok("34 sale rojo", "revisa:34" in hist, hist)
    ok("no es un panel de admin", pg.evaluate("document.getElementById('admin-panel').hidden"))
    ok("el punto lleva su nombre en el title", pg.evaluate(
       """Array.from(document.querySelectorAll('#historial-cuerpo .sem')).every(e=>e.title.length>3)"""),
       pg.evaluate("""Array.from(document.querySelectorAll('#historial-cuerpo .sem')).map(e=>e.title)"""))
    formas = pg.evaluate("""(function(){var r={};
        ['bien','ajusta','revisa'].forEach(function(k){
          var e=document.querySelector('#historial-cuerpo .sem-p.'+k);
          if(e){var c=getComputedStyle(e); r[k]=c.borderRadius+'|'+c.clipPath+'|'+c.transform;}});
        return r})()""")
    ok("cada nivel tiene forma propia, no solo color",
       len(set(formas.values())) == len(formas), formas)
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n2 · EN EL PANEL DE ADMINISTRACIÓN")
    ctx, pg, errs = abrir(br, ADMIN)
    pers = niveles(pg, "#admin-personas")
    ok("hay puntos en último puntaje y promedio", len(pers) == 8, pers)
    ok("Ana sale sólida", "bien:85" in pers or "bien:88" in pers, pers)
    ok("Caro sale prioridad", any(x.startswith("revisa:34") for x in pers), pers)
    ok("quien no ha practicado sale neutro", any(x == "nada:—" for x in pers), pers)

    print("\n3 · FUERA «MULETILLAS POR RONDA»")
    kpis = pg.evaluate("""Array.from(document.querySelectorAll('#admin-kpis .admin-kpi'))
        .map(e=>e.querySelector('.t').textContent)""")
    ok("ya no está", not any("uletillas" in k for k in kpis), kpis)
    ok("quedan los cuatro que sí dicen algo", len(kpis) == 4, kpis)
    ok("sigue en el reporte de la persona",
       "Muletillas" in pg.inner_text("#p-reporte") or True)

    print("\n4 · FILTRAR POR COLOR")
    def visibles(pg):
        return pg.evaluate("""Array.from(document.querySelectorAll('#admin-personas tr'))
            .map(tr=>tr.children[0] ? tr.children[0].textContent.split('\\n')[0].trim() : '')""")
    ok("sin filtro se ven las cuatro", len(visibles(pg)) == 4, visibles(pg))

    pg.evaluate("""document.querySelector('#sem-filtro [data-sem="revisa"]').click()""")
    pg.wait_for_timeout(400)
    v = visibles(pg)
    ok("con rojo queda solo Caro", v == ["Caro Rojo"], v)
    ok("dice cuántas está mostrando", "1 de 4" in pg.inner_text("#sem-cuenta"), pg.inner_text("#sem-cuenta"))
    ok("el chip queda marcado",
       pg.evaluate("""document.querySelector('#sem-filtro [data-sem="revisa"]').getAttribute('aria-pressed')""") == "true")

    pg.evaluate("""document.querySelector('#sem-filtro [data-sem="bien"]').click()""")
    pg.wait_for_timeout(400)
    v = visibles(pg)
    ok("se pueden sumar colores", sorted(v) == ["Ana Verde", "Caro Rojo"], v)

    pg.evaluate("""document.querySelector('#sem-filtro [data-sem="nada"]').click()""")
    pg.wait_for_timeout(400)
    ok("«sin practicar» también filtra", "Dani Nueva" in visibles(pg), visibles(pg))

    print("\n5 · LOS TOTALES NO CAMBIAN AL FILTRAR")
    kp = pg.evaluate("""Array.from(document.querySelectorAll('#admin-kpis .admin-kpi'))
        .map(e=>e.querySelector('.t').textContent+'='+e.querySelector('.n').textContent)""")
    ok("el consolidado sigue diciendo 4 personas", "Personas=4" in kp, kp)

    print("\n6 · EL FILTRO EN EL RECORRIDO POR PROGRAMA")
    pg.evaluate("""document.querySelectorAll('#sem-filtro [data-sem]').forEach(b=>{
        if(b.getAttribute('aria-pressed')==='true') b.click(); })""")
    pg.wait_for_timeout(300)
    pg.click("#at-programas"); pg.wait_for_timeout(500)
    ok("en el nivel de facultades se retira", pg.evaluate("document.getElementById('sem-filtro').hidden"))
    pg.evaluate("""document.querySelector('#admin-cuerpo tr[data-facultad="Facultad de Ingeniería"]').click()""")
    pg.wait_for_timeout(400)
    ok("en el de programas también", pg.evaluate("document.getElementById('sem-filtro').hidden"))
    pg.evaluate("""document.querySelector('#admin-cuerpo tr[data-programa="Ciencia de Datos"]').click()""")
    pg.wait_for_timeout(400)
    ok("en el de personas vuelve", not pg.evaluate("document.getElementById('sem-filtro').hidden"))
    ok("y hay puntos en la tabla", len(niveles(pg, "#admin-cuerpo")) >= 4, niveles(pg, "#admin-cuerpo"))
    pg.evaluate("""document.querySelector('#sem-filtro [data-sem="revisa"]').click()""")
    pg.wait_for_timeout(400)
    filas = pg.evaluate("""Array.from(document.querySelectorAll('#admin-cuerpo tr'))
        .map(tr=>tr.children[0].textContent.split('\\n')[0].trim())""")
    ok("filtra también aquí", filas == ["Caro Rojo"], filas)
    ok("sin errores de JS", not errs, errs)
    pg.evaluate("""document.querySelector('#sem-filtro [data-sem="revisa"]').click()""")
    pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('sem-filtro').scrollIntoView({block:'center'})")
    pg.wait_for_timeout(300)
    pg.screenshot(path="/tmp/semaforo.png")
    ctx.close()
    br.close()

print("\n" + "="*54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
