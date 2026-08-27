import json
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8911/portafolio-alumni-sabana.html"
SB   = "https://vfuexivozypglggxpqsy.supabase.co"
fallos, enviado = [], []

def ok(n, c, extra=""):
    print(("  OK   " if c else "  FALLA") + "  " + n + (("  → " + str(extra)) if extra else ""))
    if not c: fallos.append(n)

SESION = {"token":"tok","refresh":"ref","correo":"ana@unisabana.edu.co","nombre":"Ana Prueba",
          "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","rol":"usuario","id":"u-1"}

RESPUESTA = {
  "veredicto": "El portafolio tiene una ficha sólida y un perfil que todavía habla en adjetivos.",
  "listo": False,
  "proyectos": [
    {"ficha": 1, "titulo": "Rediseño de la línea de empaque", "estado": "mejorable",
     "observaciones": [
       "Dices «las paradas bajaron». ¿De cuánto a cuánto, o al menos durante cuántos turnos lo mediste?",
       "En el rol escribes «levanté el diagnóstico». ¿Con qué método, y quién más participaba?"]},
    {"ficha": 2, "titulo": "Control de inventario", "estado": "insuficiente",
     "observaciones": ["La evidencia dice «informe interno», que el lector no puede abrir."]}
  ],
  "secciones": [
    {"nombre": "Perfil profesional", "estado": "insuficiente",
     "observaciones": ["«Proactivo y con trabajo en equipo» no son capacidades demostrables."]},
    {"nombre": "Contacto", "estado": "solido", "observaciones": ["Correo y LinkedIn, suficiente."]}
  ],
  "prioridad": "Ponle una cifra o un hecho verificable al resultado de la ficha 1."
}

def montar(ctx, estado=200, cuerpo=None):
    def ruta(route):
        u = route.request.url
        if "/functions/v1/revisar-portafolio" in u:
            enviado.append(json.loads(route.request.post_data))
            return route.fulfill(status=estado, content_type="application/json",
                                 body=json.dumps(cuerpo if cuerpo is not None else RESPUESTA))
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

FICHAS = """(function(){
  var fss = document.querySelectorAll('#proyectos-wrap fieldset');
  var datos = [
   {'p-titulo':'Rediseño de la línea de empaque',
    'p-contexto':'La línea tenía una parada diaria que frenaba el turno completo de la mañana en planta',
    'p-objetivo':'Reducir las paradas no programadas de la línea principal',
    'p-rol':'Levanté el diagnóstico, medí los tiempos y propuse el cambio de secuencia',
    'p-acciones':'Medí ciclos durante dos semanas seguidas, comparé tres secuencias posibles y decidí cambiar el orden de las estaciones',
    'p-resultado':'Las paradas bajaron y el turno terminó a tiempo durante todo el mes siguiente',
    'p-evidencia':'Informe interno'}];
  datos.forEach(function(v,i){ var fs=fss[i]; if(!fs) return;
    Object.keys(v).forEach(function(c){ var el=fs.querySelector('.'+c); if(el){ el.value=v[c];
      el.dispatchEvent(new Event('input',{bubbles:true})); } }); });
})()"""

