# ══════════════════════════════════════════════════════════════
#  EL CDP PASA LA PUERTA Y LEE LAS SEGUNDAS OPINIONES
#
#  Dos cosas distintas que van juntas porque las dos son del panel
#  de administración:
#
#  1. La regla que exige una ficha entera para pasar de hoja no le
#     aplica a la cuenta del Centro, que entra a revisar el recorrido
#     y no a construir su portafolio.
#  2. Desde el consolidado se pueden leer las revisiones con IA de
#     cada persona, y en la hoja del estudiante se dice que el Centro
#     las puede leer ANTES de que pulse el botón.
#
#  Uso:  python3 pruebas/admin-revisiones.py
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

CONSOLIDADO = [
  {"usuario_id":"u-1","correo":"ana@unisabana.edu.co","nombre":"Ana Pérez",
   "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","area":"ing",
   "etapa":"graduado","objetivo":"empleo","hojas_completas":4,"fichas_total":3,
   "fichas_completas":2,"descargado":True,"revisado_ia":True,
   "creado_en":"2026-08-01T10:00:00","actualizado_en":"2026-08-20T11:30:00"},
  {"usuario_id":"u-2","correo":"luis@unisabana.edu.co","nombre":"Luis Gómez",
   "facultad":"Facultad de Derecho","programa":"Derecho","area":"der",
   "etapa":"estudiante","objetivo":"practica","hojas_completas":2,"fichas_total":1,
   "fichas_completas":0,"descargado":False,"revisado_ia":False,
   "creado_en":"2026-08-05T09:00:00","actualizado_en":"2026-08-09T16:00:00"},
]

def revision(veredicto, prioridad):
    return {"veredicto": veredicto, "listo": False, "prioridad": prioridad,
            "fichas": 2,
            "proyectos": [
              {"ficha": 1, "titulo": "Rediseño de la línea", "estado": "afinar",
               "observaciones": ["Dices «las paradas bajaron». ¿De cuánto a cuánto?"]}],
            "secciones": [
              {"nombre": "Perfil profesional", "estado": "desarrollar",
               "observaciones": ["«Proactivo» no es una capacidad demostrable."]}]}

REVISIONES = [
  {"id":"rev-2","usuario_id":"u-1","portafolio_id":"port-1","correo":"ana@unisabana.edu.co",
   "nombre":"Ana Pérez","facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial",
   "resultado": revision("La segunda pasada ya se sostiene mejor.", "Ponle una cifra a la ficha 1."),
   "creado_en":"2026-08-20T11:00:00"},
  {"id":"rev-1","usuario_id":"u-1","portafolio_id":"port-1","correo":"ana@unisabana.edu.co",
   "nombre":"Ana Pérez","facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial",
   "resultado": revision("Al principio el perfil eran solo adjetivos.", "Empieza por el perfil."),
   "creado_en":"2026-08-06T09:00:00"},
]

def montar(ctx, con_revisiones=True):
    def ruta(route):
        u, m = route.request.url, route.request.method
        if "rpc/portafolios_admin" in u:
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps(CONSOLIDADO))
        if "rpc/revisiones_admin" in u:
            if not con_revisiones:
                return route.fulfill(status=404, content_type="application/json",
                                     body=json.dumps({"code": "42P01",
                                                      "message": 'function public.revisiones_admin() does not exist'}))
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


def abrir(br, sesion, con_revisiones=True):
    ctx = br.new_context(viewport={"width":1500,"height":1000})
    montar(ctx, con_revisiones)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(PORT)
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(sesion)))
    pg.goto(PORT)
    pg.wait_for_timeout(2000)
    return ctx, pg, errs


