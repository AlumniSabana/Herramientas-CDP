# ══════════════════════════════════════════════════════════════
#  EL COMPUTADOR COMPARTIDO
#
#  El caso que esta suite protege: alguien escribe en un equipo del
#  campus sin haber entrado y se va; el siguiente llega y abre su
#  cuenta. Nada de lo que escribió el primero puede aparecer en la
#  pantalla del segundo, ni acabar en su portafolio.
#
#  Antes el borrador vivía en localStorage y la protección era una
#  llave por cuenta. Ahora el portafolio vive en Supabase, así que la
#  protección es otra: lo que hay en el navegador se ofrece, se
#  describe y no se enseña hasta que alguien dice que es suyo.
#
#  Uso:  python3 pruebas/aislamiento-por-cuenta.py
#  Necesita un servidor estático sobre la raíz del repositorio:
#    python3 -m http.server 8941
# ══════════════════════════════════════════════════════════════
import json
from playwright.sync_api import sync_playwright

PORT = "http://127.0.0.1:8941/portafolio-alumni-sabana.html"
SB   = "https://vfuexivozypglggxpqsy.supabase.co"
LLAVE = "alumni-portafolio:v1"
fallos = []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

ANA = {"token":"t","refresh":"r","correo":"ana@unisabana.edu.co","nombre":"Ana Pérez",
       "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","rol":"usuario","id":"u-ana"}
CDP = {"token":"t","refresh":"r","correo":"cdp@unisabana.edu.co","nombre":"Desarrollo Profesional",
       "facultad":"Otra / no está en la lista","programa":"Otro programa","rol":"admin","id":"u-cdp"}

BORRADOR = {"campos": {"f-nombre": "Borrador de quien pasó antes",
                       "f-valor": "Algo privado que escribió otra persona"},
            "proyectos": [], "check": {}}

escrituras = []

def montar(ctx):
    """Una cuenta vacía en el servidor: nadie tiene portafolio."""
    def ruta(route):
        u, m = route.request.url, route.request.method
        if "/rest/v1/" in u:
            if m == "GET":
                return route.fulfill(status=200, content_type="application/json", body="[]")
            escrituras.append((m, u.split("/rest/v1/")[1].split("?")[0],
                               route.request.post_data or ""))
            if m == "POST":
                return route.fulfill(status=201, content_type="application/json",
                                     body=json.dumps([{"id": "x-1"}]))
            return route.fulfill(status=204, body="")
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

def abrir(br):
    ctx = br.new_context(viewport={"width":1440,"height":950})
    montar(ctx)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(PORT); pg.wait_for_timeout(700)
    return ctx, pg, errs

def entrar(pg, sesion):
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(sesion)))
    pg.reload(); pg.wait_for_timeout(1800)

def salir(pg):
    pg.evaluate("sessionStorage.removeItem('alumni-cdp:sesion')")
    pg.reload(); pg.wait_for_timeout(1500)

def nombre(pg):
    pg.evaluate("location.hash='#identidad'"); pg.wait_for_timeout(250)
    return pg.input_value("#f-nombre")

def llaves(pg):
    return pg.evaluate("Object.keys(localStorage).filter(k=>k.indexOf('alumni-portafolio')===0).sort()")


