/* ══════════════════════════════════════════════════════════════
   AUTENTICACIÓN Y PUENTE CON SUPABASE — compartido
   Alumni Sabana · Centro de Desarrollo Profesional
   --------------------------------------------------------------
   Este archivo salió tal cual de «Estudio de Pitch», donde vivía
   dentro de parte-js.js. Lo cargan las tres páginas de la
   plataforma, así que una cuenta creada en cualquiera de ellas
   sirve en todas y solo hay UNA copia que mantener.

   NO cambia nada de Supabase: mismo proyecto, mismas tablas,
   mismas políticas, mismos endpoints, mismo flujo de registro con
   facultad y programa, mismo acuerdo, misma confirmación por
   enlace o por código.

   DOS COSAS SÍ CAMBIARON, y están señaladas más abajo:

   1. La sesión se guarda en sessionStorage. Antes vivía solo en
      memoria y se perdía al cambiar de página, lo que hacía
      imposible entrar en la portada y seguir dentro al abrir una
      herramienta. Sigue borrándose al cerrar la pestaña, así que
      en un equipo compartido no queda la cuenta abierta.

   2. Lo que era propio del Pitch —recargar su reporte y su
      historial— ya no se llama desde aquí. En su lugar hay dos
      avisos, «alCambiarSesion» y «alAvisar», a los que cada
      página engancha lo suyo.

   Se carga ANTES que el resto del script de cada página:
       <script src="auth.js"></script>
   ══════════════════════════════════════════════════════════════ */

/* ── Utilidades mínimas ──────────────────────────────────────
   Las páginas tienen las suyas dentro de su propio ámbito; estas
   son las que necesita este archivo y no chocan con aquellas. */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function mmss(s){
  s = Math.max(0, Math.floor(s));
  return Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
}
function esc(t){
  return String(t == null ? "" : t)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

/* ── Avisos hacia la página que carga este archivo ───────────
   El módulo no sabe qué hay que repintar cuando alguien entra o
   sale: cada página lo dice. Así el Pitch recarga su reporte y su
   historial, la portada repinta su panel, y el portafolio solo
   actualiza el nombre de quien está dentro. */
const _alCambiar = [];
const _alAvisar  = [];
function alCambiarSesion(fn){ if(typeof fn === "function") _alCambiar.push(fn); }
function alAvisar(fn){ if(typeof fn === "function") _alAvisar.push(fn); }
function avisarCambio(){
  _alCambiar.forEach(f => { try{ f(Cuenta.sesion); }catch(e){ console.error(e); } });
}
function avisar(txt){
  if(!_alAvisar.length){ console.warn(txt); return; }
  _alAvisar.forEach(f => { try{ f(txt); }catch(e){ console.error(e); } });
}

/* ── Sesión compartida entre las páginas ─────────────────────
   sessionStorage, no localStorage: vive mientras la pestaña esté
   abierta y se borra al cerrarla. Es lo que permite entrar una
   vez en la portada y seguir dentro en las herramientas, sin
   dejar la cuenta abierta para el siguiente en un equipo
   compartido del campus. */
const LLAVE_SESION_COMPARTIDA = "alumni-cdp:sesion";

function guardar(){
  try{
    if(Cuenta.sesion) sessionStorage.setItem(LLAVE_SESION_COMPARTIDA, JSON.stringify(Cuenta.sesion));
    else sessionStorage.removeItem(LLAVE_SESION_COMPARTIDA);
  }catch(e){ /* navegador sin permisos de almacenamiento */ }
}
function olvidar(){
  try{ sessionStorage.removeItem(LLAVE_SESION_COMPARTIDA); }catch(e){}
}
function recuperar(){
  try{
    const v = sessionStorage.getItem(LLAVE_SESION_COMPARTIDA);
    if(!v) return null;
    const s = JSON.parse(v);
    return (s && s.token && s.correo) ? s : null;
  }catch(e){ return null; }
}

const API_BASE = "";

/* ------------------------------------------------------------
   SUPABASE — pega aquí las dos claves de tu proyecto.
   Settings → API:  Project URL  y  anon public key.
   La clave «anon» es pública por diseño: no da acceso a nada
   que las políticas de seguridad por fila no permitan.
   NUNCA pongas aquí la clave «service_role».
   ------------------------------------------------------------ */
const SUPABASE_URL = "https://vfuexivozypglggxpqsy.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_vq7h7s7ASpAI1JrYkRBNow_zZAPgRI9";

/* ------------------------------------------------------------
   CÓMO CONFIRMA LA CUENTA CADA PERSONA
   "enlace"  → Supabase manda la plantilla por defecto, con un
               enlace de confirmación. Es lo que está activo hoy.
   "codigo"  → Si algún día cambias la plantilla de correo a
               {{ .Token }}, pon "codigo" aquí y el formulario
               vuelve a pedir los seis dígitos.
   En ambos casos la página sabe recoger la sesión que Supabase
   devuelve en la URL al hacer clic en el enlace.
   ------------------------------------------------------------ */
const MODO_CONFIRMACION = "enlace";

/* Vista que alimenta la lista de personas del panel de administración.
   No se usa en el inicio de sesión: para leer el perfil propio se
   sigue consultando la tabla «perfiles». */
const VISTA_ADMIN_PERFILES = "perfiles_admin";

/* El panel solo muestra a quien ya entró alguna vez. En PostgREST el
   «is not null» se escribe así. */
const FILTRO_ACTIVIDAD = "ultimo_acceso=not.is.null";

const LLAVE_RONDAS = "estudio-pitch:rondas";
const LLAVE_SESION = "estudio-pitch:sesion";

/* Dominio institucional exigido en el registro */
const DOMINIO = "@unisabana.edu.co";

/* Acuerdo de confidencialidad y tratamiento de datos.
   Al cambiar el texto de la casilla, suban esta versión: el servidor
   guarda cuál aceptó cada persona y en qué fecha. */
const ACUERDO_VERSION = "1.1";   // redacción aprobada por dirección, agosto de 2026

/* Correos con rol de administrador MIENTRAS NO EXISTA SERVIDOR.
   Solo aplica al modo demostración: en cuanto se configure Supabase,
   el rol lo decide la columna «rol» de la tabla perfiles y esta lista
   se ignora por completo. Edita o vacía esta lista a voluntad. */
const ADMINS_DEMO = [
  "desarrolloprofesional@unisabana.edu.co",   // cuenta del CDP
  "alumni@unisabana.edu.co"
];
/* Enlace institucional verificado: la dirección anterior
   (…/politica-de-tratamiento-de-datos-personales/) devuelve 404. */
const URL_POLITICA = "https://www.unisabana.edu.co/politica-de-proteccion-de-datos";

/* ============================================================
   CATÁLOGO ACADÉMICO — Universidad de La Sabana
   Unidades académicas con oferta de pregrado.
   Fuente: unisabana.edu.co/programas/unidades-academicas
   Consultado en agosto de 2026. Al actualizarse la oferta,
   basta con editar este objeto.
   ============================================================ */
const FACULTADES = {
  "Escuela Internacional de Ciencias Económicas y Administrativas":[
    "Administración de Empresas",
    "Administración & Servicio",
    "Administración de Mercadeo y Logística Internacionales",
    "Administración de Negocios Internacionales",
    "Economía y Finanzas Internacionales",
    "Economía y Finanzas Internacionales Virtual",
    "Gastronomía"
  ],
  "Facultad de Ciencias del Comportamiento":[
    "Psicología",
    "Comportamiento Organizacional"
  ],
  "Facultad de Ciencias de la Vida y el Bienestar":[
    "Enfermería",
    "Fisioterapia"
  ],
  "Facultad de Comunicación":[
    "Comunicación Audiovisual y Multimedios",
    "Comunicación Corporativa",
    "Comunicación Social y Periodismo"
  ],
  "Facultad de Educación":[
    "Licenciatura en Educación Infantil"
  ],
  "Facultad de Estudios Jurídicos, Políticos e Internacionales":[
    "Derecho",
    "Ciencias Políticas",
    "Relaciones Internacionales"
  ],
  "Facultad de Filosofía y Ciencias Humanas":[
    "Filosofía"
  ],
  "Facultad de Ingeniería":[
    "Ingeniería Industrial",
    "Ingeniería Informática",
    "Ingeniería Química",
    "Ingeniería Civil",
    "Ingeniería Mecánica",
    "Ingeniería de Bioproducción",
    "Ingeniería de Diseño e Innovación",
    "Ingeniería en Inteligencia Artificial",
    "Ciencia de Datos"
  ],
  "Facultad de Medicina":[
    "Medicina"
  ],
  "Otra / no está en la lista":[
    "Otro programa",
    "Posgrado",
    "Egresado de un programa que ya no se ofrece"
  ]
};

function hayServidor(){ return typeof API_BASE === "string" && API_BASE.length > 0; }
function haySupabase(){
  return typeof SUPABASE_URL === "string" && SUPABASE_URL.length > 0 &&
         typeof SUPABASE_PUBLIC_KEY === "string" && SUPABASE_PUBLIC_KEY.length > 0;
}
/* ¿Hay algún backend real detrás? Si no, corre el modo demostración. */
function hayBackend(){ return haySupabase() || hayServidor(); }

function idLocal(){
  try{ if(window.crypto && crypto.randomUUID) return "loc-" + crypto.randomUUID(); }catch(_){}
  return "loc-" + Date.now() + "-" + Math.floor(Math.random()*1e6);
}

function leerJSON(llave, porDefecto){
  try{ const v = localStorage.getItem(llave); return v ? JSON.parse(v) : porDefecto; }
  catch(_){ return porDefecto; }
}
function escribirJSON(llave, valor){
  try{ localStorage.setItem(llave, JSON.stringify(valor)); return true; }
  catch(_){ return false; }
}

/* ============================================================
   CUENTA
   ============================================================ */
const Cuenta = {
  sesion: null,

  /* La sesión vive SOLO en memoria: al recargar o cerrar la pestaña
     se pierde y hay que volver a entrar. Es a propósito. Guardarla en
     el navegador dejaba tokens caducados que hacían creer a la página
     que seguías dentro mientras el servidor ya te había sacado, y en
     un equipo compartido —una sala del campus— dejaba la cuenta
     abierta para el siguiente. */
  /* Al abrir cualquier página se recupera la sesión de la pestaña.
     Antes esto ponía la sesión en null a propósito; ahora la
     recupera, que es lo que permite entrar una vez en la portada y
     seguir dentro al abrir una herramienta. Al cerrar la pestaña
     desaparece igual que antes. */
  iniciar(){
    this.sesion = recuperar();
    /* Restos de versiones anteriores que sí escribían en localStorage */
    try{ localStorage.removeItem(LLAVE_SESION); }catch(_){}
    this.pintar();
    if(this.sesion){ avisarCambio(); }
  },

  /* Paso 1 del registro: crea la cuenta pendiente y dispara el correo con el código.
     No devuelve token: la sesión solo se abre tras verificar. */
  async registrar(datos){
    return await api("/auth/registro", "POST", datos);
  },

  async verificar(correo, codigo){
    const r = await api("/auth/verificar", "POST", {correo, codigo});
    this.guardarSesion(r);
    return r;
  },

  async reenviarCodigo(correo){
    return await api("/auth/codigo", "POST", {correo});
  },

  async entrar(correo, clave){
    const r = await api("/auth/sesion", "POST", {correo, clave});
    this.guardarSesion(r);
    return r;
  },

  /* ── Recuperación de contraseña ────────────────────────────
     Paso 1: pedirle a Supabase que envíe el correo con el enlace.
     No se comprueba antes si la cuenta existe: Supabase responde
     igual exista o no, a propósito, para que nadie pueda usar
     este formulario como lista de correos registrados. */
  async recuperar(correo){
    const c = String(correo || "").trim().toLowerCase();
    if(!c){ throw new Error("Escribe tu correo institucional."); }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)){ throw new Error("Escribe un correo válido."); }
    if(c.slice(-DOMINIO.length) !== DOMINIO){
      throw new Error("Debes utilizar un correo institucional " + DOMINIO);
    }
    try{
      return await api("/auth/recuperar", "POST", {correo: c, destino: destinoRecuperacion()});
    }catch(err){
      /* El límite de envíos y el correo mal escrito sí tienen mensaje
         propio; cualquier otro fallo se cuenta como no enviado. */
      if(err && err.status === 429){ throw err; }
      const e = new Error("No fue posible enviar el correo de recuperación.");
      e.causa = err;
      throw e;
    }
  },

  /* Paso 2: ya se abrió el enlace del correo, así que hay sesión de
     recuperación. Con ella se escribe la contraseña nueva. */
  async cambiarClave(clave){
    if(!clave || clave.length < 8){ throw new Error("La contraseña debe tener al menos 8 caracteres."); }
    if(!this.sesion){ throw new Error("El enlace de recuperación venció. Pide uno nuevo."); }
    return await api("/auth/clave", "POST", {clave});
  },

  esAdmin(){ return !!(this.sesion && this.sesion.rol === "admin"); },

  guardarSesion(r){
    if(!r || !r.token || !r.usuario){ throw new Error("Respuesta del servidor incompleta."); }
    this.sesion = {
      token: r.token,
      /* Sin esto el token no se puede renovar y la sesión se caía
         sola a la hora, aunque la página siguiera diciendo que
         estabas dentro. */
      refresh: r.refresh || (this.sesion && this.sesion.refresh) || null,
      correo: r.usuario.correo,
      nombre: r.usuario.nombre || "",
      facultad: r.usuario.facultad || "",
      programa: r.usuario.programa || "",
      rol: r.usuario.rol === "admin" ? "admin" : "usuario",
      id: r.usuario.id
    };
    this.pintar();
    guardar();                 /* la sesión sobrevive al cambio de página */
    avisarCambio();
  },

  salir(){
    this.sesion = null;
    adminDatos = [];
    try{ localStorage.removeItem(LLAVE_SESION); }catch(_){}   // por si quedó de una versión anterior
    const p = $("#admin-panel"); if(p){ p.hidden = true; }
    this.pintar();
    olvidar();
    avisarCambio();
  },

  /* La zona de cuenta se pinta según lo que declare la página en
     «data-cuenta»:
       "completa"    → con sesión, el nombre y Salir; sin ella, los
                       botones de entrar y crear cuenta. Es la portada,
                       que es el punto de entrada de la plataforma.
       cualquier otro → solo el nombre cuando hay sesión. Es lo que usan
                       las herramientas: quien no ha entrado no ve ahí
                       los botones, sino la invitación a hacerlo desde
                       la portada, para que haya un único sitio donde
                       se abre la cuenta. */
  pintar(){
    const z = $("#zona-cuenta");
    if(!z) return;
    const completa = z.dataset.cuenta === "completa";

    if(this.sesion){
      z.innerHTML = `
        <div class="sesion">
          <span class="sesion-modo${hayBackend() ? "" : " local"}">${
            this.esAdmin() ? "Administrador" : (hayBackend() ? "En tu cuenta" : "Demostración")
          }</span>
          <span class="sesion-correo" title="${esc(this.sesion.correo)}">${esc(this.sesion.nombre || this.sesion.correo)}</span>
          <button class="btn-cuenta sec" id="btn-salir">Salir</button>
        </div>`;
      $("#btn-salir").addEventListener("click", ()=> Cuenta.salir());
      return;
    }

    if(completa){
      z.innerHTML = `
        <div class="sesion">
          <button class="btn-cuenta sec" id="btn-entrar">Iniciar sesión</button>
          <button class="btn-cuenta" id="btn-registro">Crear cuenta</button>
        </div>`;
      $("#btn-entrar").addEventListener("click", ()=> abrirModal("entrar"));
      $("#btn-registro").addEventListener("click", ()=> abrirModal("registro"));
    }else{
      /* En las herramientas no se abre cuenta: se dice dónde se hace. */
      z.innerHTML = `<span class="sesion-invita">Entra desde la portada para guardar tu avance</span>`;
    }
  }
};