with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    print("\n1 · AL ALUMNO SÍ SE LE PIDE UNA FICHA")
    ctx, pg, errs = abrir(br, ALUMNO)
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(600)
    ok("el botón Siguiente está desactivado", pg.evaluate(
       """document.querySelector('#proyectos .pager button.solid[data-ir]').disabled"""))
    ok("y se le dice qué falta",
       "completa una ficha entera" in pg.inner_text("#proy-puerta").lower(),
       pg.inner_text("#proy-puerta"))
    ok("las hojas de después están atenuadas en el índice", pg.evaluate(
       """!!document.querySelector('a[href="#impacto"].bloqueado')"""))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n2 · LA CUENTA DEL CENTRO PASA SIN FICHAS")
    ctx, pg, errs = abrir(br, ADMIN)
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(600)
    ok("el botón Siguiente está activo", not pg.evaluate(
       """document.querySelector('#proyectos .pager button.solid[data-ir]').disabled"""))
    ok("el aviso explica por qué",
       "administración" in pg.inner_text("#proy-puerta").lower(),
       pg.inner_text("#proy-puerta"))
    ok("el índice no está bloqueado", pg.evaluate(
       """!document.querySelector('a[href="#impacto"].bloqueado')"""))
    pg.evaluate("""document.querySelector('#proyectos .pager button.solid[data-ir]').click()""")
    pg.wait_for_timeout(500)
    ok("y de verdad avanza de hoja", pg.evaluate(
       """!!document.querySelector('#impacto.on')"""),
       pg.evaluate("""(document.querySelector('.hoja.on')||{}).id"""))
    ok("sin errores de JS", not errs, errs)

    print("\n3 · EL CONSOLIDADO ENSEÑA QUIÉN PIDIÓ REVISIÓN")
    pg.evaluate("""document.querySelector('a[href="#admin"]').click()""")
    pg.wait_for_timeout(1200)
    tabla = pg.inner_text("#adm-tabla")
    ok("aparecen las dos personas", "Ana Pérez" in tabla and "Luis Gómez" in tabla)
    ok("Ana tiene botón para ver sus revisiones", pg.evaluate(
       """!!document.querySelector('[data-revisiones="u-1"]')"""))
    ok("dice cuántas son",
       "Ver (2)" in pg.inner_text('[data-revisiones="u-1"]'),
       pg.inner_text('[data-revisiones="u-1"]'))
    ok("Luis no tiene ninguna", pg.evaluate(
       """!document.querySelector('[data-revisiones="u-2"]')"""))
    # Los rótulos de los indicadores van en versalitas por CSS, así
    # que inner_text los devuelve en mayúsculas.
    ok("hay un indicador arriba",
       "PIDIERON SEGUNDA OPINIÓN" in pg.inner_text("#adm-kpis").upper(),
       pg.inner_text("#adm-kpis").replace("\n", " ")[:120])
    ok("la ficha empieza cerrada", pg.evaluate("document.getElementById('adm-revision').hidden"))

    print("\n4 · SE PUEDE LEER LA REVISIÓN DE OTRA PERSONA")
    pg.evaluate("""document.querySelector('[data-revisiones="u-1"]').click()""")
    pg.wait_for_timeout(600)
    ok("la ficha se abre", not pg.evaluate("document.getElementById('adm-revision').hidden"))
    det = pg.inner_text("#adm-revision")
    ok("dice de quién es", "Ana Pérez" in det and "ana@unisabana.edu.co" in det)
    ok("muestra la más reciente primero", "ya se sostiene mejor" in det, det[:90])
    ok("con las observaciones por ficha", "¿De cuánto a cuánto?" in det)
    ok("y las de las secciones", "no es una capacidad demostrable" in det)
    ok("habla de ella, no de quien lee", "SUS FICHAS DE PROYECTO" in det.upper())
    ok("recuerda que la escribió una máquina",
       "inteligencia artificial" in det.lower() and "no un diagnóstico del Centro" in det)

    print("\n5 · SE PUEDEN COMPARAR DOS REVISIONES")
    ok("hay una fecha por revisión",
       pg.evaluate("document.querySelectorAll('#adm-revision [data-revision]').length") == 2)
    pg.evaluate("""document.querySelectorAll('#adm-revision [data-revision]')[1].click()""")
    pg.wait_for_timeout(500)
    det = pg.inner_text("#adm-revision")
    ok("se abre la anterior", "solo adjetivos" in det, det[:90])
    ok("la fecha elegida queda marcada",
       pg.evaluate("!!document.querySelector('#adm-revision [data-revision].activa')"))
    pg.evaluate("""(function(){
        var bs = document.querySelectorAll('#adm-revision .adm-revision-cab button');
        bs[bs.length-1].click();
    })()""")
    pg.wait_for_timeout(300)
    ok("se puede cerrar", pg.evaluate("document.getElementById('adm-revision').hidden"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n6 · AL ESTUDIANTE SE LE DICE ANTES DE PULSAR")
    ctx, pg, errs = abrir(br, ALUMNO)
    bloque = pg.inner_text("#revision")
    ok("se dice quién más la puede leer",
       "Centro de Desarrollo Profesional también puede consultarla" in bloque, bloque[-300:])
    ok("y que el portafolio no lo ve nadie más",
       "no lo ve nadie más que tú" in bloque)
    ok("el aviso del botón lo repite",
       "puede consultarla" in pg.inner_text("#rev-nota"), pg.inner_text("#rev-nota"))
    pie = pg.inner_text("footer")
    ok("el pie también lo dice", "también puede leerla" in pie, pie[-260:])
    ok("y dice cómo evitarlo", "bórrala" in pie.lower())
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n7 · SI FALTA LA VISTA, EL CONSOLIDADO SIGUE EN PIE")
    ctx, pg, errs = abrir(br, ADMIN, con_revisiones=False)
    pg.evaluate("""document.querySelector('a[href="#admin"]').click()""")
    pg.wait_for_timeout(1200)
    ok("la tabla se pinta igual", "Ana Pérez" in pg.inner_text("#adm-tabla"))
    ok("sin botón de revisiones", pg.evaluate(
       """!document.querySelector('[data-revisiones]')"""))
    ok("sin errores de JS", not errs, errs)
    pg.evaluate("document.getElementById('admin').scrollIntoView()")
    pg.wait_for_timeout(300)
    ctx.close()

    br.close()

print("\n" + "=" * 54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