def abrir(br, sesion=True, **kw):
    ctx = br.new_context(viewport={"width":1440,"height":1000}); montar(ctx, **kw)
    pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE)
    if sesion:
        pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(SESION)))
        pg.goto(BASE);
    pg.wait_for_timeout(900)
    return ctx, pg, errs

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    print("\n1 · LA REVISIÓN VIVE EN «ANTES DE PUBLICAR»")
    ctx, pg, errs = abrir(br, sesion=False)
    ok("el bloque está en la hoja del checklist",
       pg.evaluate("!!document.querySelector('#checklist #revision')"))
    ok("está debajo de la lista de verificación", pg.evaluate(
       """(function(){var c=document.querySelector('#check'),r=document.querySelector('#revision');
          return c.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING ? true:false})()"""))
    ok("dice que no reescribe el texto",
       "No reescribe tu texto" in pg.inner_text("#revision"))
    print("\n2 · SIN SESIÓN")
    ok("el botón está desactivado", pg.query_selector("#rev-pedir").is_disabled())
    ok("explica que hace falta la cuenta", "cuenta abierta" in pg.inner_text("#rev-nota"),
       pg.inner_text("#rev-nota"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n3 · CON SESIÓN, PORTAFOLIO VACÍO")
    ctx, pg, errs = abrir(br)
    del enviado[:]
    ok("el botón se activa", not pg.query_selector("#rev-pedir").is_disabled())
    ok("advierte qué se envía", "no tu nombre" in pg.inner_text("#rev-nota"), pg.inner_text("#rev-nota"))
    ok("la hoja ni siquiera es alcanzable sin una ficha completa",
       pg.evaluate("location.hash='#checklist'") is not None and
       pg.evaluate("!document.querySelector('#checklist').offsetParent"))
    pg.evaluate("document.getElementById('rev-pedir').click()"); pg.wait_for_timeout(600)
    ok("no llama al servicio con el portafolio vacío", not enviado)
    ok("dice qué falta", "bastante escrito" in pg.inner_text("#rev-nota"), pg.inner_text("#rev-nota"))
    ctx.close()

    print("\n4 · REVISIÓN COMPLETA")
    ctx, pg, errs = abrir(br)
    del enviado[:]
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(300)
    pg.evaluate(FICHAS); pg.wait_for_timeout(400)
    pg.evaluate("location.hash='#checklist'"); pg.wait_for_timeout(400)
    pg.click("#rev-pedir"); pg.wait_for_timeout(1400)

    ok("llamó al servicio una vez", len(enviado) == 1, len(enviado))
    env = enviado[0] if enviado else {}
    ok("envió el contexto del programa",
       env.get("contexto", {}).get("programa") == "Ingeniería Industrial",
       env.get("contexto"))
    ok("envió las fichas", len(env.get("proyectos", [])) == 1, len(env.get("proyectos", [])))
    ok("envió el portafolio completo", "Perfil profesional" in env.get("portafolio", ""))
    ok("NO envió el nombre ni el correo de la cuenta",
       "ana@unisabana.edu.co" not in json.dumps(env) and "Ana Prueba" not in json.dumps(env))

    salida = pg.inner_text("#rev-salida")
    ok("la salida es visible", not pg.query_selector("#rev-salida").is_hidden())
    ok("muestra el veredicto", "habla en adjetivos" in salida)
    ok("las fichas van primero", pg.evaluate(
       """(function(){var g=document.querySelectorAll('#rev-salida .rev-grupo .eyebrow');
          return g.length>=2 && g[0].textContent.indexOf('ficha')>-1})()"""),
       pg.evaluate("""Array.from(document.querySelectorAll('#rev-salida .eyebrow')).map(e=>e.textContent)"""))
    ok("muestra las dos fichas", salida.count("Ficha ") == 2, salida.count("Ficha "))
    # La función del servidor manda «mejorable» e «insuficiente» a
    # propósito en este montaje: son los nombres antiguos. La interfaz
    # tiene que traducirlos, porque la Edge Function puede tardar en
    # actualizarse y nadie debe ver una revisión rota mientras tanto.
    ok("traduce los estados antiguos", "POR DESARROLLAR" in salida.upper() and "POR AFINAR" in salida.upper(),
       salida.upper()[:200])
    ok("no llama insuficiente a nadie", "INSUFICIENTE" not in salida.upper())
    ok("muestra las observaciones", "¿De cuánto a cuánto" in salida)
    ok("muestra las secciones", "Perfil profesional" in salida and "Contacto" in salida)
    ok("muestra la prioridad", "SOLO ARREGLAS UNA COSA" in salida.upper() and "cifra o un hecho verificable" in salida)
    ok("recuerda que lo escribió una máquina", "no conoce tu trabajo" in salida)
    ok("el botón invita a repetir", pg.inner_text("#rev-pedir").strip() == "Revisar otra vez")
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n5 · ERRORES DEL SERVICIO")
    ctx, pg, errs = abrir(br, estado=503, cuerpo={"error":"El servicio de revisión no tiene configurada la clave del proveedor."})
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(300)
    pg.evaluate(FICHAS); pg.wait_for_timeout(300)
    pg.evaluate("location.hash='#checklist'"); pg.wait_for_timeout(300)
    pg.click("#rev-pedir"); pg.wait_for_timeout(1200)
    ok("explica el fallo", "clave del proveedor" in pg.inner_text("#rev-nota"), pg.inner_text("#rev-nota"))
    ok("el botón vuelve a estar disponible", not pg.query_selector("#rev-pedir").is_disabled())
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n6 · RESPUESTA SIN FORMATO (salida de emergencia)")
    ctx, pg, errs = abrir(br, cuerpo={"crudo":"El portafolio va bien pero falta cifra en la ficha 1."})
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(300)
    pg.evaluate(FICHAS); pg.wait_for_timeout(300)
    pg.evaluate("location.hash='#checklist'"); pg.wait_for_timeout(300)
    pg.click("#rev-pedir"); pg.wait_for_timeout(1200)
    ok("muestra el texto igualmente", "falta cifra en la ficha 1" in pg.inner_text("#rev-salida"))
    ok("sin errores de JS", not errs, errs)
    pg.screenshot(path="/tmp/rev.png", full_page=False)
    ctx.close()

    print("\n7 · CAPTURA DE LA REVISIÓN COMPLETA")
    ctx, pg, errs = abrir(br)
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(300)
    pg.evaluate(FICHAS); pg.wait_for_timeout(300)
    pg.evaluate("location.hash='#checklist'"); pg.wait_for_timeout(300)
    pg.click("#rev-pedir"); pg.wait_for_timeout(1400)
    pg.evaluate("document.querySelector('#revision').scrollIntoView()")
    pg.wait_for_timeout(300)
    pg.screenshot(path="/tmp/rev.png")
    ok("captura guardada", True)
    ctx.close()
    br.close()

print("\n" + "="*54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
