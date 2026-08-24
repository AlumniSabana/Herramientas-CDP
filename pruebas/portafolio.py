import json, re, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8911/"
SB   = "https://vfuexivozypglggxpqsy.supabase.co"
fallos = []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

def montar(ctx, traduccion="Translated text here."):
    def ruta(route):
        u = route.request.url
        if "/functions/v1/traducir" in u:
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps({"texto": traduccion}))
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

SESION = {"token":"tok","refresh":"ref","correo":"ana@unisabana.edu.co","nombre":"Ana Prueba",
          "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial",
          "rol":"usuario","id":"u-1"}

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    # ══════ SIN SESIÓN ══════
    print("\n1 · SIN SESIÓN")
    ctx = br.new_context(viewport={"width":1440,"height":950}); montar(ctx); pg = ctx.new_page()
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "portafolio-alumni-sabana.html"); pg.wait_for_timeout(800)
    pg.evaluate("location.hash='#programa'"); pg.wait_for_timeout(400)
    sel = pg.query_selector("#f-programa")
    ok("el programa se puede elegir", sel.get_attribute("aria-readonly") in (None, "false"))
    ok("el programa arranca vacío", sel.input_value() == "")
    ok("no dice «Completo»", "Completo" not in pg.inner_html("#programa"))
    ok("la zona de cuenta remite a la portada", "portada" in pg.inner_text("#zona-cuenta"),
       pg.inner_text("#zona-cuenta"))
    ok("sin errores de JS", not errs, errs)

    # ══════ ANCHOS ══════
    print("\n2 · ANCHO DE LOS PÁRRAFOS")
    pg.evaluate("location.hash='#que-es'"); pg.wait_for_timeout(400)
    hoja = pg.evaluate("document.querySelector('#que-es').getBoundingClientRect().width")
    anchos = pg.evaluate("""Array.from(document.querySelectorAll('#que-es p.prose'))
        .map(e => Math.round(e.getBoundingClientRect().width))""")
    tabla = pg.evaluate("document.querySelector('#que-es table').getBoundingClientRect().width")
    ok("la hoja usa el ancho disponible", hoja > 1000, "%.0f px" % hoja)
    ok("los párrafos llegan al borde de la hoja",
       all(abs(a - hoja) < 3 for a in anchos), "hoja %.0f · párrafos %s" % (hoja, anchos))
    ok("la tabla también", abs(tabla - hoja) < 3, "%.0f px" % tabla)

    print("\n3 · SIN GUIONES LARGOS")
    txt = pg.evaluate("document.body.innerText")
    ok("ningún guión largo en la página", "—" not in txt and "–" not in txt,
       [l for l in txt.split("\n") if "—" in l or "–" in l][:3])

    print("\n4 · EL BOTÓN «FIN» YA NO ESTÁ")
    pg.evaluate("location.hash='#asesoria'"); pg.wait_for_timeout(400)
    ok("no existe ningún botón «Fin»",
       pg.evaluate("""!Array.from(document.querySelectorAll('.pager button'))
           .some(b => b.textContent.trim() === 'Fin')"""))
    ok("no queda ningún botón desactivado en la última hoja",
       pg.evaluate("""(function(){var h=document.querySelector('#asesoria .pager');
           return h ? !h.querySelector('button[disabled]') : false})()"""))
    ok("«Anterior» sigue ahí", pg.evaluate(
       """document.querySelector('#asesoria .pager button').textContent.indexOf('Anterior')>-1"""))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    # ══════ CON SESIÓN ══════
    print("\n5 · CON SESIÓN: PROGRAMA TOMADO DE LA CUENTA")
    ctx = br.new_context(viewport={"width":1440,"height":950}); montar(ctx)
    ctx.add_init_script("try{ Object.defineProperty(window, 'Translator', {get:function(){return undefined}, configurable:true}); }catch(e){}")
    pg = ctx.new_page()
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "portafolio-alumni-sabana.html")
    pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(SESION)))
    pg.goto(BASE + "portafolio-alumni-sabana.html"); pg.wait_for_timeout(900)
    pg.evaluate("location.hash='#programa'"); pg.wait_for_timeout(500)
    sel = pg.query_selector("#f-programa")
    ok("el programa viene relleno", sel.input_value().endswith("Ingeniería Industrial"),
       sel.input_value())
    ok("la facultad viene rellena",
       pg.input_value("#f-facultad") == "Facultad de Ingeniería", pg.input_value("#f-facultad"))
    ok("la facultad se ve", pg.query_selector("#facultad-wrap").is_visible())
    ok("dice «Completo» en el programa", "Completo" in pg.inner_html("#programa"))
    ok("dice «Completo» en la facultad", "Completo" in pg.inner_html("#facultad-wrap"))
    ok("queda bloqueado", sel.get_attribute("aria-readonly") == "true")
    antes = sel.input_value()
    pg.click("#f-programa"); pg.wait_for_timeout(200)
    pg.keyboard.press("ArrowDown"); pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(200)
    ok("el teclado no lo cambia", sel.input_value() == antes, sel.input_value())
    ok("la cabecera muestra el nombre", "Ana Prueba" in pg.inner_text("#zona-cuenta"))
    ok("el contenido se adaptó al programa",
       "ingenier" in pg.inner_text("#adapt-intro").lower(), pg.inner_text("#adapt-intro")[:70])
    ok("sin errores de JS", not errs, errs)

    print("\n6 · TRADUCCIÓN CON IA")
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(500)
    ok("el navegador de prueba no trae traductor",
       pg.evaluate("typeof Translator === 'undefined'"))
    ok("aun así hay traductor disponible", pg.evaluate("Traductor.hayAlguna()"))
    ok("es el respaldo con IA", pg.evaluate("Traductor.hayIA() && !Traductor.disponible()"))
    pg.evaluate("""(function(){
        var fs = document.querySelector('#proyectos-wrap fieldset');
        var v = {'p-titulo':'Rediseño de la línea de empaque',
                 'p-contexto':'La línea tenía una parada diaria que frenaba el turno completo de la mañana en planta',
                 'p-objetivo':'Reducir las paradas no programadas de la línea principal',
                 'p-rol':'Levanté el diagnóstico, medí los tiempos y propuse el cambio de secuencia',
                 'p-acciones':'Medí ciclos durante dos semanas, comparé tres secuencias posibles y decidí cambiar el orden de las estaciones',
                 'p-resultado':'Las paradas bajaron y el turno terminó a tiempo durante todo el mes siguiente',
                 'p-evidencia':'Informe interno'};
        Object.keys(v).forEach(function(c){ var el=fs.querySelector('.'+c); if(el){ el.value=v[c];
          el.dispatchEvent(new Event('input',{bubbles:true})); } });
    })()""")
    pg.wait_for_timeout(400)
    pg.evaluate("""document.querySelector('#proyectos-wrap fieldset .trad-btn').click()""")
    pg.wait_for_timeout(1200)
    salida = pg.evaluate("""(function(){var s=document.querySelector('#proyectos-wrap fieldset .trad-salida');
        return {oculta:s.hidden, txt:(s.querySelector('.trad-texto')||{}).textContent||''}})()""")
    ok("muestra la traducción", not salida["oculta"] and "Translated text here." in salida["txt"],
       salida)
    ok("dice que es automática",
       "autom" in pg.inner_text("#proyectos-wrap fieldset .trad-nota").lower(),
       pg.inner_text("#proyectos-wrap fieldset .trad-nota"))
    ok("sin errores de JS", not errs, errs)

    print("\n7 · AL SALIR, EL PROGRAMA VUELVE A SER EDITABLE")
    pg.evaluate("Cuenta.salir()"); pg.wait_for_timeout(500)
    pg.evaluate("location.hash='#programa'"); pg.wait_for_timeout(400)
    ok("se puede volver a elegir",
       pg.query_selector("#f-programa").get_attribute("aria-readonly") == "false")
    ok("ya no dice «Completo»", "Completo" not in pg.inner_html("#programa"))
    ok("sin errores de JS", not errs, errs)
    pg.screenshot(path="/tmp/port-ancho.png", full_page=False)
    ctx.close()
    br.close()

print("\n" + "="*54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
