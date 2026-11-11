# ══════════════════════════════════════════════════════════════
#  SEGUNDA OPINIÓN: SE DICE QUE ES DE IA, NO DESCALIFICA
#  Y SE QUEDA EN LA CUENTA DE QUIEN LA PIDIÓ
#
#  Uso:  python3 pruebas/segunda-opinion-guardada.py
#  Necesita un servidor estático sobre la raíz del repositorio:
#    python3 -m http.server 8911
# ══════════════════════════════════════════════════════════════
import json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8911/portafolio-alumni-sabana.html"
SB   = "https://vfuexivozypglggxpqsy.supabase.co"
fallos = []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

SESION = {"token":"tok","refresh":"ref","correo":"ana@unisabana.edu.co","nombre":"Ana Prueba",
          "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","rol":"usuario","id":"u-1"}
OTRA   = {"token":"tok","refresh":"ref","correo":"luis@unisabana.edu.co","nombre":"Luis Prueba",
          "facultad":"Facultad de Derecho","programa":"Derecho","rol":"usuario","id":"u-2"}

RESPUESTA = {
  "veredicto": "Hay una ficha que ya se sostiene y un perfil que todavía habla en adjetivos.",
  "listo": False,
  "proyectos": [
    {"ficha": 1, "titulo": "Rediseño de la línea de empaque", "estado": "afinar",
     "observaciones": ["Dices «las paradas bajaron». ¿De cuánto a cuánto?"]},
    {"ficha": 2, "titulo": "Control de inventario", "estado": "desarrollar",
     "observaciones": ["La evidencia dice «informe interno», que el lector no puede abrir."]}
  ],
  "secciones": [
    {"nombre": "Perfil profesional", "estado": "desarrollar",
     "observaciones": ["«Proactivo» no es una capacidad demostrable."]},
    {"nombre": "Contacto", "estado": "solido", "observaciones": ["Correo y LinkedIn, suficiente."]}
  ],
  "prioridad": "Ponle una cifra al resultado de la ficha 1."
}

FICHAS = """(function(){
  var fs = document.querySelectorAll('#proyectos-wrap fieldset')[0];
  var v = {'p-titulo':'Rediseño de la línea de empaque',
    'p-contexto':'La línea tenía una parada diaria que frenaba el turno completo de la mañana en planta',
    'p-objetivo':'Reducir las paradas no programadas de la línea principal',
    'p-rol':'Levanté el diagnóstico, medí los tiempos y propuse el cambio de secuencia',
    'p-acciones':'Medí ciclos durante dos semanas seguidas, comparé tres secuencias posibles y decidí cambiar el orden de las estaciones',
    'p-resultado':'Las paradas bajaron y el turno terminó a tiempo durante todo el mes siguiente',
    'p-evidencia':'https://ejemplo.org/informe'};
  Object.keys(v).forEach(function(c){ var el=fs.querySelector('.'+c); if(el){ el.value=v[c];
    el.dispatchEvent(new Event('input',{bubbles:true})); } });
})()"""


class Base:
    """Una tabla «revisiones» de mentira, con su filtro por usuario.

    El filtro importa: la prueba de que cada quien ve solo las suyas
    no sirve de nada si el doble del servidor devuelve todas."""
    def __init__(self, guarda=True):
        self.filas = []
        self.portafolios = []
        self.guarda = guarda       # False = la tabla no existe todavía
        self.n = 0

    def leer(self, url):
        quien = ""
        if "usuario_id=eq." in url:
            quien = url.split("usuario_id=eq.")[1].split("&")[0]
        return [f for f in self.filas if f["usuario_id"] == quien]

    def insertar(self, fila):
        self.n += 1
        fila = dict(fila)
        fila["id"] = "rev-%d" % self.n
        fila["creado_en"] = "2026-08-%02dT10:00:00" % (10 + self.n)
        self.filas.insert(0, fila)
        return [fila]

    def borrar(self, url):
        ident = url.split("id=eq.")[1].split("&")[0]
        self.filas = [f for f in self.filas if f["id"] != ident]