/* ============================================================
   ADAPTADOR DE SUPABASE
   ------------------------------------------------------------
   Traduce los endpoints internos de la aplicación a las APIs
   REST de Supabase (Auth + PostgREST). No usa la librería
   supabase-js: solo fetch, para que el archivo siga siendo
   autocontenido y sin dependencias de ningún CDN.
   ============================================================ */
function sbURL(p){ return SUPABASE_URL.replace(/\/$/,"") + p; }

function mensajeSupabase(status, d){
  const crudo = (d && (d.msg || d.message || d.error_description || d.error_code || d.error || d.hint)) || "";
  const s = String(crudo).toLowerCase();
  if(s.indexOf("unisabana") >= 0 || s.indexOf("dominio") >= 0) return "El correo debe terminar en " + DOMINIO;
  if(s.indexOf("acuerdo") >= 0) return "Debes aceptar el acuerdo de confidencialidad.";
  if(s.indexOf("already registered") >= 0 || s.indexOf("already exists") >= 0) return "Ese correo ya está registrado. Inicia sesión.";
  if(s.indexOf("invalid login") >= 0 || s.indexOf("invalid credentials") >= 0) return "Correo o contraseña incorrectos.";
  if(s.indexOf("email not confirmed") >= 0 || s.indexOf("not confirmed") >= 0){
    return "Debes confirmar tu correo institucional antes de ingresar. Revisa tu bandeja de entrada.";
  }
  /* Supabase devuelve «Token has expired or is invalid» para ambos casos,
     así que el mensaje debe cubrir los dos sin dar por hecho cuál fue. */
  if(s.indexOf("expired") >= 0 && s.indexOf("invalid") >= 0) return "El código no es correcto o ya venció. Pide uno nuevo si hace falta.";
  if(s.indexOf("expired") >= 0) return "El código venció. Pide uno nuevo.";
  if(s.indexOf("token") >= 0 && s.indexOf("invalid") >= 0) return "El código no es correcto.";
  if(s.indexOf("otp") >= 0) return "El código no es correcto o ya venció.";
  if(status === 429 || s.indexOf("rate limit") >= 0 || s.indexOf("security purposes") >= 0){
    return "Demasiados intentos. Espera unos minutos antes de volver a probar.";
  }
  if(s.indexOf("password") >= 0 && s.indexOf("short") >= 0) return "La contraseña debe tener al menos 8 caracteres.";
  /* Cambio de contraseña: Supabase rechaza repetir la anterior. */
  if(s.indexOf("should be different") >= 0 || (s.indexOf("same") >= 0 && s.indexOf("password") >= 0)){
    return "La contraseña nueva tiene que ser distinta de la anterior.";
  }
  if(s.indexOf("session") >= 0 && s.indexOf("missing") >= 0){
    return "El enlace de recuperación venció. Pide uno nuevo.";
  }
  return crudo || ("Error " + status + " del servidor.");
}

async function sbFetch(ruta, opciones, autenticado){
  opciones = opciones || {};
  const h = Object.assign({
    "apikey": SUPABASE_PUBLIC_KEY,
    "Accept": "application/json"
  }, opciones.headers || {});
  if(opciones.body){ h["Content-Type"] = "application/json"; }
  h["Authorization"] = "Bearer " +
    ((autenticado && Cuenta.sesion && Cuenta.sesion.token) ? Cuenta.sesion.token : SUPABASE_PUBLIC_KEY);

  let r;
  try{
    r = await fetch(sbURL(ruta), Object.assign({}, opciones, {headers:h}));
  }catch(_){
    throw new Error("No hay conexión con el servidor.");
  }
  if(r.status === 204 || r.status === 205){ return null; }
  let d = null;
  const txt = await r.text();
  if(txt){ try{ d = JSON.parse(txt); }catch(_){ d = {message:txt}; } }
  if(!r.ok){
    const e = new Error(mensajeSupabase(r.status, d));
    e.status = r.status;
    e.datos = d;          // cuerpo crudo, por si hace falta el mensaje original
    throw e;
  }
  return d;
}

/* Renueva el token de acceso, que en Supabase vence a la hora. */
async function sbRefrescar(){
  const s = Cuenta.sesion;
  if(!s || !s.refresh){ return false; }
  try{
    const d = await sbFetch("/auth/v1/token?grant_type=refresh_token",
      {method:"POST", body: JSON.stringify({refresh_token: s.refresh})}, false);
    if(d && d.access_token){
      s.token = d.access_token;
      if(d.refresh_token){ s.refresh = d.refresh_token; }
      /* El token renovado también tiene que quedar guardado, o la
         siguiente página volvería a usar el que ya venció. */
      guardar();
      return true;
    }
  }catch(_){}
  return false;
}

/* Llamada autenticada con un reintento tras renovar el token. */
async function sbAuth(ruta, opciones){
  try{
    return await sbFetch(ruta, opciones, true);
  }catch(err){
    if(err.status === 401 && await sbRefrescar()){
      return await sbFetch(ruta, opciones, true);
    }
    throw err;
  }
}

async function sbPerfil(usuario){
  const meta = (usuario && usuario.user_metadata) || {};
  try{
    const r = await sbAuth("/rest/v1/perfiles?select=*&id=eq." + encodeURIComponent(usuario.id), {method:"GET"});
    if(r && r[0]){ return r[0]; }
  }catch(_){}
  return {
    id: usuario.id, correo: usuario.email,
    nombre: meta.nombre || "", facultad: meta.facultad || "", programa: meta.programa || "",
    rol: "usuario"
  };
}

/* Deja constancia del acceso: el acuerdo autoriza registrar la recurrencia. */
function sbMarcarAcceso(id){
  sbAuth("/rest/v1/perfiles?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: {"Prefer":"return=minimal"},
    body: JSON.stringify({ultimo_acceso: new Date().toISOString()})
  }).catch(()=>{});
}

/* Mensaje único para todos los caminos de entrada. */
const MSG_SIN_CONFIRMAR =
  "Debes confirmar tu correo institucional antes de ingresar. Revisa tu bandeja de entrada.";

