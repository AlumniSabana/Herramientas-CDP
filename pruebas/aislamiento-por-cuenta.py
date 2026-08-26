import json
from playwright.sync_api import sync_playwright

PORT = "http://127.0.0.1:8941/portafolio-alumni-sabana.html"
SB = "https://vfuexivozypglggxpqsy.supabase.co"
fallos = []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

ANA  = {"token":"t","refresh":"r","correo":"ana@unisabana.edu.co","nombre":"Ana Pérez",
        "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","rol":"usuario","id":"u-ana"}
CDP  = {"token":"t","refresh":"r","correo":"cdp@unisabana.edu.co","nombre":"Desarrollo Profesional",
        "facultad":"Otra / no está en la lista","programa":"Otro programa","rol":"admin","id":"u-cdp"}

def montar(ctx):
    ctx.route(SB + "/**", lambda r: r.fulfill(status=200, content_type="application/json", body="{}"))

def entrar(pg, sesion):
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(sesion)))
    pg.reload(); pg.wait_for_timeout(1100)

def salir(pg):
    pg.evaluate("sessionStorage.removeItem('alumni-cdp:sesion')")
    pg.reload(); pg.wait_for_timeout(1100)

def escribir(pg, texto):
    pg.evaluate("location.hash='#identidad'"); pg.wait_for_timeout(300)
    pg.fill("#f-nombre", texto)
    pg.wait_for_timeout(900)   # el guardado va con 500 ms de retraso

def leer(pg):
    pg.evaluate("location.hash='#identidad'"); pg.wait_for_timeout(250)
    return pg.input_value("#f-nombre")

def llaves(pg):
    return pg.evaluate("""Object.keys(localStorage).filter(k=>k.indexOf('alumni-portafolio')===0).sort()""")

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    ctx = br.new_context(viewport={"width":1440,"height":950}); montar(ctx)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(PORT); pg.wait_for_timeout(1000)

    print("\n1 · CADA CUENTA TIENE SU BORRADOR")
    entrar(pg, ANA)
    escribir(pg, "Borrador de Ana")
    ok("Ana escribe y se guarda", leer(pg) == "Borrador de Ana")
    ok("la llave lleva su identificador", any("u-ana" in k for k in llaves(pg)), llaves(pg))

    entrar(pg, CDP)
    ok("el CDP NO ve el borrador de Ana", leer(pg) == "", repr(leer(pg)))
    escribir(pg, "Borrador del Centro")
    ok("el CDP escribe el suyo", leer(pg) == "Borrador del Centro")
    ok("ahora hay dos llaves separadas", len(llaves(pg)) >= 2, llaves(pg))

    entrar(pg, ANA)
    ok("Ana recupera el suyo intacto", leer(pg) == "Borrador de Ana", repr(leer(pg)))
    ok("y no ve el del Centro", leer(pg) != "Borrador del Centro")
    ok("sin errores de JS", not errs, errs)

    print("\n2 · SIN CUENTA TAMBIÉN ES SU PROPIO CAJÓN")
    salir(pg)
    ok("sin sesión no se ve el de nadie", leer(pg) == "", repr(leer(pg)))
    escribir(pg, "Borrador sin cuenta")
    ok("se guarda aparte", any(k.endswith(":anon") for k in llaves(pg)), llaves(pg))
    entrar(pg, ANA)
    ok("Ana sigue viendo solo el suyo", leer(pg) == "Borrador de Ana", repr(leer(pg)))

    print("\n3 · CAMBIAR DE CUENTA NO CONTAMINA")
    # Se entra como CDP y se escribe de inmediato, sin recargar:
    # es el caso que antes guardaba el texto ajeno bajo la llave nueva.
    pg.evaluate("Cuenta.salir()"); pg.wait_for_timeout(700)
    # Al salir se pasa a ser anónimo, así que aparece el cajón sin
    # cuenta. Lo que NO puede pasar es que se quede el de Ana.
    tras = leer(pg)
    ok("al salir NO se queda el borrador de Ana", tras != "Borrador de Ana", repr(tras))
    ok("aparece el cajón sin cuenta", tras == "Borrador sin cuenta", repr(tras))
    pg.evaluate("""(function(){
        Cuenta.sesion = %s; Cuenta.pintar();
        if (typeof avisarCambio === 'function') avisarCambio();
    })()""" % json.dumps(CDP))
    pg.wait_for_timeout(800)
    ok("al entrar en caliente aparece el del Centro",
       leer(pg) == "Borrador del Centro", repr(leer(pg)))
    guardado = pg.evaluate("""(function(){
        var k = Object.keys(localStorage).filter(x=>x.indexOf('u-ana')>-1)[0];
        return k ? JSON.parse(localStorage.getItem(k)).campos['f-nombre'] : null;
    })()""")
    ok("el de Ana no se sobreescribió", guardado == "Borrador de Ana", repr(guardado))
    ok("sin errores de JS", not errs, errs)

    print("\n4 · UN BORRADOR ANTIGUO NO SE LE ADJUDICA A NADIE")
    ctx2 = br.new_context(viewport={"width":1440,"height":950}); montar(ctx2)
    pg2 = ctx2.new_page(); errs2 = []; pg2.on("pageerror", lambda e: errs2.append(str(e)))
    pg2.goto(PORT); pg2.wait_for_timeout(600)
    # Se simula el estado anterior al arreglo: una sola llave común
    pg2.evaluate("""localStorage.setItem('alumni-portafolio:v1',
        JSON.stringify({campos:{'f-nombre':'Borrador huérfano'},proyectos:[],check:{}}))""")
    pg2.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(CDP)))
    pg2.reload(); pg2.wait_for_timeout(1200)
    ok("la cuenta que entra NO lo hereda", leer(pg2) == "", repr(leer(pg2)))
    ok("la llave común desapareció",
       pg2.evaluate("localStorage.getItem('alumni-portafolio:v1') === null"))
    ok("se movió al cajón sin cuenta",
       pg2.evaluate("""(localStorage.getItem('alumni-portafolio:v1:anon')||'').indexOf('huérfano')>-1"""),
       pg2.evaluate("Object.keys(localStorage).filter(k=>k.indexOf('alumni-portafolio')===0)"))
    pg2.evaluate("sessionStorage.removeItem('alumni-cdp:sesion')")
    pg2.reload(); pg2.wait_for_timeout(1100)
    ok("y ahí sí se recupera sin cuenta", leer(pg2) == "Borrador huérfano", repr(leer(pg2)))
    ok("sin errores de JS", not errs2, errs2)
    ctx2.close()

    print("\n5 · «EMPEZAR DE NUEVO» SOLO BORRA EL PROPIO")
    pg.evaluate("window.confirm = function(){ return true; }")
    pg.evaluate("location.hash='#checklist'"); pg.wait_for_timeout(400)
    pg.evaluate("document.getElementById('reset').click()"); pg.wait_for_timeout(900)
    ok("el del Centro queda vacío", leer(pg) == "", repr(leer(pg)))
    otro = pg.evaluate("""(function(){
        var k = Object.keys(localStorage).filter(x=>x.indexOf('u-ana')>-1)[0];
        return k ? JSON.parse(localStorage.getItem(k)).campos['f-nombre'] : null;
    })()""")
    ok("el de Ana sigue ahí", otro == "Borrador de Ana", repr(otro))
    ok("sin errores de JS", not errs, errs)
    ctx.close()
    br.close()

print("\n" + "="*54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
