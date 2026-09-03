# ══════════════════════════════════════════════════════════════
#  EL PORTAFOLIO SE GUARDA EN LA CUENTA, NO EN EL NAVEGADOR
#
#  Monta un PostgREST de mentira sobre las cuatro tablas reales
#  (portafolios, proyectos, secciones_portafolio, revisiones_ia) y
#  comprueba el ciclo entero: cargar, escribir, migrar lo que había
#  en el navegador, cambiar de cuenta, abrir desde otro equipo y
#  fallar sin romper nada.
#
#  Uso:  python3 pruebas/portafolio-en-la-cuenta.py
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

ANA  = {"token":"tok","refresh":"ref","correo":"ana@unisabana.edu.co","nombre":"Ana Prueba",
        "facultad":"Facultad de Ingeniería","programa":"Ingeniería Industrial","rol":"usuario","id":"u-ana"}
LUIS = {"token":"tok","refresh":"ref","correo":"luis@unisabana.edu.co","nombre":"Luis Prueba",
        "facultad":"Facultad de Derecho","programa":"Derecho","rol":"usuario","id":"u-luis"}


class Base:
    """Las cuatro tablas, con el filtrado que de verdad hace PostgREST.

    El filtro importa: comprobar que cada cuenta ve solo lo suyo no
    vale nada si el doble del servidor devuelve todas las filas."""

    def __init__(self, caido=False):
        self.portafolios = []
        self.proyectos = []
        self.secciones = []
        self.revisiones = []
        self.caido = caido          # True = Supabase no responde
        self.n = 0
        self.peticiones = []        # (metodo, tabla) de todo lo que se pidió

    def _id(self, pre):
        self.n += 1
        return "%s-%d" % (pre, self.n)

    def tabla(self, nombre):
        return {"portafolios": self.portafolios, "proyectos": self.proyectos,
                "secciones_portafolio": self.secciones,
                "revisiones_ia": self.revisiones}[nombre]

    @staticmethod
    def _filtro(url, campo):
        # Anclado al separador: «id=eq.» es sufijo de «usuario_id=eq.»
        # y sin esto un filtro por usuario se leía como filtro por id.
        for marca in ("?" + campo + "=eq.", "&" + campo + "=eq."):
            if marca in url:
                return url.split(marca)[1].split("&")[0]
        return None

    def leer(self, nombre, url):
        filas = self.tabla(nombre)
        for campo in ("usuario_id", "portafolio_id", "id"):
            v = self._filtro(url, campo)
            if v is not None:
                filas = [f for f in filas if str(f.get(campo)) == v]
        if "order=orden.asc" in url:
            filas = sorted(filas, key=lambda f: f.get("orden") or 0)
        return filas

    def insertar(self, nombre, cuerpo, url):
        filas = self.tabla(nombre)
        cuerpo = dict(cuerpo)

        # upsert sobre usuario_id, igual que on_conflict=usuario_id
        if "on_conflict=usuario_id" in url:
            for f in filas:
                if f.get("usuario_id") == cuerpo.get("usuario_id"):
                    f.update(cuerpo)
                    return [f]

        cuerpo.setdefault("id", self._id(nombre[:4]))
        cuerpo.setdefault("creado_en", "2026-08-27T09:00:00")
        filas.append(cuerpo)
        return [cuerpo]

    def actualizar(self, nombre, cuerpo, url):
        for f in self.leer(nombre, url):
            f.update(cuerpo)

    def borrar(self, nombre, url):
        objetivo = self.leer(nombre, url)
        filas = self.tabla(nombre)
        for f in objetivo:
            filas.remove(f)
            # borrado en cascada, como las claves foráneas de verdad
            if nombre == "portafolios":
                self.proyectos = [x for x in self.proyectos if x.get("portafolio_id") != f["id"]]
                self.secciones = [x for x in self.secciones if x.get("portafolio_id") != f["id"]]
                self.revisiones = [x for x in self.revisiones if x.get("portafolio_id") != f["id"]]

    def seccion(self, tipo):
        for f in self.secciones:
            if f.get("tipo") == tipo: return f.get("contenido")
        return None