/* PostgREST devuelve 404 con código 42P01 cuando la vista o la tabla
   no existe, y a veces 400 con «could not find the table … in the
   schema cache». Se cubren las dos formas. */
function esVistaInexistente(err){
  const m = String((err && err.message) || "").toLowerCase();
  const d = (err && err.datos) || {};
  return String(d.code || "") === "42P01" ||
         (m.indexOf("does not exist") >= 0 && m.indexOf("relation") >= 0) ||
         m.indexOf("schema cache") >= 0 ||
         (err && err.status === 404);
}

/* Reconoce el «falta confirmar» en cualquiera de sus formas: el que
   marca esta página y el que devuelve Supabase al iniciar sesión. */
function esErrorSinConfirmar(err){
  const m = String((err && err.message) || "").toLowerCase();
  return !!(err && err.sinConfirmar) ||
         m.indexOf("confirmar tu correo") >= 0 ||
         m.indexOf("not confirmed") >= 0;
}

/* ¿Supabase considera confirmado este correo?
   Se miran los tres campos porque el nombre cambia según la versión
   del proyecto; basta con que uno traiga fecha. */
function correoConfirmado(u){
  if(!u) return false;
  if(u.email_confirmed_at || u.confirmed_at) return true;
  if(u.identities && u.identities.some(i => i && i.identity_data &&
      i.identity_data.email_verified === true)) return true;

  /* Si la respuesta no trae NINGUNO de los campos de confirmación, no
     se puede saber, y bloquear a ciegas dejaría a todo el mundo fuera
     ante un cambio de la API. En ese caso se deja pasar: el propio
     Supabase ya rechaza con «Email not confirmed» a quien no confirmó,
     y el perfil solo existe tras la confirmación. */
  const sabemos = ("email_confirmed_at" in u) || ("confirmed_at" in u) || !!u.identities;
  return !sabemos;
}

/* Cierra la sesión recién abierta y avisa. Se usa cuando alguien
   llega con credenciales válidas pero sin confirmar el correo:
   pasa por el enlace mágico y pasaría si algún día se activa el
   auto-confirm en el proyecto. */
async function rechazarSinConfirmar(correo){
  correoPendiente = correo || (Cuenta.sesion && Cuenta.sesion.correo) || "";
  /* Se cierra en el servidor con la sesión todavía puesta: sbFetch
     toma el token de Cuenta.sesion cuando se le pide autenticado. */
  try{ await sbFetch("/auth/v1/logout", {method:"POST"}, true); }catch(_){}
  Cuenta.sesion = null;
  adminDatos = []; adminUsuarios = [];
  estado.historial = [];
  Cuenta.pintar();
  const e = new Error(MSG_SIN_CONFIRMAR);
  e.sinConfirmar = true;
  throw e;
}

async function sbSesionDesde(d){
  if(!d || !d.access_token || !d.user){ throw new Error("El servidor no devolvió una sesión válida."); }
  /* PUERTA DE ENTRADA. Aquí pasan el inicio de sesión con contraseña,
     la verificación por código y el enlace del correo: es el único
     sitio donde hay que comprobarlo. */
  Cuenta.sesion = {token: d.access_token, refresh: d.refresh_token || null,
                   correo: d.user.email, id: d.user.id, nombre:"", facultad:"", programa:"", rol:"usuario"};
  if(!correoConfirmado(d.user)){
    await rechazarSinConfirmar(d.user.email);
  }
  Cuenta.sesion = {token: d.access_token, refresh: d.refresh_token || null,
                   correo: d.user.email, id: d.user.id, nombre: "", facultad: "", programa: "", rol: "usuario"};
  const p = await sbPerfil(d.user);
  sbMarcarAcceso(d.user.id);
  return {
    token: d.access_token, refresh: d.refresh_token || null,
    usuario: {id: p.id, correo: p.correo || d.user.email, nombre: p.nombre || "",
              facultad: p.facultad || "", programa: p.programa || "", rol: p.rol || "usuario"}
  };
}

async function supabaseAPI(ruta, metodo, cuerpo){
  const b = cuerpo || {};

  /* ---------- Autenticación ---------- */
  if(ruta === "/auth/registro" && metodo === "POST"){
    await sbFetch("/auth/v1/signup", {method:"POST", body: JSON.stringify({
      email: b.correo,
      password: b.clave,
      data: {
        nombre: b.nombre || "",
        facultad: b.facultad || "",
        programa: b.programa || "",
        acuerdo_version: b.acuerdo ? b.acuerdo.version : "",
        acuerdo_fecha: b.acuerdo ? b.acuerdo.fecha : ""
      }
    })}, false);
    return {mensaje:"Código enviado"};
  }

  if(ruta === "/auth/verificar" && metodo === "POST"){
    /* Supabase acepta type "signup" y también "email" según la versión
       del proyecto. Probamos el primero y caemos al segundo. */
    let d;
    try{
      d = await sbFetch("/auth/v1/verify", {method:"POST", body: JSON.stringify({
        type: "signup", email: b.correo, token: String(b.codigo)
      })}, false);
    }catch(err){
      d = await sbFetch("/auth/v1/verify", {method:"POST", body: JSON.stringify({
        type: "email", email: b.correo, token: String(b.codigo)
      })}, false);
    }
    return await sbSesionDesde(d);
  }

  if(ruta === "/auth/codigo" && metodo === "POST"){
    await sbFetch("/auth/v1/resend", {method:"POST", body: JSON.stringify({
      type: "signup", email: b.correo
    })}, false);
    return {mensaje:"Código reenviado"};
  }

  if(ruta === "/auth/sesion" && metodo === "POST"){
    const d = await sbFetch("/auth/v1/token?grant_type=password", {method:"POST", body: JSON.stringify({
      email: b.correo, password: b.clave
    })}, false);
    return await sbSesionDesde(d);
  }

  /* Correo con el enlace para restablecer la contraseña. Es el mismo
     endpoint que usa supabase.auth.resetPasswordForEmail(): aquí se
     llama con fetch porque el proyecto no carga supabase-js.
     «redirect_to» tiene que estar en Authentication → URL
     Configuration → Redirect URLs, o Supabase devuelve a la Site URL. */
  if(ruta === "/auth/recuperar" && metodo === "POST"){
    const destino = b.destino ? ("?redirect_to=" + encodeURIComponent(b.destino)) : "";
    await sbFetch("/auth/v1/recover" + destino, {method:"POST", body: JSON.stringify({
      email: b.correo
    })}, false);
    /* Supabase contesta 200 exista o no la cuenta, para no delatar
       qué correos están registrados. El mensaje de la interfaz está
       redactado teniendo eso en cuenta. */
    return {mensaje:"Enlace enviado"};
  }

  /* Contraseña nueva. Va autenticada con la sesión que abrió el
     enlace del correo, que es lo único que prueba que quien escribe
     es el dueño de la cuenta. */
  if(ruta === "/auth/clave" && metodo === "POST"){
    await sbAuth("/auth/v1/user", {method:"PUT", body: JSON.stringify({
      password: b.clave
    })});
    return {mensaje:"Contraseña actualizada"};
  }

  /* Sesión que llega en la URL cuando la persona hace clic en el
     enlace del correo en lugar de escribir el código. */
  if(ruta === "/auth/desde-url" && metodo === "POST"){
    if(b.access_token){
      /* Sesión provisional para poder preguntar quién es. */
      Cuenta.sesion = {token:b.access_token, refresh:b.refresh_token || null,
                       correo:"", id:"", nombre:"", facultad:"", programa:"", rol:"usuario"};
      const u = await sbAuth("/auth/v1/user", {method:"GET"});
      return await sbSesionDesde({access_token:b.access_token, refresh_token:b.refresh_token, user:u});
    }
    const d = await sbFetch("/auth/v1/verify", {method:"POST", body: JSON.stringify({
      type: b.tipo || "signup", token_hash: b.token_hash
    })}, false);
    return await sbSesionDesde(d);
  }

  /* ---------- Traducción con IA ----------
     Respaldo del portafolio para los navegadores que no traen
     traductor propio. La clave de Gemini vive en los secretos de
     Supabase: aquí solo se llama a la función. */
  if(ruta === "/traducir" && metodo === "POST"){
    try{
      return await sbAuth("/functions/v1/traducir", {method:"POST", body: JSON.stringify(b)});
    }catch(err){
      const m = String((err && err.message) || "");
      if(err.status === 404 || m.indexOf("No hay conexión") >= 0){
        throw new Error("el servicio de traducción todavía no está desplegado en Supabase (falta la Edge Function «traducir»)");
      }
      if(err.status === 503){
        throw new Error("el servicio de traducción está desplegado pero le falta la clave del proveedor");
      }
      if(err.datos && err.datos.error){ throw new Error(err.datos.error); }
      throw err;
    }
  }

  /* ---------- Revisión del portafolio con IA ----------
     Devuelve observaciones sobre lo que escribió la persona. No
     redacta texto: eso es deliberado y está escrito también en la
     instrucción que recibe el modelo. */
  if(ruta === "/revisar-portafolio" && metodo === "POST"){
    try{
      return await sbAuth("/functions/v1/revisar-portafolio", {method:"POST", body: JSON.stringify(b)});
    }catch(err){
      const m = String((err && err.message) || "");
      if(err.status === 404 || m.indexOf("No hay conexión") >= 0){
        throw new Error("el servicio de revisión todavía no está desplegado en Supabase (falta la Edge Function «revisar-portafolio»)");
      }
      if(err.status === 503){
        throw new Error("el servicio de revisión está desplegado pero le falta la clave del proveedor");
      }
      if(err.status === 504){
        throw new Error("la revisión tardó demasiado. Vuelve a intentarlo");
      }
      if(err.datos && err.datos.error){ throw new Error(err.datos.error); }
      throw err;
    }
  }

  /* ---------- Rondas ---------- */
  if(ruta === "/rondas" && metodo === "GET"){
    const r = await sbAuth("/rest/v1/rondas?select=*&order=creada_en.desc", {method:"GET"});
    return {rondas: r || []};
  }

  if(ruta === "/rondas" && metodo === "POST"){
    const fila = Object.assign({}, b.ronda);
    delete fila.id;
    const enviar = f => sbAuth("/rest/v1/rondas", {
      method: "POST",
      headers: {"Prefer":"return=representation"},
      body: JSON.stringify(f)
    });
    let r;
    try{
      r = await enviar(fila);
    }catch(err){
      /* Si la base todavía no tiene la columna «visual» —porque no
         se ha corrido la migración— la ronda se guarda igual, sin
         esas métricas, en vez de perderse. */
      const m = String((err && err.message) || "");
      if(/visual/.test(m) && /column|columna|schema cache|PGRST204/i.test(m)){
        const sinVisual = Object.assign({}, fila);
        delete sinVisual.visual;
        r = await enviar(sinVisual);
        avisar("La ronda se guardó, pero sin las métricas visuales: falta correr la migración de Supabase (columna «visual»).");
      } else {
        throw err;
      }
    }
    return {ronda: (r && r[0]) ? r[0] : fila};
  }

  if(ruta === "/rondas" && metodo === "DELETE"){
    await sbAuth("/rest/v1/rondas?usuario_id=eq." + encodeURIComponent(Cuenta.sesion.id),
      {method:"DELETE", headers:{"Prefer":"return=minimal"}});
    return null;
  }

  if(ruta.indexOf("/rondas/") === 0 && metodo === "DELETE"){
    const id = decodeURIComponent(ruta.slice(8));
    await sbAuth("/rest/v1/rondas?id=eq." + encodeURIComponent(id),
      {method:"DELETE", headers:{"Prefer":"return=minimal"}});
    return null;
  }

  if(ruta.indexOf("/rondas/") === 0 && ruta.indexOf("/observaciones") > 0 && metodo === "PATCH"){
    const id = decodeURIComponent(ruta.slice(8, ruta.lastIndexOf("/observaciones")));
    await sbAuth("/rest/v1/rondas?id=eq." + encodeURIComponent(id), {
      method:"PATCH", headers:{"Prefer":"return=minimal"},
      body: JSON.stringify({observaciones: b.observaciones})
    });
    return null;
  }

  /* ---------- Administración ---------- */
  if(ruta === "/admin/rondas" && metodo === "GET"){
    const r = await sbAuth("/rest/v1/rondas_admin?select=*&order=creada_en.desc", {method:"GET"});
    return {rondas: r || []};
  }

  if(ruta === "/admin/usuarios" && metodo === "GET"){
    /* El panel del CDP lee de «perfiles_admin», no de «perfiles».
       La vista es la que decide quién entra en el consolidado —hoy,
       solo las cuentas con el correo confirmado—, así que la regla
       vive en la base de datos y no repartida por el navegador.

       Si la vista todavía no existe, se cae a «perfiles» para no
       dejar el panel vacío, y se marca el aviso para que salga en
       pantalla en vez de pasar desapercibido. */
    /* FILTRO_ACTIVIDAD deja fuera a quien nunca inició sesión:
       «ultimo_acceso» se escribe en cada entrada, así que estar en
       null significa cuenta creada y jamás usada. Solo filtra lo que
       ve el administrador: no borra ni modifica nada en la base. */
    try{
      const r = await sbAuth("/rest/v1/" + VISTA_ADMIN_PERFILES +
        "?select=*&" + FILTRO_ACTIVIDAD + "&order=creado_en.desc", {method:"GET"});
      return {usuarios: r || [], fuente: VISTA_ADMIN_PERFILES};
    }catch(err){
      if(!esVistaInexistente(err)){ throw err; }
      const r = await sbAuth("/rest/v1/perfiles?select=*&" + FILTRO_ACTIVIDAD +
        "&order=creado_en.desc", {method:"GET"});
      return {usuarios: r || [], fuente: "perfiles", faltaVista: true};
    }
  }

  /* ---------- Observaciones con IA (Edge Function) ---------- */
  if(ruta === "/observaciones" && metodo === "POST"){
    try{
      return await sbAuth("/functions/v1/observaciones", {method:"POST", body: JSON.stringify(b)});
    }catch(err){
      /* Cuando la función no está desplegada, el gateway devuelve 404
         sin permitir la cabecera Content-Type en CORS, así que el
         navegador lo reporta como fallo de red. Se traduce a algo
         que de verdad explique qué falta. */
      const m = String(err && err.message || "");
      if(err.status === 404 || m.indexOf("No hay conexión") >= 0){
        throw new Error("el servicio de IA todavía no está desplegado en Supabase (falta la Edge Function «observaciones»)");
      }
      if(err.status === 503){
        throw new Error("el servicio de IA está desplegado pero le falta la clave del proveedor");
      }
      if(err.status === 504){
        throw new Error("el servicio de IA tardó demasiado en responder. Vuelve a intentarlo");
      }
      if(err.status === 429 && err.datos && err.datos.error){
        /* Es el tope diario por persona, no el límite de intentos de
           Supabase: hay que mostrar el mensaje tal como lo escribió
           la función, no el genérico de «demasiados intentos». */
        throw new Error(err.datos.error);
      }
      throw err;
    }
  }

  throw new Error("Operación no disponible.");
}