def montar(ctx, base, revision=None, estado_revision=200):
    def ruta(route):
        u, m = route.request.url, route.request.method
        if "/rest/v1/portafolios" in u:
            if m == "GET":
                return route.fulfill(status=200, content_type="application/json",
                                     body=json.dumps(base.portafolios))
            if m == "POST":
                cuerpo = json.loads(route.request.post_data)
                cuerpo["id"] = "port-1"
                base.portafolios = [cuerpo]
                return route.fulfill(status=201, content_type="application/json",
                                     body=json.dumps([cuerpo]))
        if "/rest/v1/proyectos" in u or "/rest/v1/secciones_portafolio" in u:
            if m == "GET":
                return route.fulfill(status=200, content_type="application/json", body="[]")
            if m == "POST":
                return route.fulfill(status=201, content_type="application/json",
                                     body=json.dumps([{"id": "x-1"}]))
            return route.fulfill(status=204, body="")
        if "/functions/v1/revisar-portafolio" in u:
            return route.fulfill(status=estado_revision, content_type="application/json",
                                 body=json.dumps(revision if revision is not None else RESPUESTA))
        if "/rest/v1/revisiones_ia" in u:
            if not base.guarda:
                return route.fulfill(status=404, content_type="application/json",
                                     body=json.dumps({"message": "relation \"public.revisiones\" does not exist"}))
            if m == "GET":
                return route.fulfill(status=200, content_type="application/json",
                                     body=json.dumps(base.leer(u)))
            if m == "POST":
                return route.fulfill(status=201, content_type="application/json",
                                     body=json.dumps(base.insertar(json.loads(route.request.post_data))))
            if m == "DELETE":
                base.borrar(u)
                return route.fulfill(status=204, body="")
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)


def abrir(br, base, sesion=SESION, **kw):
    ctx = br.new_context(viewport={"width":1440,"height":1000})
    montar(ctx, base, **kw)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE)
    if sesion:
        pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(sesion)))
        pg.goto(BASE)
    pg.wait_for_timeout(900)
    return ctx, pg, errs


def revisar(pg):
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(300)
    pg.evaluate(FICHAS); pg.wait_for_timeout(400)
    pg.evaluate("location.hash='#checklist'"); pg.wait_for_timeout(400)
    pg.click("#rev-pedir"); pg.wait_for_timeout(1500)


