import json, re
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8902/"
SB   = "https://vfuexivozypglggxpqsy.supabase.co"
USER = {"id": "u-1", "email": "ana@unisabana.edu.co"}
PERF = [{"id": "u-1", "correo": "ana@unisabana.edu.co", "nombre": "Ana Prueba",
         "facultad": "EICEA", "programa": "Administración de Empresas", "rol": "usuario"}]

llamadas = []
fallos   = []

def ok(nombre, cond, extra=""):
    print(("  OK   " if cond else "  FALLA") + "  " + nombre + (("  → " + str(extra)) if extra else ""))
    if not cond:
        fallos.append(nombre)

def montar(ctx, recover_status=200, recover_body=None, put_status=200, put_body=None):
    def ruta(route):
        req = route.request
        u, m = req.url, req.method
        if "/auth/v1/recover" in u:
            llamadas.append(("recover", u, req.post_data))
            return route.fulfill(status=recover_status, content_type="application/json",
                                 body=json.dumps(recover_body if recover_body else {}))
        if "/auth/v1/token" in u:
            llamadas.append(("token", u, req.post_data))
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(
                {"access_token": "tok-1", "refresh_token": "ref-1", "user": USER}))
        if "/auth/v1/user" in u and m == "PUT":
            llamadas.append(("put-user", u, req.post_data))
            return route.fulfill(status=put_status, content_type="application/json",
                                 body=json.dumps(put_body if put_body else USER))
        if "/auth/v1/user" in u:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(USER))
        if "/rest/v1/perfiles" in u and m == "GET":
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(PERF))
        if "/rest/v1/perfiles" in u:
            return route.fulfill(status=204, body="")
        return route.fulfill(status=200, content_type="application/json", body="{}")
    ctx.route(SB + "/**", ruta)