/* ============================================================
   MODO DEMOSTRACIÓN
   ------------------------------------------------------------
   Mientras no exista la API de la Universidad, todo el flujo de
   cuentas funciona contra este backend simulado en localStorage,
   para poder mostrar y probar el registro completo.

   NO ES SEGURO Y NO DEBE USARSE CON DATOS REALES:
   los datos viven en el navegador de cada persona, el código de
   verificación se muestra en pantalla en lugar de enviarse por
   correo, y no hay servidor que valide nada. Al configurar
   API_BASE, esta capa se apaga sola y no vuelve a usarse.
   ============================================================ */
const LLAVE_DEMO_USUARIOS = "estudio-pitch:demo:usuarios";
const LLAVE_DEMO_RONDAS   = "estudio-pitch:demo:rondas";

async function huella(texto){
  try{
    if(window.crypto && crypto.subtle){
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ep::" + texto));
      return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
    }
  }catch(_){}
  let h = 5381;
  for(let i=0;i<texto.length;i++){ h = ((h*33) ^ texto.charCodeAt(i)) >>> 0; }
  return "d" + h.toString(16);
}

function codigoDemo(){
  try{
    if(window.crypto && crypto.getRandomValues){
      const a = new Uint32Array(1); crypto.getRandomValues(a);
      return String(a[0] % 1000000).padStart(6,"0");
    }
  }catch(_){}
  return String(Math.floor(Math.random()*1000000)).padStart(6,"0");
}

const Demo = {
  usuarios(){ return leerJSON(LLAVE_DEMO_USUARIOS, {}); },
  guardarUsuarios(u){ escribirJSON(LLAVE_DEMO_USUARIOS, u); },
  rondas(){ return leerJSON(LLAVE_DEMO_RONDAS, {}); },
  guardarRondas(r){ escribirJSON(LLAVE_DEMO_RONDAS, r); },
  usuarioDeToken(){
    const s = Cuenta.sesion;
    if(!s || !s.correo) return null;
    return this.usuarios()[s.correo] || null;
  }
};

async function demoAPI(ruta, metodo, cuerpo){
  const us = Demo.usuarios();
  const b = cuerpo || {};

  if(ruta === "/auth/registro" && metodo === "POST"){
    const u = us[b.correo];
    if(u && u.verificado){ throw new Error("Ese correo ya está registrado. Inicia sesión."); }
    if(!b.acuerdo || b.acuerdo.aceptado !== true){ throw new Error("Debes aceptar el acuerdo de confidencialidad."); }
    const codigo = codigoDemo();
    us[b.correo] = {
      id: "demo-" + (await huella(b.correo)).slice(0,12),
      correo: b.correo,
      nombre: b.nombre || "",
      facultad: b.facultad || "",
      programa: b.programa || "",
      rol: ADMINS_DEMO.indexOf(b.correo) >= 0 ? "admin" : "usuario",
      claveHash: await huella(b.clave),
      codigoHash: await huella(codigo),
      vence: Date.now() + 600000,
      intentos: 0,
      verificado: false,
      acuerdo_version: b.acuerdo.version,
      acuerdo_fecha: b.acuerdo.fecha
    };
    Demo.guardarUsuarios(us);
    return {mensaje:"Código generado", codigo_demo: codigo};
  }

  if(ruta === "/auth/codigo" && metodo === "POST"){
    const u = us[b.correo];
    if(!u){ throw new Error("No hay registro pendiente para ese correo."); }
    const codigo = codigoDemo();
    u.codigoHash = await huella(codigo);
    u.vence = Date.now() + 600000;
    u.intentos = 0;
    Demo.guardarUsuarios(us);
    return {mensaje:"Código regenerado", codigo_demo: codigo};
  }

  if(ruta === "/auth/verificar" && metodo === "POST"){
    const u = us[b.correo];
    if(!u){ throw new Error("No hay registro pendiente para ese correo."); }
    if(Date.now() > u.vence){ throw new Error("El código venció. Pide uno nuevo."); }
    if(u.intentos >= 5){ throw new Error("Demasiados intentos. Pide un código nuevo."); }
    if(await huella(String(b.codigo)) !== u.codigoHash){
      u.intentos++; Demo.guardarUsuarios(us);
      throw new Error("El código no es correcto.");
    }
    u.verificado = true; u.codigoHash = null; u.intentos = 0;
    Demo.guardarUsuarios(us);
    return {token:"demo-" + u.id, usuario:{id:u.id, correo:u.correo, nombre:u.nombre,
            facultad:u.facultad, programa:u.programa, rol:u.rol}};
  }

  if(ruta === "/auth/sesion" && metodo === "POST"){
    const u = us[b.correo];
    if(!u || u.claveHash !== await huella(b.clave)){ throw new Error("Correo o contraseña incorrectos."); }
    if(!u.verificado){ throw new Error("Debes verificar tu correo antes de entrar."); }
    return {token:"demo-" + u.id, usuario:{id:u.id, correo:u.correo, nombre:u.nombre,
            facultad:u.facultad, programa:u.programa, rol:u.rol}};
  }

  /* En demostración no hay correo que enviar. Se responde igual que
     Supabase —sin decir si la cuenta existe— y la interfaz avisa de
     que el enlace no va a llegar a ninguna parte. */
  if(ruta === "/auth/recuperar" && metodo === "POST"){
    return {mensaje:"Sin correo en modo demostración", demo:true};
  }

  const yo = Demo.usuarioDeToken();
  if(!yo){ throw new Error("Tu sesión expiró. Vuelve a entrar."); }
  const todas = Demo.rondas();

  if(ruta === "/auth/clave" && metodo === "POST"){
    const u = us[yo.correo];
    if(!u){ throw new Error("No encontramos tu cuenta."); }
    u.claveHash = await huella(b.clave);
    Demo.guardarUsuarios(us);
    return {mensaje:"Contraseña actualizada"};
  }

  if(ruta === "/rondas" && metodo === "GET"){ return {rondas: todas[yo.correo] || []}; }

  if(ruta === "/rondas" && metodo === "POST"){
    const r = Object.assign({}, b.ronda, {id: idLocal().replace("loc-","dem-")});
    todas[yo.correo] = (todas[yo.correo] || []).concat([r]);
    Demo.guardarRondas(todas);
    return {ronda: r};
  }

  if(ruta === "/rondas" && metodo === "DELETE"){
    delete todas[yo.correo]; Demo.guardarRondas(todas); return null;
  }

  if(ruta.indexOf("/rondas/") === 0 && ruta.indexOf("/observaciones") > 0 && metodo === "PATCH"){
    const id = decodeURIComponent(ruta.slice(8, ruta.lastIndexOf("/observaciones")));
    (todas[yo.correo] || []).forEach(r=>{ if(r.id === id){ r.observaciones = b.observaciones; } });
    Demo.guardarRondas(todas); return null;
  }

  if(ruta.indexOf("/rondas/") === 0 && metodo === "DELETE"){
    const id = decodeURIComponent(ruta.slice(8));
    todas[yo.correo] = (todas[yo.correo] || []).filter(r => r.id !== id);
    Demo.guardarRondas(todas); return null;
  }

  if(ruta === "/admin/usuarios" && metodo === "GET"){
    if(yo.rol !== "admin"){ throw new Error("Requiere rol de administrador."); }
    return {usuarios: Object.keys(us).map(c=>{
      const u = us[c];
      return {id:u.id, correo:u.correo, nombre:u.nombre, facultad:u.facultad,
              programa:u.programa, rol:u.rol, creado_en:null, ultimo_acceso:null};
    })};
  }

  if(ruta === "/admin/rondas" && metodo === "GET"){
    if(yo.rol !== "admin"){ throw new Error("Requiere rol de administrador."); }
    const salida = [];
    Object.keys(todas).forEach(correo=>{
      const u = us[correo] || {};
      (todas[correo] || []).forEach(r=> salida.push(Object.assign(
        {correo: correo, nombre: u.nombre || "", facultad: u.facultad || "", programa: u.programa || ""}, r)));
    });
    return {rondas: salida};
  }

  if(ruta === "/observaciones"){
    throw new Error("el servicio de IA requiere el servidor de la Universidad");
  }

  if(ruta === "/traducir"){
    throw new Error("la traducción con inteligencia artificial requiere el servidor de la Universidad");
  }

  if(ruta === "/revisar-portafolio"){
    throw new Error("la revisión con inteligencia artificial requiere el servidor de la Universidad");
  }

  throw new Error("Operación no disponible en modo demostración.");
}