with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    print("\n1 · SE DICE QUE LA ESCRIBE UNA MÁQUINA, ANTES DE LEERLA")
    base = Base()
    ctx, pg, errs = abrir(br, base)
    cab = pg.inner_text("#revision .revision-cab")
    ok("el sello está junto al título", "INTELIGENCIA ARTIFICIAL" in cab.upper(), cab.replace("\n", " ")[:90])
    cuerpo = pg.inner_text("#revision")
    ok("y se explica en el cuerpo, no en la letra pequeña",
       "La escribe una máquina, no una persona del Centro" in cuerpo)
    ok("dice que se puede equivocar", "se equivoca" in cuerpo)
    ok("remite a un asesor de verdad", "Hablar con un asesor" in cuerpo)
    ok("el aviso repite quién la escribe",
       "modelo de inteligencia artificial" in pg.inner_text("#rev-nota"), pg.inner_text("#rev-nota"))

    print("\n2 · NINGÚN ESTADO DESCALIFICA")
    revisar(pg)
    salida = pg.inner_text("#rev-salida")
    ok("la revisión se ve", not pg.query_selector("#rev-salida").is_hidden())
    ok("los estados son «Por afinar» y «Por desarrollar»",
       "POR AFINAR" in salida.upper() and "POR DESARROLLAR" in salida.upper())
    for palabra in ["INSUFICIENTE", "POBRE", "FLOJO", "DEFICIENTE"]:
        ok("no aparece «%s»" % palabra.lower(), palabra not in salida.upper())
    ok("el pie nombra la inteligencia artificial",
       "inteligencia artificial" in pg.inner_text("#rev-salida .rev-pie").lower())
    ok("«Por desarrollar» no se pinta de rojo de alerta", pg.evaluate(
       """(function(){var e=document.querySelector('#rev-salida .rev-item.desarrollar');
          if(!e) return false;
          var c=getComputedStyle(e).borderLeftColor;
          return c !== getComputedStyle(document.documentElement).getPropertyValue('--alerta').trim();})()"""))
    ok("sin errores de JS", not errs, errs)

    print("\n3 · LA REVISIÓN SE GUARDA EN LA CUENTA")
    ok("se guardó una fila", len(base.filas) == 1, len(base.filas))
    fila = base.filas[0] if base.filas else {}
    ok("con el identificador de quien la pidió", fila.get("usuario_id") == "u-1", fila.get("usuario_id"))
    res = fila.get("resultado") or {}
    ok("guarda el veredicto", "habla en adjetivos" in (res.get("veredicto") or ""), res.get("veredicto"))
    ok("guarda las observaciones por ficha", len(res.get("proyectos", [])) == 2)
    ok("cuelga del portafolio de esa persona", bool(fila.get("portafolio_id")), fila.get("portafolio_id"))
    ok("NO guarda el borrador del portafolio",
       "parada diaria" not in json.dumps(fila, ensure_ascii=False))
    ok("aparece en la lista de anteriores", not pg.query_selector("#rev-guardadas").is_hidden())
    ok("la lista dice cuándo fue",
       "2026-08-11" in pg.inner_text("#rev-guardadas"), pg.inner_text("#rev-guardadas"))
    # Desde que el CDP puede leerlas para preparar la asesoría, decir
    # «nadie más las ve» sería mentira. Se dice quién y cómo evitarlo.
    lista = pg.inner_text("#rev-guardadas")
    ok("dice quién más las ve", "Centro de Desarrollo Profesional" in lista, lista)
    ok("y cómo evitarlo", "Borra la que no quieras" in lista)

    print("\n4 · SE PUEDEN VOLVER A ABRIR")
    pg.evaluate("document.getElementById('rev-salida').innerHTML=''")
    pg.evaluate("document.querySelector('#rev-guardadas [data-ver-revision]').click()")
    pg.wait_for_timeout(500)
    vuelta = pg.inner_text("#rev-salida")
    ok("vuelve el veredicto", "habla en adjetivos" in vuelta)
    ok("vuelven las dos fichas", vuelta.count("Ficha ") == 2, vuelta.count("Ficha "))
    ok("vuelve la prioridad", "cifra al resultado" in vuelta)
    ok("avisa que es una revisión anterior",
       "revisión del" in pg.inner_text("#rev-nota"), pg.inner_text("#rev-nota"))
    ok("la fila abierta queda marcada",
       pg.evaluate("!!document.querySelector('#rev-guardadas li.activa')"))

    print("\n5 · SOBREVIVEN A LA RECARGA")
    pg.reload(); pg.wait_for_timeout(1200)
    ok("siguen ahí", not pg.query_selector("#rev-guardadas").is_hidden())
    ok("con la del día", "2026-08-11" in pg.inner_text("#rev-guardadas"))
    ok("pero la pantalla arranca limpia", pg.query_selector("#rev-salida").is_hidden())
    ok("sin errores de JS", not errs, errs)

    print("\n6 · CADA CUENTA VE SOLO LAS SUYAS")
    ctx2 = br.new_context(viewport={"width":1440,"height":1000})
    montar(ctx2, base)
    pg2 = ctx2.new_page(); errs2 = []
    pg2.on("pageerror", lambda e: errs2.append(str(e)))
    pg2.goto(BASE)
    pg2.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(OTRA)))
    pg2.goto(BASE); pg2.wait_for_timeout(1200)
    ok("la otra cuenta no ve ninguna", pg2.query_selector("#rev-guardadas").is_hidden(),
       pg2.inner_text("#rev-guardadas"))
    ok("y la consulta pidió las suyas, no todas", all(
       f["usuario_id"] == "u-1" for f in base.filas))
    ok("sin errores de JS", not errs2, errs2)
    ctx2.close()

    print("\n7 · SE PUEDEN BORRAR")
    pg.evaluate("window.confirm = function(){ return true; }")
    pg.evaluate("document.querySelector('#rev-guardadas [data-borrar-revision]').click()")
    pg.wait_for_timeout(700)
    ok("desaparece de la base", len(base.filas) == 0, len(base.filas))
    ok("y de la pantalla", pg.query_selector("#rev-guardadas").is_hidden())
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n8 · SI FALTA LA TABLA, LA REVISIÓN NO SE PIERDE")
    sin = Base(guarda=False)
    ctx3, pg3, errs3 = abrir(br, sin)
    revisar(pg3)
    ok("la revisión se ve igual", "habla en adjetivos" in pg3.inner_text("#rev-salida"))
    ok("avisa que no se está guardando",
       "no se están guardando" in pg3.inner_text("#rev-guardadas"), pg3.inner_text("#rev-guardadas"))
    ok("sin errores de JS", not errs3, errs3)
    ctx3.close()

    print("\n9 · «EVIDENCIA» EXPLICA QUÉ SE ESPERA")
    base2 = Base()
    ctx4, pg4, errs4 = abrir(br, base2)
    pg4.evaluate("location.hash='#proyectos'"); pg4.wait_for_timeout(400)
    guia = pg4.inner_text(".evidencia-guia")
    ok("dice que va un enlace y no un archivo", "Va un enlace, no un archivo" in guia)
    ok("contesta qué hacer con un archivo del computador",
       "archivo en mi computador" in guia)
    ok("explica cómo convertirlo en enlace", "OneDrive institucional" in guia)
    ok("advierte del enlace cerrado", "incógnito" in guia)
    ok("y de los datos de terceros", "paciente" in guia)
    ok("el campo ya no promete archivos", pg4.evaluate(
       """document.querySelector('#proyectos-wrap .p-evidencia').placeholder.indexOf('archivo') === -1"""),
       pg4.evaluate("document.querySelector('#proyectos-wrap .p-evidencia').placeholder"))
    ok("la etiqueta lo dice también", pg4.evaluate(
       """(function(){var f=document.querySelector('[data-campo=evidencia] label');
          return f ? f.textContent : '';})()""").find("enlace") > -1)
    ok("sin errores de JS", not errs4, errs4)
    pg4.evaluate("document.querySelector('.evidencia-guia').scrollIntoView()")
    pg4.wait_for_timeout(300)
    pg4.screenshot(path="/tmp/evidencia.png")
    ctx4.close()

    br.close()

print("\n" + "=" * 54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