def montar(ctx, base):
    def ruta(route):
        u, m = route.request.url, route.request.method
        if "/rest/v1/" in u:
            nombre = u.split("/rest/v1/")[1].split("?")[0]
            if nombre in ("portafolios", "proyectos", "secciones_portafolio", "revisiones_ia"):
                base.peticiones.append((m, nombre))
                if base.caido:
                    return route.fulfill(status=503, content_type="application/json",
                                         body=json.dumps({"message": "servicio no disponible"}))
                if m == "GET":
                    return route.fulfill(status=200, content_type="application/json",
                                         body=json.dumps(base.leer(nombre, u)))
                if m == "POST":
                    filas = base.insertar(nombre, json.loads(route.request.post_data), u)
                    return route.fulfill(status=201, content_type="application/json",
                                         body=json.dumps(filas))
                if m == "PATCH":
                    base.actualizar(nombre, json.loads(route.request.post_data), u)
                    return route.fulfill(status=204, body="")
                if m == "DELETE":
                    base.borrar(nombre, u)
                    return route.fulfill(status=204, body="")
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)


def abrir(br, base, sesion=None, local=None, llave=None):
    ctx = br.new_context(viewport={"width":1440,"height":1000})
    montar(ctx, base)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE)
    if local is not None:
        pg.evaluate("localStorage.setItem(%s, %s)" %
                    (json.dumps(llave or "alumni-portafolio:v1:anon"), json.dumps(json.dumps(local))))
    if sesion:
        pg.evaluate("sessionStorage.setItem('alumni-cdp:sesion', %s)" % json.dumps(json.dumps(sesion)))
    pg.goto(BASE)
    pg.wait_for_timeout(2000)
    return ctx, pg, errs


BORRADOR = {
    "campos": {
        "f-nombre": "Ana Prueba",
        "f-valor": "Ayudo a plantas de alimentos a perder menos tiempo en cada turno.",
        "f-perfil": "Analizo procesos y propongo cambios medibles.",
        "f-correo": "ana@unisabana.edu.co",
        "f-etapa": "graduado",
        "f-objetivo": "empleo"
    },
    "proyectos": [{
        "titulo": "Rediseño de la línea de empaque",
        "contexto": "La línea tenía una parada diaria que frenaba el turno de la mañana",
        "objetivo": "Reducir las paradas no programadas",
        "rol": "Levanté el diagnóstico y propuse el cambio de secuencia",
        "acciones": "Medí ciclos dos semanas, comparé tres secuencias y cambié el orden",
        "herr": "Excel, cronómetro",
        "resultado": "Las paradas bajaron durante todo el mes siguiente",
        "evidencia": "https://ejemplo.org/informe (acceso público)",
        "competencias": "Análisis de procesos"
    }],
    "check": {}
}


def escribir(pg, campo, texto):
    pg.evaluate("location.hash='#identidad'"); pg.wait_for_timeout(250)
    pg.fill("#" + campo, texto)
    pg.wait_for_timeout(3200)     # 500 ms de local + 2500 de nube