def visible(pg, sel):
    e = pg.query_selector(sel)
    return bool(e and e.is_visible())

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

    # ══════ 1 · PORTADA: los botones solo arriba a la derecha ══════
    print("\n1 · PORTADA — botones de cuenta")
    ctx = br.new_context(); montar(ctx); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "index.html"); pg.wait_for_timeout(600)
    ok("cabecera conserva los dos botones",
       [b.inner_text().strip() for b in pg.query_selector_all("#zona-cuenta button")]
       == ["Iniciar sesión", "Crear cuenta"])
    ok("el hero ya no tiene botones",
       len(pg.query_selector_all("#hero-acciones button")) == 0)
    ok("el hero conserva la nota",
       "arriba a la derecha" in pg.inner_text("#hero-acciones"))
    ok("sin errores de JS", not errs, errs)

    # ══════ 2 · EL ENLACE «¿OLVIDASTE TU CONTRASEÑA?» ══════
    print("\n2 · MODAL DE LOGIN — enlace de recuperación")
    pg.click("#btn-entrar"); pg.wait_for_timeout(200)
    ok("aparece bajo el campo de contraseña", visible(pg, "#c-olvide"))
    caja_clave = pg.query_selector("#campo-clave").bounding_box()
    caja_olv   = pg.query_selector("#bloque-olvide").bounding_box()
    ok("está debajo del campo, no encima", caja_olv["y"] > caja_clave["y"],
       "clave y=%.0f · enlace y=%.0f" % (caja_clave["y"], caja_olv["y"]))
    pg.click("#tab-registro"); pg.wait_for_timeout(150)
    ok("no aparece en el modo registro", not visible(pg, "#c-olvide"))
    pg.click("#tab-entrar"); pg.wait_for_timeout(150)

    # ══════ 3 · MODO RECUPERAR ══════
    print("\n3 · MODO RECUPERAR — solo el correo")
    pg.click("#c-olvide"); pg.wait_for_timeout(200)
    ok("título correcto", pg.inner_text("#modal-titulo") == "¿Olvidaste tu contraseña?")
    ok("se ve el correo", visible(pg, "#campo-correo"))
    ok("se oculta la contraseña", not visible(pg, "#campo-clave"))
    ok("se ocultan las pestañas", not visible(pg, ".modal-tabs"))
    ok("se ocultan facultad y programa", not visible(pg, "#bloque-academico"))
    ok("se oculta el acuerdo", not visible(pg, "#bloque-acuerdo"))
    ok("el botón dice «Enviar enlace»", pg.inner_text("#c-enviar").strip() == "Enviar enlace")
    ok("la salida dice «Volver al inicio de sesión»",
       pg.inner_text("#c-cancelar").strip() == "Volver al inicio de sesión")

    # ══════ 4 · VALIDACIONES ══════
    print("\n4 · VALIDACIÓN DEL CORREO")
    pg.fill("#c-correo", ""); pg.click("#c-enviar"); pg.wait_for_timeout(250)
    ok("correo vacío da mensaje", "correo institucional" in pg.inner_text("#modal-msg"),
       pg.inner_text("#modal-msg"))
    pg.fill("#c-correo", "no-es-correo"); pg.click("#c-enviar"); pg.wait_for_timeout(250)
    ok("correo mal escrito da mensaje", "válido" in pg.inner_text("#modal-msg"),
       pg.inner_text("#modal-msg"))
    pg.fill("#c-correo", "ana@gmail.com"); pg.click("#c-enviar"); pg.wait_for_timeout(250)
    ok("correo de otro dominio da mensaje", "@unisabana.edu.co" in pg.inner_text("#modal-msg"),
       pg.inner_text("#modal-msg"))
    ok("ninguno de los tres llamó a Supabase", not [c for c in llamadas if c[0] == "recover"])

    # ══════ 5 · ENVÍO CORRECTO ══════
    print("\n5 · ENVÍO CORRECTO")
    pg.fill("#c-correo", "ana@unisabana.edu.co"); pg.click("#c-enviar"); pg.wait_for_timeout(500)
    rec = [c for c in llamadas if c[0] == "recover"]
    ok("llamó a /auth/v1/recover", len(rec) == 1)
    ok("mandó el correo escrito", rec and json.loads(rec[0][2])["email"] == "ana@unisabana.edu.co",
       rec[0][2] if rec else "")
    ok("mandó redirect_to a esta página", rec and "redirect_to=" in rec[0][1],
       rec[0][1].split("?")[-1] if rec else "")
    ok("muestra el mensaje pedido",
       "Te enviamos un enlace para restablecer tu contraseña." in pg.inner_text("#modal-msg"),
       pg.inner_text("#modal-msg"))
    ok("muestra la vista de revisar el correo",
       "Revisa tu correo institucional para crear una nueva contraseña." in pg.inner_text("#vista-enviado"))
    ok("nombra el correo de destino", pg.inner_text("#enviado-destino") == "ana@unisabana.edu.co")
    ok("se oculta el formulario", not visible(pg, "#form-cuenta"))

    # ══════ 6 · VOLVER AL LOGIN ══════
    print("\n6 · VOLVER AL INICIO DE SESIÓN")
    pg.click("#e-volver"); pg.wait_for_timeout(250)
    ok("vuelve al formulario", visible(pg, "#form-cuenta"))
    ok("vuelve la contraseña", visible(pg, "#campo-clave"))
    ok("vuelven las pestañas", visible(pg, ".modal-tabs"))
    ok("el botón vuelve a decir «Entrar»", pg.inner_text("#c-enviar").strip() == "Entrar")

    # ══════ 7 · REGRESIÓN: EL LOGIN NORMAL SIGUE ENTRANDO ══════
    print("\n7 · REGRESIÓN — inicio de sesión de siempre")
    pg.fill("#c-correo", "ana@unisabana.edu.co"); pg.fill("#c-clave", "clave-de-prueba")
    pg.click("#c-enviar"); pg.wait_for_timeout(700)
    ok("llamó al endpoint de siempre", any(c[0] == "token" for c in llamadas))
    ok("cierra el modal", not visible(pg, "#modal-cuenta"))
    ok("muestra el panel de la persona", visible(pg, "#panel"))
    ok("la cabecera muestra el nombre", "Ana Prueba" in pg.inner_text("#zona-cuenta"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    # ══════ 8 · EL ENLACE DEL CORREO ATERRIZA EN LA PORTADA ══════
    print("\n8 · REGRESO DESDE EL CORREO (type=recovery)")
    ctx = br.new_context(); montar(ctx); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "index.html#access_token=tok-rec&refresh_token=ref-rec&type=recovery")
    pg.wait_for_timeout(900)
    ok("abre el modal solo", visible(pg, "#modal-cuenta"))
    ok("en modo contraseña nueva", pg.inner_text("#modal-titulo") == "Crea una contraseña nueva")
    ok("oculta el correo", not visible(pg, "#campo-correo"))
    ok("pide la contraseña", visible(pg, "#campo-clave"))
    ok("pide la confirmación", visible(pg, "#campo-clave2"))
    ok("la etiqueta dice «Nueva contraseña»", pg.inner_text("#c-clave-label") == "Nueva contraseña")
    ok("el botón dice «Guardar contraseña»", pg.inner_text("#c-enviar").strip() == "Guardar contraseña")
    ok("limpia el token de la barra de direcciones", "access_token" not in pg.url, pg.url)

    print("\n9 · GUARDAR LA CONTRASEÑA NUEVA")
    pg.fill("#c-clave", "corta"); pg.fill("#c-clave2", "corta")
    pg.click("#c-enviar"); pg.wait_for_timeout(250)
    ok("rechaza menos de 8 caracteres", "al menos 8" in pg.inner_text("#modal-msg"),
       pg.inner_text("#modal-msg"))
    pg.fill("#c-clave", "clave-nueva-1"); pg.fill("#c-clave2", "clave-nueva-2")
    pg.click("#c-enviar"); pg.wait_for_timeout(250)
    ok("rechaza contraseñas distintas", "no coinciden" in pg.inner_text("#modal-msg"),
       pg.inner_text("#modal-msg"))
    ok("ninguna de las dos llamó a Supabase", not [c for c in llamadas if c[0] == "put-user"])
    pg.fill("#c-clave", "clave-nueva-1"); pg.fill("#c-clave2", "clave-nueva-1")
    pg.click("#c-enviar"); pg.wait_for_timeout(700)
    put = [c for c in llamadas if c[0] == "put-user"]
    ok("llamó a PUT /auth/v1/user", len(put) == 1)
    ok("mandó la contraseña nueva", put and json.loads(put[0][2]).get("password") == "clave-nueva-1")
    ok("cierra el modal", not visible(pg, "#modal-cuenta"))
    ok("queda dentro de la cuenta", visible(pg, "#panel"))
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    # ══════ 10 · ENLACE VENCIDO ══════
    print("\n10 · ENLACE VENCIDO")
    ctx = br.new_context(); montar(ctx); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "index.html#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired")
    pg.wait_for_timeout(800)
    ok("abre el modal", visible(pg, "#modal-cuenta"))
    ok("lo explica", "venció" in pg.inner_text("#modal-msg"), pg.inner_text("#modal-msg"))
    ok("deja pedir otro enlace", pg.inner_text("#c-enviar").strip() == "Enviar enlace")
    ok("sin errores de JS", not errs, errs)
    ctx.close()

    # ══════ 11 · EL PITCH SIGUE IGUAL ══════
    print("\n11 · PITCH — sin botones de cuenta, modal intacto")
    ctx = br.new_context(); montar(ctx); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "estudio-de-pitch.html"); pg.wait_for_timeout(900)
    ok("sin botones en la cabecera", len(pg.query_selector_all("#zona-cuenta button")) == 0)
    ok("remite a la portada", "portada" in pg.inner_text("#zona-cuenta"))
    ok("el modal existe", pg.query_selector("#modal-cuenta") is not None)
    ok("y trae la recuperación", pg.query_selector("#c-olvide") is not None)
    ok("sin errores de JS", not errs, errs)
    ctx.close()
    br.close()

print("\n" + ("=" * 52))
print("TODO CORRECTO" if not fallos else "FALLAS: " + " | ".join(fallos))