/* ============================================================
   CLIENTE DE LA API
   ============================================================ */
async function api(ruta, metodo, cuerpo){
  if(haySupabase()){ return await supabaseAPI(ruta, metodo, cuerpo); }
  if(!hayServidor()){ return await demoAPI(ruta, metodo, cuerpo); }
  const cab = {"Accept":"application/json"};
  if(cuerpo){ cab["Content-Type"] = "application/json"; }
  if(Cuenta.sesion && Cuenta.sesion.token){ cab["Authorization"] = "Bearer " + Cuenta.sesion.token; }

  let resp;
  try{
    resp = await fetch(API_BASE.replace(/\/$/,"") + ruta, {
      method: metodo,
      headers: cab,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
  }catch(_){
    throw new Error("No hay conexión con el servidor.");
  }

  if(resp.status === 401 && Cuenta.sesion){
    Cuenta.sesion = null;
    Cuenta.pintar();
    avisarCambio();
    throw new Error("Tu sesión expiró. Vuelve a entrar.");
  }
  if(resp.status === 204){ return null; }

  let datos = null;
  try{ datos = await resp.json(); }catch(_){}
  if(!resp.ok){
    throw new Error((datos && datos.error) ? datos.error : "Error " + resp.status + " del servidor.");
  }
  return datos;
}

/* ============================================================
   ALMACÉN DE RONDAS
   ------------------------------------------------------------
   Con sesión  → servidor de la Universidad.
   Sin sesión  → localStorage de este navegador.
   El audio no se guarda en ninguno de los dos casos.
   ============================================================ */
const Almacen = {
  async listar(){
    if(!Cuenta.sesion){ return []; }
    const r = await api("/rondas", "GET");
    const lista = (r && r.rondas) ? r.rondas : [];
    return lista.slice().sort((a,b)=> String(b.creada_en).localeCompare(String(a.creada_en)));
  },

  async guardar(ronda){
    if(!Cuenta.sesion){ const e = new Error("SIN_CUENTA"); e.sinCuenta = true; throw e; }
    const r = await api("/rondas", "POST", {ronda});
    return (r && r.ronda) ? r.ronda : ronda;
  },

  async borrar(id){
    if(!Cuenta.sesion){ return; }
    await api("/rondas/" + encodeURIComponent(id), "DELETE");
  },

  async borrarTodo(){
    if(!Cuenta.sesion){ return; }
    await api("/rondas", "DELETE");
  },

  /* Guarda las observaciones junto a la ronda para que no se
     vuelvan a generar distintas cada vez que se abre el reporte. */
  async guardarObservaciones(id, texto){
    if(!Cuenta.sesion || !id){ return; }
    try{ await api("/rondas/" + encodeURIComponent(id) + "/observaciones", "PATCH", {observaciones: texto}); }
    catch(_){}
  }
};

/* Sin cuenta no se guarda nada, ni siquiera en este navegador.
   Esto limpia lo que hubieran dejado versiones anteriores. */
function limpiarRastrosLocales(){
  try{ localStorage.removeItem(LLAVE_RONDAS); }catch(_){}
  try{ localStorage.removeItem(LLAVE_SESION); }catch(_){}
}

/* ============================================================
   VERIFICACIÓN POR ENLACE
   ------------------------------------------------------------
   Si la plantilla de correo quedó configurada con enlace en vez
   de código, Supabase devuelve a la persona a esta página con la
   sesión en la URL. Aquí se recoge y se limpia la barra de
   direcciones para no dejar el token a la vista.
   ============================================================ */
function limpiarURL(){
  try{
    history.replaceState(null, "", window.location.pathname + window.location.search.replace(/[?&](token_hash|type)=[^&]*/g,"").replace(/^&/,"?"));
    if(window.location.hash){ history.replaceState(null, "", window.location.pathname + window.location.search); }
  }catch(_){}
}

/* A dónde debe volver el correo de recuperación. Es la página que
   está abierta: así el enlace regresa donde la persona pidió el
   cambio. Desde un archivo local no hay dirección pública que dar,
   y Supabase usa entonces la Site URL del proyecto. */
function destinoRecuperacion(){
  try{
    if(window.location.protocol === "file:"){ return ""; }
    return window.location.origin + window.location.pathname;
  }catch(_){ return ""; }
}

/* Las páginas llaman a sesionDesdeURL() desde un script al final del
   cuerpo, cuando el documento todavía se está leyendo y el modal aún
   no se ha inyectado. Los caminos que responden sin esperar a la red
   —el enlace vencido— llegaban antes que él y se quedaban sin dónde
   escribir. Esto los hace esperar a que exista. */
function conModal(fn){
  if(document.getElementById("modal-cuenta")){ fn(); return; }
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(fn, 0); }, {once:true});
}