with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    print("\n1 · SIN CUENTA NO SE TOCA SUPABASE")
    base = Base()
    ctx, pg, errs = abrir(br, base)
    escribir(pg, "f-nombre", "Sin cuenta")
    ok("no se pidió nada a las tablas del portafolio", not base.peticiones, base.peticiones)
    ok("se guardó en el navegador",
       pg.evaluate("!!localStorage.getItem('alumni-portafolio:v1:anon')"))
    ok("el chip lo dice", "navegador" in pg.inner_text("#guardado"), pg.inner_text("#guardado"))
    ok("no hay banda de aviso", pg.query_selector("#nube-aviso").is_hidden())
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n2 · CON CUENTA VACÍA SE OFRECE SUBIR LO DEL NAVEGADOR")
    base = Base()
    ctx, pg, errs = abrir(br, base, sesion=ANA, local=BORRADOR)
    aviso = pg.inner_text("#nube-aviso")
    ok("aparece la pregunta", not pg.query_selector("#nube-aviso").is_hidden())
    ok("con el texto acordado",
       "Encontramos información guardada en este dispositivo" in aviso and
       "¿Quieres sincronizarla con tu cuenta?" in aviso, aviso[:80])
    # No se enseña antes de que diga que es suyo: en un computador
    # compartido, lo del navegador pudo escribirlo otra persona.
    ok("NO se enseña el borrador antes de aceptar",
       pg.input_value("#f-nombre") == "", pg.input_value("#f-nombre"))
    ok("pero se dice cuánto hay",
       "ficha de proyecto" in aviso and "campos escritos" in aviso, aviso)
    ok("todavía no se ha subido nada", not base.portafolios, base.portafolios)

    print("\n3 · AL ACEPTAR, SUBE TODO Y BIEN REPARTIDO")
    pg.evaluate("""document.querySelector('#nube-aviso button.solid').click()""")
    pg.wait_for_timeout(2000)

    ok("se creó un portafolio", len(base.portafolios) == 1, len(base.portafolios))
    cab = base.portafolios[0] if base.portafolios else {}
    ok("atado a la cuenta", cab.get("usuario_id") == "u-ana", cab.get("usuario_id"))
    ok("el título es el nombre", cab.get("titulo") == "Ana Prueba", cab.get("titulo"))
    ok("guarda la etapa", cab.get("etapa") == "graduado", cab.get("etapa"))
    ok("guarda el objetivo", cab.get("objetivo") == "empleo", cab.get("objetivo"))

    ok("se creó una ficha", len(base.proyectos) == 1, len(base.proyectos))
    pr = base.proyectos[0] if base.proyectos else {}
    ok("cuelga del portafolio", pr.get("portafolio_id") == cab.get("id"))
    ok("«titulo» se guardó como «nombre»", pr.get("nombre") == "Rediseño de la línea de empaque")
    ok("«resultado» se guardó como «resultados»", "paradas bajaron" in (pr.get("resultados") or ""))
    ok("«herr» se guardó como «herramientas»", pr.get("herramientas") == "Excel, cronómetro")
    ok("«acciones» NO se perdió", "tres secuencias" in (pr.get("acciones") or ""), pr.get("acciones"))
    ok("«competencias» NO se perdió", pr.get("competencias") == "Análisis de procesos")
    ok("lleva su orden", pr.get("orden") == 0, pr.get("orden"))

    ok("el perfil fue a secciones", base.seccion("perfil") == "Analizo procesos y propongo cambios medibles.")
    ok("la propuesta de valor también", "perder menos tiempo" in (base.seccion("valor") or ""))
    ok("el correo también", base.seccion("correo") == "ana@unisabana.edu.co")
    ok("se guarda el programa en claro para el consolidado",
       (base.seccion("programa_nombre") or "") != "", base.seccion("programa_nombre"))
    ok("y la facultad", "Ingeniería" in (base.seccion("facultad") or ""), base.seccion("facultad"))
    ok("la lista de verificación cabe en una sección",
       base.seccion("_checklist") is not None)
    ok("no se crean filas para casillas vacías",
       base.seccion("testimonio") is None, base.seccion("testimonio"))

    ok("el cajón sin cuenta se retiró",
       pg.evaluate("localStorage.getItem('alumni-portafolio:v1:anon') === null"))
    ok("la banda desaparece", pg.query_selector("#nube-aviso").is_hidden())
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n4 · SE ABRE DESDE OTRO EQUIPO")
    # Contexto nuevo: sin localStorage, como si fuera otro computador.
    ctx, pg, errs = abrir(br, base, sesion=ANA)
    ok("el nombre volvió", pg.input_value("#f-nombre") == "Ana Prueba", pg.input_value("#f-nombre"))
    pg.evaluate("location.hash='#perfil'"); pg.wait_for_timeout(300)
    ok("el perfil volvió", "Analizo procesos" in pg.input_value("#f-perfil"))
    pg.evaluate("location.hash='#proyectos'"); pg.wait_for_timeout(400)
    ok("la ficha volvió entera", pg.evaluate(
       """(function(){var fs=document.querySelector('#proyectos-wrap fieldset');
          return fs ? fs.querySelector('.p-acciones').value : '';})()""").find("tres secuencias") > -1)
    ok("el chip dice de dónde salió", "cuenta" in pg.inner_text("#guardado"), pg.inner_text("#guardado"))
    ok("se dejó copia local de respaldo",
       pg.evaluate("!!localStorage.getItem('alumni-portafolio:v1:u-ana')"))
    ok("no se duplicó el portafolio", len(base.portafolios) == 1, len(base.portafolios))
    ok("ni las fichas", len(base.proyectos) == 1, len(base.proyectos))
    ok("sin errores de JS", not errs, errs)

    print("\n5 · AL ESCRIBIR SOLO VIAJA LO QUE CAMBIÓ")
    del base.peticiones[:]
    pg.evaluate("location.hash='#perfil'"); pg.wait_for_timeout(300)
    pg.fill("#f-capacidades", "Diseño de experimentos y análisis de datos")
    pg.wait_for_timeout(3400)
    escrituras = [x for x in base.peticiones if x[0] in ("POST", "PATCH")]
    ok("se escribió algo", escrituras, escrituras)
    ok("no se reenvió la ficha entera",
       not [x for x in escrituras if x[1] == "proyectos"], escrituras)
    ok("la capacidad quedó guardada",
       base.seccion("capacidades") == "Diseño de experimentos y análisis de datos",
       base.seccion("capacidades"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n6 · CADA CUENTA VE LA SUYA")
    ctx, pg, errs = abrir(br, base, sesion=LUIS)
    ok("Luis no ve el portafolio de Ana", pg.input_value("#f-nombre") == "",
       pg.input_value("#f-nombre"))
    ok("ni le ofrecen migrar nada ajeno", pg.query_selector("#nube-aviso").is_hidden())
    escribir(pg, "f-nombre", "Luis Prueba")
    ok("se creó un segundo portafolio", len(base.portafolios) == 2, len(base.portafolios))
    ok("el de Ana sigue intacto",
       [f for f in base.portafolios if f["usuario_id"] == "u-ana"][0]["titulo"] == "Ana Prueba")
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n7 · «EMPEZAR DE NUEVO» BORRA TAMBIÉN EN LA CUENTA")
    ctx, pg, errs = abrir(br, base, sesion=ANA)
    pg.evaluate("window.confirm = function(){ return true; }")
    pg.evaluate("location.hash='#checklist'"); pg.wait_for_timeout(400)
    pg.evaluate("document.getElementById('reset').click()")
    pg.wait_for_timeout(1200)
    ok("se fue el portafolio de Ana",
       not [f for f in base.portafolios if f["usuario_id"] == "u-ana"], base.portafolios)
    ok("y sus fichas con él (cascada)", not base.proyectos, base.proyectos)
    ok("el de Luis sigue ahí", len(base.portafolios) == 1, base.portafolios)
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n8 · SI RECHAZA LA MIGRACIÓN, LA CUENTA ARRANCA EN BLANCO")
    base2 = Base()
    ctx, pg, errs = abrir(br, base2, sesion=ANA, local=BORRADOR)
    pg.evaluate("""(function(){
        var bs = document.querySelectorAll('#nube-aviso button');
        bs[bs.length - 1].click();
    })()""")
    pg.wait_for_timeout(3400)
    ok("el formulario quedó vacío", pg.input_value("#f-nombre") == "", pg.input_value("#f-nombre"))
    ok("no se subió el borrador viejo",
       not [f for f in base2.portafolios if (f.get("titulo") or "") == "Ana Prueba"],
       base2.portafolios)
    ok("no quedaron fichas del borrador viejo",
       not [f for f in base2.proyectos if (f.get("nombre") or "")], base2.proyectos)
    ok("ni filas para las tres fichas en blanco", not base2.proyectos, len(base2.proyectos))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    print("\n9 · SI SUPABASE FALLA, NADIE PIERDE SU TRABAJO")
    caida = Base(caido=True)
    ctx, pg, errs = abrir(br, caida, sesion=ANA, local=BORRADOR,
                          llave="alumni-portafolio:v1:u-ana")
    ok("se sigue viendo lo del navegador",
       pg.input_value("#f-nombre") == "Ana Prueba", pg.input_value("#f-nombre"))
    texto = pg.inner_text("#nube-aviso")
    ok("con el mensaje acordado",
       "Estamos teniendo dificultades para sincronizar tu información" in texto and
       "permanecen disponibles temporalmente en este dispositivo" in texto, texto[:90])
    ok("no se enseña el error técnico", "503" not in texto and "servicio no disponible" not in texto)
    escribir(pg, "f-nombre", "Sigo escribiendo igual")
    ok("se puede seguir escribiendo",
       pg.input_value("#f-nombre") == "Sigo escribiendo igual")
    ok("y se guarda en el navegador", pg.evaluate(
       """(localStorage.getItem('alumni-portafolio:v1:u-ana')||'').indexOf('Sigo escribiendo')>-1"""))
    ok("la aplicación no se rompió", not errs, errs)
    ctx.close()

    br.close()

print("\n" + "=" * 54)
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