with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    print("\n1 · SIN CUENTA, EL BORRADOR ES DEL NAVEGADOR")
    ctx, pg, errs = abrir(br)
    pg.evaluate("location.hash='#identidad'"); pg.wait_for_timeout(300)
    pg.fill("#f-nombre", "Borrador de quien pasó antes")
    pg.wait_for_timeout(1000)
    ok("se guarda en el cajón sin cuenta",
       any(k.endswith(":anon") for k in llaves(pg)), llaves(pg))
    ok("no se escribió nada en el servidor", not escrituras, escrituras)

    print("\n2 · QUIEN ENTRA DESPUÉS NO LO VE")
    del escrituras[:]
    entrar(pg, ANA)
    ok("el formulario está en blanco", nombre(pg) == "", repr(nombre(pg)))
    aviso = pg.inner_text("#nube-aviso")
    ok("pero se le ofrece", "¿Quieres sincronizarla con tu cuenta?" in aviso, aviso[:70])
    ok("describiendo cuánto hay, no qué dice",
       "un campo escrito" in aviso and "quien pasó antes" not in aviso, aviso)
    ok("y nada se ha subido a su cuenta",
       not [e for e in escrituras if "quien pasó antes" in (e[2] or "")], escrituras)
    ok("sin errores de JS", not errs, errs)

    print("\n3 · SI DICE QUE NO, NO SE LE VUELVE A PREGUNTAR")
    pg.evaluate("""(function(){
        var bs = document.querySelectorAll('#nube-aviso button');
        bs[bs.length - 1].click();
    })()""")
    pg.wait_for_timeout(600)
    ok("la banda desaparece", pg.query_selector("#nube-aviso").is_hidden())
    ok("queda constancia de la negativa",
       any(k.endswith(":sin-migrar") for k in llaves(pg)), llaves(pg))
    entrar(pg, ANA)
    ok("al volver a entrar no insiste", pg.query_selector("#nube-aviso").is_hidden(),
       pg.inner_text("#nube-aviso"))
    ok("y el formulario sigue en blanco", nombre(pg) == "", repr(nombre(pg)))

    print("\n4 · CADA CUENTA ABRE LA SUYA, NO LA DEL ANTERIOR")
    pg.evaluate("location.hash='#identidad'"); pg.wait_for_timeout(250)
    pg.fill("#f-nombre", "Lo que escribió Ana")
    pg.wait_for_timeout(3200)
    entrar(pg, CDP)
    ok("el Centro no ve lo de Ana", nombre(pg) == "", repr(nombre(pg)))
    # Si se le ofrece algo es el cajón sin cuenta, nunca el de otra
    # cuenta: el borrador de Ana sigue guardado bajo su identificador
    # y ni se enseña ni se ofrece.
    ok("nunca se le ofrece el borrador de otra cuenta",
       "Lo que escribió Ana" not in pg.inner_text("#nube-aviso"), pg.inner_text("#nube-aviso"))
    ok("y el de Ana sigue intacto donde estaba", pg.evaluate(
       "(localStorage.getItem('alumni-portafolio:v1:u-ana')||'').indexOf('Lo que escribi')>-1"))

    print("\n5 · AL SALIR NO SE QUEDA NADA EN PANTALLA")
    pg.evaluate("location.hash='#identidad'"); pg.wait_for_timeout(250)
    pg.fill("#f-nombre", "Lo que escribió el Centro")
    pg.wait_for_timeout(3200)
    salir(pg)
    tras = nombre(pg)
    ok("no se queda el texto de la cuenta anterior", tras != "Lo que escribió el Centro", repr(tras))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n6 · UN BORRADOR ANTIGUO NO SE LE ADJUDICA A NADIE")
    # Antes de que existiera el guardado por cuenta había una sola
    # llave común. No puede acabar dentro de la cuenta de quien pase.
    ctx2 = br.new_context(viewport={"width":1440,"height":950})
    montar(ctx2)
    pg2 = ctx2.new_page(); errs2 = []
    pg2.on("pageerror", lambda e: errs2.append(str(e)))
    pg2.goto(PORT); pg2.wait_for_timeout(600)
    pg2.evaluate("localStorage.setItem(%s, %s)" % (json.dumps(LLAVE), json.dumps(json.dumps(BORRADOR))))
    entrar(pg2, CDP)
    ok("la cuenta que entra NO lo hereda", nombre(pg2) == "", repr(nombre(pg2)))
    ok("la llave común desapareció",
       pg2.evaluate("localStorage.getItem(%s) === null" % json.dumps(LLAVE)))
    ok("se movió al cajón sin cuenta",
       pg2.evaluate("(localStorage.getItem('alumni-portafolio:v1:anon')||'').indexOf('Borrador de quien pas')>-1"),
       llaves(pg2))
    ok("sin errores de JS", not errs2, errs2)
    ctx2.close()

    br.close()

print("\n" + "=" * 54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