async function sesionDesdeURL(){
  if(!haySupabase() || Cuenta.sesion){ return false; }
  const hash = window.location.hash || "";
  const q = new URLSearchParams(window.location.search || "");
  let datos = null, tipo = "";

  if(hash.indexOf("access_token=") >= 0){
    const h = new URLSearchParams(hash.replace(/^#/,""));
    tipo = h.get("type") || "";
    datos = {access_token: h.get("access_token"), refresh_token: h.get("refresh_token")};
  } else if(q.get("token_hash")){
    tipo = q.get("type") || "signup";
    datos = {token_hash: q.get("token_hash"), tipo: tipo};
  } else if(hash.indexOf("error") >= 0){
    /* El enlace de recuperación vencido llega por aquí. Antes se
       descartaba en silencio y la persona no sabía qué había pasado. */
    const h = new URLSearchParams(hash.replace(/^#/,""));
    const cod = h.get("error_code") || "";
    limpiarURL();
    if(/expired|otp/i.test(cod + " " + (h.get("error_description") || ""))){
      conModal(function(){
        abrirModal("recuperar");
        msgModal("Ese enlace ya venció. Pide uno nuevo con tu correo institucional.");
      });
    }
    return false;
  }
  if(!datos){ return false; }

  try{
    const r = await api("/auth/desde-url", "POST", datos);
    Cuenta.guardarSesion(r);
    limpiarURL();
    /* Recuperación: la sesión sirve solo para poder escribir la
       contraseña nueva, así que se pide de una vez en lugar de
       dejar a la persona dentro sin saber que ya puede cambiarla. */
    if(tipo === "recovery"){
      conModal(function(){
        abrirModal("nueva");
        msgModal("Escribe la contraseña que vas a usar de ahora en adelante.", "ok");
      });
    }
    return true;
  }catch(_){
    Cuenta.sesion = null;
    limpiarURL();
    if(tipo === "recovery"){
      conModal(function(){
        abrirModal("recuperar");
        msgModal("Ese enlace ya venció o no es válido. Pide uno nuevo.");
      });
    }
    return false;
  }
}

/* ============================================================
   PANEL DE CUENTA
   ============================================================ */
let modoModal = "entrar";

function abrirModal(modo){
  modoModal = modo || "entrar";
  pintarModal();
  $("#modal-cuenta").hidden = false;
  /* En «nueva» el correo está oculto: el cursor va a la contraseña. */
  const foco = modoModal === "nueva" ? "#c-clave" : "#c-correo";
  setTimeout(()=>{ const c = $(foco); if(c) c.focus(); }, 40);
}
function cerrarModal(){
  $("#modal-cuenta").hidden = true;
  msgModal("");
  detenerRelojCodigo();
  $("#form-cuenta").reset();
  llenarProgramas();
  /* Las pantallas de recuperación son de paso: al volver a abrir el
     modal se empieza otra vez por el inicio de sesión. */
  if(modoModal === "recuperar" || modoModal === "enviado" || modoModal === "nueva"){
    modoModal = "entrar";
  }
}

/* Estados del modal:
     entrar     → correo y contraseña
     registro   → además facultad, programa, nombre y acuerdo
     codigo     → confirmación del correo tras crear la cuenta
     recuperar  → solo el correo, para pedir el enlace de cambio
     enviado    → aviso de «revisa tu correo», con salida al login
     nueva      → contraseña nueva, ya con el enlace abierto        */
function pintarModal(){
  const cod = modoModal === "codigo";
  const reg = modoModal === "registro";
  const rec = modoModal === "recuperar";
  const env = modoModal === "enviado";
  const nue = modoModal === "nueva";
  const ent = modoModal === "entrar";
  const suelto = rec || env || nue;          /* fuera del vaivén entrar/registro */

  $("#modal-demo").hidden = hayBackend();
  $("#vista-codigo").hidden  = !cod;
  $("#vista-enviado").hidden = !env;
  $("#form-cuenta").hidden = cod || env;
  $(".modal-tabs").style.display = (cod || suelto) ? "none" : "";
  $("#sub-principal").hidden = cod || suelto;
  $("#modal-titulo").textContent =
      cod ? "Verifica tu correo"
    : rec ? "¿Olvidaste tu contraseña?"
    : env ? "Revisa tu correo"
    : nue ? "Crea una contraseña nueva"
    : "Guarda tu progreso";
  /* La nota sobre audio e historial no viene a cuento mientras se
     recupera la contraseña, así que se calla en esas pantallas. */
  $("#nota-datos").hidden = suelto;
  $("#sub-recuperar").hidden = !rec;
  $("#sub-nueva").hidden     = !nue;

  $("#tab-entrar").setAttribute("aria-selected", reg ? "false":"true");
  $("#tab-registro").setAttribute("aria-selected", reg ? "true":"false");
  $("#bloque-academico").hidden = !reg;
  $("#bloque-acuerdo").hidden = !reg;
  $("#campo-nombre").hidden = !reg;
  /* Recuperar pide solo el correo; la contraseña nueva no lo pide,
     porque el enlace del correo ya dijo de quién es la cuenta. */
  $("#campo-correo").hidden = nue;
  $("#campo-clave").hidden  = rec;
  $("#campo-clave2").hidden = !nue;
  $("#bloque-olvide").hidden = !ent;
  /* required en un campo oculto impide enviar el formulario y el
     navegador no puede decir dónde está el error. */
  $("#c-correo").required = !nue;
  $("#c-clave").required  = !rec;
  $("#c-clave2").required = nue;

  $("#c-enviar").textContent =
      reg ? "Enviar código de verificación"
    : rec ? "Enviar enlace"
    : nue ? "Guardar contraseña"
    : "Entrar";
  $("#c-cancelar").textContent = rec ? "Volver al inicio de sesión" : "Cancelar";
  $("#c-clave-label").textContent = nue ? "Nueva contraseña" : "Contraseña";
  $("#c-clave").setAttribute("autocomplete", (reg || nue) ? "new-password" : "current-password");
  $("#ayuda-clave").textContent = (reg || nue)
    ? "Mínimo 8 caracteres. No uses la misma contraseña de tu correo institucional."
    : "";
  msgModal("");
}

/* --- Código de verificación --- */
let correoPendiente = "", relojCodigo = null;

function irAVistaCodigo(correo, codigoDemo){
  correoPendiente = correo;
  modoModal = "codigo";
  pintarModal();
  $("#codigo-destino").textContent = correo;
  $("#c-codigo").value = "";

  /* Con la plantilla por defecto de Supabase llega un ENLACE, no un
     código. En ese caso no se le exige a nadie escribir seis dígitos. */
  const porEnlace = (MODO_CONFIRMACION === "enlace") && !codigoDemo;

  $("#titulo-envio").textContent = porEnlace
    ? "Te enviamos un correo."
    : "Te enviamos un código de verificación.";
  $("#texto-envio").textContent = porEnlace
    ? "Abre el enlace de confirmación para activar tu cuenta."
    : "Escríbelo abajo para activar tu cuenta.";

  $("#caja-codigo").hidden        = porEnlace;
  $("#c-verificar").hidden        = porEnlace;
  $("#c-cerrar-aviso").hidden     = !porEnlace;
  $("#c-mostrar-codigo").hidden   = !porEnlace;
  $("#c-reenviar").textContent    = porEnlace ? "Reenviar correo" : "Reenviar código";

  if(!porEnlace){
    arrancarRelojCodigo(600);
    setTimeout(()=>{ const c = $("#c-codigo"); if(c) c.focus(); }, 60);
  } else {
    detenerRelojCodigo();
  }
  $("#c-cambiar").hidden = true;   // en el alta recién hecha basta con «Volver atrás»
  if(codigoDemo){ mostrarCodigoDemo(codigoDemo); }
}

/* Salida por si la persona prefiere escribir un código que ya recibió. */
function revelarCampoCodigo(){
  $("#caja-codigo").hidden = false;
  $("#c-verificar").hidden = false;
  $("#c-mostrar-codigo").hidden = true;
  arrancarRelojCodigo(600);
  setTimeout(()=>{ const c = $("#c-codigo"); if(c) c.focus(); }, 60);
}

/* Pantalla de estado para quien ya tiene cuenta pero no la confirmó.
   Se llega aquí al intentar iniciar sesión. No deja pasar: la sesión
   ya se cerró antes de mostrarla. */
function irAVistaPendiente(correo){
  correoPendiente = correo || correoPendiente;
  modoModal = "codigo";
  abrirModal("codigo");
  pintarModal();

  $("#modal-titulo").textContent = "Cuenta pendiente de verificación";
  $("#titulo-envio").textContent = "Tu cuenta existe, pero falta confirmar el correo.";
  $("#texto-envio").textContent  = MSG_SIN_CONFIRMAR;
  $("#codigo-destino").textContent = correoPendiente;

  $("#caja-codigo").hidden      = MODO_CONFIRMACION === "enlace";
  $("#c-verificar").hidden      = MODO_CONFIRMACION === "enlace";
  $("#c-mostrar-codigo").hidden = MODO_CONFIRMACION !== "enlace";
  $("#c-reenviar").textContent  = "Reenviar correo de confirmación";
  $("#c-reenviar").hidden       = false;
  $("#c-cambiar").hidden        = false;
  $("#c-cerrar-aviso").hidden   = false;
  detenerRelojCodigo();
  msgModal(MSG_SIN_CONFIRMAR);
}

function mostrarCodigoDemo(codigo){
  const c = $("#modal-msg");
  c.innerHTML = "En modo demostración no se envía correo. Tu código es:" +
                '<span class="codigo-demo">' + esc(codigo) + "</span>";
  c.className = "modal-msg ok";
  c.hidden = false;
}

function arrancarRelojCodigo(segundos){
  detenerRelojCodigo();
  let quedan = segundos;
  const pinta = ()=>{
    $("#codigo-reloj").textContent = mmss(quedan);
    if(quedan <= 0){
      detenerRelojCodigo();
      $("#codigo-reloj").textContent = "0:00";
      msgModal("El código venció. Presiona «Reenviar código» para recibir uno nuevo.");
    }
    quedan--;
  };
  pinta();
  relojCodigo = setInterval(pinta, 1000);
}
function detenerRelojCodigo(){
  if(relojCodigo){ clearInterval(relojCodigo); relojCodigo = null; }
}

/* Listas encadenadas: facultad → programa */
function llenarFacultades(){
  const sf = $("#c-facultad");
  sf.innerHTML = '<option value="">Selecciona tu facultad…</option>' +
    Object.keys(FACULTADES).map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join("");
  sf.addEventListener("change", llenarProgramas);
}
function llenarProgramas(){
  const f = $("#c-facultad").value;
  const sp = $("#c-programa");
  const lista = FACULTADES[f];
  if(!lista){
    sp.innerHTML = '<option value="">Primero elige la facultad</option>';
    sp.disabled = true;
    return;
  }
  sp.innerHTML = '<option value="">Selecciona tu programa…</option>' +
    lista.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join("");
  sp.disabled = false;
}
/* ── Recuperación de contraseña: los dos pasos de la interfaz ──── */

/* Paso 1: pedir el enlace. */
async function enviarRecuperacion(){
  const correo = $("#c-correo").value.trim().toLowerCase();
  const btn = $("#c-enviar"), etiqueta = btn.textContent;
  btn.disabled = true; btn.textContent = "Enviando…";
  try{
    const r = await Cuenta.recuperar(correo);
    correoPendiente = correo;
    modoModal = "enviado";
    pintarModal();
    $("#enviado-destino").textContent = correo;
    if(r && r.demo){
      msgModal("En modo demostración no se envía correo, así que el enlace no va a llegar. El servicio de cuentas de la Universidad todavía no está conectado.");
    }else{
      msgModal("Te enviamos un enlace para restablecer tu contraseña.", "ok");
    }
  }catch(err){
    msgModal((err && err.message) || "No fue posible enviar el correo de recuperación.");
  }finally{
    btn.disabled = false; btn.textContent = etiqueta;
  }
}

/* Paso 2: guardar la contraseña nueva. Solo se llega aquí con la
   sesión que abrió el enlace del correo. */
async function guardarClaveNueva(){
  const clave  = $("#c-clave").value;
  const clave2 = $("#c-clave2").value;
  if(clave.length < 8){ msgModal("La contraseña debe tener al menos 8 caracteres."); return; }
  if(clave !== clave2){ msgModal("Las dos contraseñas no coinciden."); return; }

  const btn = $("#c-enviar"), etiqueta = btn.textContent;
  btn.disabled = true; btn.textContent = "Guardando…";
  try{
    await Cuenta.cambiarClave(clave);
    cerrarModal();
    modoModal = "entrar";
    /* La sesión del enlace ya es una sesión normal, así que no hay
       que volver a entrar: se avisa a la página como en cualquier
       inicio de sesión. */
    avisarEntrada("Contraseña actualizada.");
    avisar("Tu contraseña quedó actualizada y ya estás dentro de tu cuenta.");
  }catch(err){
    msgModal((err && err.message) || "No fue posible guardar la contraseña nueva.");
  }finally{
    btn.disabled = false; btn.textContent = etiqueta;
  }
}

function msgModal(txt, tipo){
  const c = $("#modal-msg");
  c.textContent = txt || "";
  c.className = "modal-msg " + (tipo || "error");
  c.hidden = !txt;
}

/* ============================================================
   OBSERVACIONES CON IA
   ------------------------------------------------------------
   Las redacta siempre el modelo, nunca una plantilla local.
   Se envía el contexto de la persona y su historial para que el
   análisis sea distinto para cada quien y note la evolución.
   Requiere cuenta: sin sesión no hay a quién personalizar ni
   dónde guardar el resultado.
   ============================================================ */

/* ══════════════════════════════════════════════════════════════
   EL MODAL DE CUENTA: MARCADO, ESTILOS Y MANEJADORES
   --------------------------------------------------------------
   Vivían repartidos entre cabeza.html y parte-js.js del Pitch. Al
   estar aquí, cualquier página que cargue auth.js tiene el
   registro y el inicio de sesión completos sin copiar una línea.

   Los estilos declaran sus propias variables acotadas al modal y a
   los botones de cuenta, con los valores institucionales. Así no
   dependen de las variables que defina cada página ni las pisan:
   el Pitch, la portada y el portafolio usan nombres distintos para
   sus colores y las tres funcionan igual.
   ══════════════════════════════════════════════════════════════ */

const MODAL_CSS = `
#modal-cuenta, .zona-cuenta {
  --azul-900:#001459; --azul-700:#1E306E; --azul-500:#25409A; --oro:#001459;
  --surface:#FFFFFF; --surface-2:#F5F7FC; --line:#D9E1EE; --line-fuerte:#B9C6DC;
  --texto:#0A1330; --texto-2:#4B5670; --texto-3:#8895A4;
  --bien:#158A5E; --bien-suave:#E4F2EC; --ajusta:#B4741F; --ajusta-suave:#FBF1DE;
  --revisa:#A3252F; --revisa-suave:#FAE8E9;
  --sombra-alta:0 2px 6px rgba(0,20,89,.08), 0 20px 40px -18px rgba(0,20,89,.26);
  --r-m:8px; --r-l:12px;
  --font-body:"Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --font-mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
}
.btn{appearance:none;border:none;border-radius:var(--r-m);padding:13px 20px;
  font-weight:650;font-size:15px;display:flex;align-items:center;justify-content:center;gap:9px;
  transition:filter .15s, background .15s, border-color .15s;}
.btn:hover{filter:brightness(1.07)}
.btn:disabled{opacity:.4;cursor:not-allowed;filter:none}
.btn[hidden],.btn-cuenta[hidden]{display:none !important}
.btn-primario{background:var(--azul-900);color:#fff}
.btn-primario:hover{background:var(--azul-700)}
.btn-linea{background:var(--surface);color:var(--azul-900);border:1px solid var(--line-fuerte);font-weight:600}
.btn-linea:hover{background:var(--surface-2);border-color:var(--azul-500)}
.btn-cuenta{appearance:none;background:transparent;border:1px solid rgba(255,255,255,.45);
  color:#fff;border-radius:100px;padding:7px 16px;
  font-size:13px;font-weight:600;transition:background .15s,border-color .15s;}
.btn-cuenta:hover{background:rgba(255,255,255,.14);border-color:#fff}
.btn-cuenta.sec{border-color:rgba(255,255,255,.28);color:#D6E2F4}
.btn-cuenta.sec:hover{background:rgba(255,255,255,.08)}
.sesion-invita{font-size:12.5px;color:#A9BEDE;line-height:1.4;max-width:24ch;display:inline-block}
.sesion-correo{font-weight:600;color:#EAF0F8;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.modal-fondo{position:fixed;inset:0;z-index:100;background:rgba(7,16,30,.72);
  backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px;}
.modal-fondo[hidden]{display:none}
.modal{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-l);
  box-shadow:var(--sombra-alta);width:100%;max-width:430px;padding:30px;
  max-height:90vh;overflow-y:auto;}
.modal h3{font-size:21px;margin-bottom:8px}
.modal>p.sub{font-size:14.5px;color:var(--texto-2);margin-bottom:22px}
.modal-tabs{display:flex;gap:4px;margin-bottom:22px;border-bottom:1px solid var(--line)}
.modal-tab{appearance:none;background:none;border:none;padding:9px 14px;font-size:14px;font-weight:600;
  color:var(--texto-2);border-bottom:2px solid transparent;margin-bottom:-1px;}
.modal-tab[aria-selected="true"]{color:var(--oro);border-bottom-color:var(--oro)}
.campo{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.campo label{font-size:12.5px;font-weight:600;color:var(--texto-2)}
.campo input{font-family:var(--font-body);font-size:15px;padding:11px 13px;border-radius:var(--r-m);
  border:1px solid var(--line);background:var(--surface-2);color:var(--texto);}
.campo input:focus{outline:2px solid var(--oro);outline-offset:1px}
.campo .ayuda{font-size:12px;color:var(--texto-3)}
.campo select{font-family:var(--font-body);font-size:15px;padding:11px 13px;border-radius:var(--r-m);
  border:1px solid var(--line);background:var(--surface-2);color:var(--texto);
  appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--texto-3) 50%),linear-gradient(135deg,var(--texto-3) 50%,transparent 50%);
  background-position:calc(100% - 18px) 50%, calc(100% - 13px) 50%;
  background-size:5px 5px, 5px 5px;background-repeat:no-repeat;padding-right:38px;}
.campo select:focus{outline:2px solid var(--oro);outline-offset:1px}
.campo select:disabled{opacity:.5;cursor:not-allowed}
.campo select optgroup{background:var(--surface);color:var(--texto-3);font-style:normal}
.campo select option{background:var(--surface);color:var(--texto)}
.paso-registro{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--oro);margin:22px 0 12px;padding-top:16px;border-top:1px solid var(--line);}
.aviso-correo{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;
  background:var(--bien-suave);border:1px solid var(--bien);border-radius:var(--r-m);
  padding:14px 16px;font-size:14px;line-height:1.6;color:var(--texto);}
.aviso-correo .rombo{color:var(--bien);font-weight:700}
.aviso-correo strong{display:block;color:var(--bien);margin-bottom:2px}
.campo-codigo{font-family:var(--font-mono) !important;font-size:26px !important;
  letter-spacing:.42em;text-align:center;padding:14px 13px !important;}
.enlace{appearance:none;background:none;border:none;padding:0;
  color:var(--oro);font:inherit;text-decoration:underline;cursor:pointer;}
/* «¿Olvidaste tu contraseña?»: enlace discreto bajo el campo, no un
   botón más, para que no compita con «Entrar». */
.olvide{margin:-6px 0 16px;font-size:13px}
.olvide[hidden]{display:none}
.campo[hidden]{display:none}
/* Algunas páginas declaran su propio display para p; sin esto los
   subtítulos ocultos del modal seguirían viéndose. */
.modal p[hidden], .modal div[hidden]{display:none !important}
.acuerdo{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;
  background:var(--surface-2);border:1px solid var(--line);border-left:2px solid var(--oro);
  border-radius:var(--r-m);padding:15px 16px;margin-top:22px;}
.acuerdo[hidden]{display:none}
.acuerdo input[type="checkbox"]{width:18px;height:18px;margin:2px 0 0;accent-color:var(--oro);flex:none;cursor:pointer;}
.acuerdo label{font-size:13px;line-height:1.6;color:var(--texto-2);cursor:pointer;display:flex;flex-direction:column;gap:10px}
.acuerdo label strong{color:var(--texto);font-weight:650}
.acuerdo a{color:var(--oro)}
.modal-msg{font-size:13.5px;line-height:1.5;padding:11px 13px;border-radius:var(--r-m);margin-bottom:16px}
.modal-msg[hidden]{display:none}
.modal-msg.error{background:var(--revisa-suave);color:var(--revisa);border-left:2px solid var(--revisa)}
.modal-msg.ok{background:var(--bien-suave);color:var(--bien);border-left:2px solid var(--bien)}
.modal-demo{font-size:12.5px;line-height:1.55;padding:12px 14px;border-radius:var(--r-m);margin-bottom:18px;
  background:var(--ajusta-suave);color:var(--ajusta);border-left:2px solid var(--ajusta);}
.modal-demo[hidden]{display:none}
.modal-demo strong{color:inherit;font-weight:700}
.codigo-demo{font-family:var(--font-mono);font-size:22px;letter-spacing:.3em;font-weight:600;
  display:block;margin-top:6px;}
.modal-acciones{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}
.modal-acciones .btn{flex:1;min-width:130px}
.modal-nota{font-size:12.5px;color:var(--texto-3);line-height:1.55;margin-top:20px;
  padding-top:16px;border-top:1px solid var(--line);}
.hist-acciones .btn{padding:8px 14px;font-size:13px}
`;

const MODAL_HTML = `<div class="modal-fondo" id="modal-cuenta" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
    <h3 id="modal-titulo">Guarda tu progreso</h3>
    <p class="sub" id="sub-recuperar" hidden>Escribe tu correo institucional y te enviamos un enlace para crear una contraseña nueva. El enlace sirve una sola vez y vence en una hora.</p>
    <p class="sub" id="sub-nueva" hidden>Abriste el enlace de recuperación, así que ya puedes cambiarla. La contraseña anterior deja de servir en cuanto guardes esta.</p>
    <p class="sub" id="sub-principal">Las herramientas del Centro se pueden usar sin cuenta. Crea una solo si quieres que tu avance se conserve entre sesiones y dispositivos. Tu sesión vale para todas las herramientas del Centro y <strong>se cierra sola al cerrar la pestaña</strong>, así que en un equipo compartido no queda abierta para el siguiente.</p>

    <div class="modal-tabs" role="tablist">
      <button class="modal-tab" id="tab-entrar" role="tab" aria-selected="true">Iniciar sesión</button>
      <button class="modal-tab" id="tab-registro" role="tab" aria-selected="false">Crear cuenta</button>
    </div>

    <div class="modal-demo" id="modal-demo" hidden>
      <strong>Modo demostración.</strong> El servicio de cuentas de la Universidad todavía no está conectado, así que el registro funciona solo dentro de este navegador y el código de verificación se muestra en pantalla en lugar de enviarse por correo. Sirve para probar el flujo completo; <strong>no lo uses con datos reales</strong>.
    </div>

    <div class="modal-msg" id="modal-msg" hidden></div>

    <!-- Vista: confirmación del correo -->
    <div id="vista-codigo" hidden>
      <div class="aviso-correo">
        <span class="rombo" aria-hidden="true">✓</span>
        <div>
          <strong id="titulo-envio">Te enviamos un correo.</strong>
          <span id="texto-envio">Abre el enlace de confirmación para activar tu cuenta.</span>
        </div>
      </div>
      <p class="sub" style="margin:18px 0 20px">Lo enviamos a <strong id="codigo-destino"></strong>. Si no aparece en unos minutos, revisa la carpeta de correo no deseado.</p>

      <div id="caja-codigo" hidden>
        <div class="campo">
          <label for="c-codigo">Código de verificación</label>
          <input type="text" id="c-codigo" inputmode="numeric" autocomplete="one-time-code"
                 maxlength="6" placeholder="000000" class="campo-codigo">
          <span class="ayuda">Vence en <span id="codigo-reloj">10:00</span>.</span>
        </div>
      </div>

      <div class="modal-acciones">
        <button type="button" class="btn btn-primario" id="c-verificar" hidden>Verificar y entrar</button>
        <button type="button" class="btn btn-linea" id="c-reenviar">Reenviar correo de confirmación</button>
        <button type="button" class="btn btn-linea" id="c-cambiar">Cambiar correo</button>
        <button type="button" class="btn btn-linea" id="c-cerrar-aviso">Entendido</button>
      </div>

      <p class="modal-nota">
        <button type="button" class="enlace" id="c-mostrar-codigo">¿Te llegó un código de seis dígitos?</button><br>
        ¿Te equivocaste de correo? <button type="button" class="enlace" id="c-volver">Volver atrás</button>
      </p>
    </div>

    <!-- Vista: enlace de recuperación enviado -->
    <div id="vista-enviado" hidden>
      <div class="aviso-correo">
        <span class="rombo" aria-hidden="true">✓</span>
        <div>
          <strong>Revisa tu correo institucional para crear una nueva contraseña.</strong>
          <span>Abre el enlace desde este mismo navegador y podrás escribirla ahí mismo.</span>
        </div>
      </div>
      <p class="sub" style="margin:18px 0 20px">Lo enviamos a <strong id="enviado-destino"></strong>. Si no aparece en unos minutos, revisa la carpeta de correo no deseado. Si ese correo no tiene cuenta creada, no llegará ningún mensaje.</p>

      <div class="modal-acciones">
        <button type="button" class="btn btn-primario" id="e-volver">Volver al inicio de sesión</button>
        <button type="button" class="btn btn-linea" id="e-reenviar">Enviar otro enlace</button>
      </div>

      <p class="modal-nota">
        El enlace sirve una sola vez y vence en una hora. Si vence, vuelve a pedirlo desde «¿Olvidaste tu contraseña?».
      </p>
    </div>

    <form id="form-cuenta" autocomplete="on" novalidate>
      <div id="bloque-academico" hidden>
        <div class="paso-registro" style="margin-top:0;padding-top:0;border-top:0">Paso 1 — ¿De dónde vienes?</div>
        <div class="campo">
          <label for="c-facultad">¿A qué facultad perteneces?</label>
          <select id="c-facultad" required>
            <option value="">Selecciona tu facultad…</option>
          </select>
        </div>
        <div class="campo">
          <label for="c-programa">¿A qué programa perteneces?</label>
          <select id="c-programa" required disabled>
            <option value="">Primero elige la facultad</option>
          </select>
        </div>
        <div class="paso-registro">Paso 2 — Tus datos de acceso</div>
      </div>
      <div class="campo" id="campo-correo">
        <label for="c-correo">Correo institucional</label>
        <input type="email" id="c-correo" name="email" autocomplete="email" required placeholder="nombre@unisabana.edu.co">
        <span class="ayuda" id="ayuda-correo">Debe terminar en @unisabana.edu.co</span>
      </div>
      <div class="campo" id="campo-clave">
        <label for="c-clave" id="c-clave-label">Contraseña</label>
        <input type="password" id="c-clave" name="password" autocomplete="current-password" required minlength="8">
        <span class="ayuda" id="ayuda-clave"></span>
      </div>
      <div class="campo" id="campo-clave2" hidden>
        <label for="c-clave2">Repite la contraseña nueva</label>
        <input type="password" id="c-clave2" name="password_confirm" autocomplete="new-password" minlength="8">
        <span class="ayuda">Las dos tienen que coincidir.</span>
      </div>
      <p class="olvide" id="bloque-olvide">
        <button type="button" class="enlace" id="c-olvide">¿Olvidaste tu contraseña?</button>
      </p>
      <div class="campo" id="campo-nombre" hidden>
        <label for="c-nombre">Nombre (opcional)</label>
        <input type="text" id="c-nombre" name="name" autocomplete="name" placeholder="Como quieres que aparezca">
      </div>
      <div class="acuerdo" id="bloque-acuerdo" hidden>
        <input type="checkbox" id="c-acuerdo">
        <label for="c-acuerdo">
          <span>Autorizo a la Universidad de La Sabana, a través del <strong>Centro de Desarrollo Profesional</strong>, a almacenar y tratar mis datos de uso, la recurrencia de acceso, las transcripciones de mis prácticas, las retroalimentaciones ofrecidas en la página y las cifras de mis reportes, con el fin de mostrarme mi progreso y elaborar estadísticas agregadas del servicio.</span>
          <span>Entiendo que el audio no se almacena ni se envía a servidores; que las observaciones con inteligencia artificial se generan únicamente cuando las solicito; que la información es <strong>confidencial</strong> y no se comparte con docentes, empleadores ni terceros, salvo obligación legal; y que puedo consultar, corregir o solicitar la eliminación de mis datos conforme a la <a href="#" id="enlace-politica" target="_blank" rel="noopener">Política de Tratamiento de Datos Personales</a> de la Universidad.</span>
        </label>
      </div>

      <div class="modal-acciones">
        <button type="submit" class="btn btn-primario" id="c-enviar">Entrar</button>
        <button type="button" class="btn btn-linea" id="c-cancelar">Cancelar</button>
      </div>
    </form>

    <p class="modal-nota" id="nota-datos">
      Se guardan tu correo, tu facultad, tu programa, tu transcripción y las cifras de cada reporte.
      <strong>La grabación de audio nunca se envía ni se almacena</strong>, tengas cuenta o no.
      Puedes descargar o eliminar todo tu historial desde la sección Reporte.
    </p>
  </div>
</div>`;

/* Se inyecta una sola vez, en cuanto el documento tiene cuerpo. */
function montarModal(){
  if(document.getElementById("modal-cuenta")) return;   /* ya estaba en la página */
  const est = document.createElement("style");
  est.id = "auth-estilos";
  est.textContent = MODAL_CSS;
  document.head.appendChild(est);
  const caja = document.createElement("div");
  caja.innerHTML = MODAL_HTML;
  while(caja.firstChild) document.body.appendChild(caja.firstChild);
  /* El enlace a la política vive en el modal, así que se rellena aquí */
  const pol = document.getElementById("enlace-politica");
  if(pol) pol.href = URL_POLITICA;
}

/* Aviso de entrada: se dispara tras un inicio de sesión o una
   verificación con éxito. Cada página engancha lo suyo —el Pitch
   recarga historial y salta al reporte, la portada muestra el
   panel— sin que este archivo sepa nada de ellas. */
const _alEntrar = [];
function alEntrar(fn){ if(typeof fn === "function") _alEntrar.push(fn); }
function avisarEntrada(txt){
  _alEntrar.forEach(f => { try{ f(Cuenta.sesion, txt); }catch(e){ console.error(e); } });
}

function montarCuenta(){
  montarModal();
  /* Los selects de facultad y programa se rellenan aquí: el modal
     acaba de existir, así que antes no había dónde escribir. */
  llenarFacultades();
  llenarProgramas();
  Cuenta.iniciar();
    /* Solo dígitos en el campo del código */
  $("#c-codigo").addEventListener("input", e=>{
    e.target.value = e.target.value.replace(/\D/g,"").slice(0,6);
  });

  /* --- Panel de cuenta --- */
  $("#tab-entrar").addEventListener("click", ()=>{ modoModal = "entrar"; pintarModal(); });
  $("#tab-registro").addEventListener("click", ()=>{ modoModal = "registro"; pintarModal(); });
  /* Desde «recuperar» el botón secundario no cierra: devuelve al
     inicio de sesión, que es de donde se vino. */
  $("#c-cancelar").addEventListener("click", ()=>{
    if(modoModal === "recuperar"){ modoModal = "entrar"; pintarModal(); return; }
    cerrarModal();
  });

  /* --- Recuperación de contraseña --- */
  $("#c-olvide").addEventListener("click", ()=>{
    const correo = $("#c-correo").value.trim();   /* si ya lo escribió, se conserva */
    modoModal = "recuperar";
    pintarModal();
    $("#c-correo").value = correo;
    setTimeout(()=>{ const c = $("#c-correo"); if(c) c.focus(); }, 40);
  });
  $("#e-volver").addEventListener("click", ()=>{ modoModal = "entrar"; pintarModal(); });
  $("#e-reenviar").addEventListener("click", ()=>{
    modoModal = "recuperar";
    pintarModal();
    $("#c-correo").value = correoPendiente;
  });
  $("#modal-cuenta").addEventListener("click", e=>{ if(e.target.id === "modal-cuenta") cerrarModal(); });
  document.addEventListener("keydown", e=>{
    if(e.key === "Escape" && !$("#modal-cuenta").hidden) cerrarModal();
  });
  
  $("#form-cuenta").addEventListener("submit", async e=>{
    e.preventDefault();
    /* Los dos estados de la recuperación usan el mismo formulario
       pero validan otras cosas, así que salen antes. */
    if(modoModal === "recuperar"){ await enviarRecuperacion(); return; }
    if(modoModal === "nueva"){ await guardarClaveNueva(); return; }

    const correo   = $("#c-correo").value.trim().toLowerCase();
    const clave    = $("#c-clave").value;
    const nombre   = $("#c-nombre").value.trim();
    const facultad = $("#c-facultad").value;
    const programa = $("#c-programa").value;
    const registrando = modoModal === "registro";
  
    if(registrando && !facultad){ msgModal("Selecciona la facultad a la que perteneces."); return; }
    if(registrando && !programa){ msgModal("Selecciona el programa al que perteneces."); return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)){ msgModal("Escribe un correo válido."); return; }
    /* Dominio institucional. Esta comprobación es de cortesía: la que
       de verdad manda está en el servidor, en el disparador
       crear_perfil(), porque el navegador siempre se puede saltar. */
    if(correo.slice(-DOMINIO.length) !== DOMINIO){
      msgModal("Debes utilizar un correo institucional " + DOMINIO); return;
    }
    if(clave.length < 8){ msgModal("La contraseña debe tener al menos 8 caracteres."); return; }
    if(registrando && !$("#c-acuerdo").checked){
      msgModal("Para crear la cuenta debes aceptar el acuerdo de confidencialidad y tratamiento de datos.");
      return;
    }
  
    const btn = $("#c-enviar");
    const txt = btn.textContent;
    btn.disabled = true; btn.textContent = "Un momento…";
    try{
      if(registrando){
        const r = await Cuenta.registrar({
          correo, clave, nombre, facultad, programa,
          acuerdo: {aceptado:true, version:ACUERDO_VERSION, fecha:new Date().toISOString()}
        });
        irAVistaCodigo(correo, r && r.codigo_demo);
        return;
      }
      await Cuenta.entrar(correo, clave);
      cerrarModal();
      avisarEntrada("Sesión iniciada.");
    }catch(err){
      /* Cuenta creada pero sin confirmar: en vez de un aviso suelto se
         muestra la pantalla de estado, con reenviar y cambiar correo. */
      if(err.sinConfirmar || esErrorSinConfirmar(err)){
        irAVistaPendiente(correo);
        return;
      }
      msgModal(err.message || "No se pudo completar la operación.");
    }finally{
      btn.disabled = false; btn.textContent = txt;
    }
  });
  
  /* --- Verificación del código --- */
  $("#c-verificar").addEventListener("click", async ()=>{
    const codigo = $("#c-codigo").value.replace(/\D/g,"");
    if(codigo.length !== 6){ msgModal("El código tiene seis dígitos."); return; }
    const b = $("#c-verificar"); b.disabled = true; b.textContent = "Verificando…";
    try{
      await Cuenta.verificar(correoPendiente, codigo);
      detenerRelojCodigo();
      cerrarModal();
      modoModal = "entrar";
      avisarEntrada("Cuenta verificada.");
    }catch(err){
      msgModal(err.message || "No se pudo verificar el código.");
    }finally{
      b.disabled = false; b.textContent = "Verificar y entrar";
    }
  });
  
  $("#c-reenviar").addEventListener("click", async ()=>{
    const b = $("#c-reenviar"); const etiqueta = b.textContent;
    b.disabled = true; b.textContent = "Enviando…";
    try{
      const r = await Cuenta.reenviarCodigo(correoPendiente);
      arrancarRelojCodigo(600);
      if(r && r.codigo_demo){ mostrarCodigoDemo(r.codigo_demo); }
      else { msgModal("Te reenviamos el correo a " + correoPendiente + ".", "ok"); }
    }catch(err){
      msgModal(err.message || "No se pudo reenviar el código.");
    }finally{
      b.disabled = false; b.textContent = etiqueta;
    }
  });
  
  $("#c-mostrar-codigo").addEventListener("click", revelarCampoCodigo);
  $("#c-cerrar-aviso").addEventListener("click", ()=>{ detenerRelojCodigo(); cerrarModal(); modoModal = "entrar"; });
  $("#c-volver").addEventListener("click", ()=>{
    detenerRelojCodigo();
    modoModal = "registro";
    pintarModal();
  });
  /* Cambiar correo: vuelve al formulario de registro con el campo
     limpio, para crear la cuenta con la dirección correcta. */
  $("#c-cambiar").addEventListener("click", ()=>{
    detenerRelojCodigo();
    correoPendiente = "";
    modoModal = "registro";
    pintarModal();
    const c = $("#c-correo");
    if(c){ c.value = ""; setTimeout(()=>c.focus(), 60); }
    msgModal("Escribe el correo institucional correcto y vuelve a crear la cuenta.");
  });
}

/* Arranca cuando el documento está listo, sin que cada página tenga
   que acordarse de llamarlo. */
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", montarCuenta);
}else{
  montarCuenta();
}
