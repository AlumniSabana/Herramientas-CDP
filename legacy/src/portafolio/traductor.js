/* ══════════════════════════════════════════════════════════════
   TRADUCCIÓN AL INGLÉS
   ------------------------------------------------------------
   Usa el traductor integrado del navegador (API Translator, en
   Chrome y Edge recientes). El modelo se descarga y se ejecuta en
   el equipo: lo que escribe el estudiante NO viaja a ningún
   servidor, que es la misma promesa que hace el resto de la
   herramienta.

   Si el navegador no lo trae (Safari, Firefox, versiones
   antiguas) entra el respaldo: Gemini, a través de una Edge
   Function de Supabase. La clave del proveedor vive en los
   secretos del proyecto y el navegador nunca la ve.

   El orden importa. Primero el traductor del navegador: es
   gratuito, no necesita cuenta y el texto no sale del equipo.
   Solo cuando no existe se recurre a Gemini, que sí exige sesión
   iniciada porque consume cupo de la Universidad.
   ══════════════════════════════════════════════════════════════ */

var Traductor = (function () {
  "use strict";

  var ORIGEN = "es", DESTINO = "en";
  var instancia = null;      /* se crea una vez y se reutiliza */
  var creando = null;        /* promesa en vuelo, para no duplicar descargas */

  function motor() {
    /* La API vive en el objeto global; ha cambiado de sitio entre
       versiones, así que se buscan las dos formas conocidas. */
    if (typeof Translator !== "undefined" && Translator && Translator.create) return Translator;
    if (typeof self !== "undefined" && self.translation && self.translation.createTranslator) {
      return {
        create: function (o) { return self.translation.createTranslator(o); },
        availability: function () { return Promise.resolve("available"); }
      };
    }
    return null;
  }

  function disponible() { return !!motor(); }

  /* ── Respaldo con IA: Gemini tras una Edge Function ─────────
     auth.js es quien sabe hablar con Supabase, así que aquí solo
     se comprueba que esté cargado y que haya sesión. Si el
     portafolio se abre suelto, sin auth.js, esto devuelve false y
     todo sigue funcionando como antes. */
  function hayIA() {
    return typeof api === "function" &&
           typeof Cuenta !== "undefined" &&
           !!(Cuenta && Cuenta.sesion);
  }

  /* ¿Hay alguna forma de traducir, la que sea? */
  function hayAlguna() { return disponible() || hayIA(); }

  /* Por qué no se puede traducir ahora mismo. La interfaz necesita
     distinguir «tu navegador no puede» de «entra a tu cuenta y sí
     puede», porque la salida es distinta en cada caso. */
  function motivoSinTraductor() {
    if (disponible() || hayIA()) return "";
    if (typeof api !== "function") return "sin-soporte";
    return "sin-sesion";
  }

  function traducirConIA(texto) {
    if (!hayIA()) return Promise.reject(new Error("sin-sesion"));
    return api("/traducir", "POST", { texto }).then(function (r) {
      var t = r && r.texto;
      if (!t) throw new Error("respuesta-vacia");
      return t;
    });
  }

  /* "available" | "downloadable" | "downloading" | "unavailable" */
  function estado() {
    var m = motor();
    if (!m) return Promise.resolve("sin-soporte");
    if (!m.availability) return Promise.resolve("available");
    return m.availability({ sourceLanguage: ORIGEN, targetLanguage: DESTINO })
      .then(function (r) { return r; })
      .catch(function () { return "unavailable"; });
  }

  /* Vigilancia: en algunos equipos create() se queda esperando sin
     resolver ni fallar (sin modelo disponible, sin permiso, sin
     red) y la interfaz se quedaría colgada en «Preparando…» para
     siempre. Se le da un plazo corto para arrancar; en cuanto llega
     el primer aviso de descarga se amplía, porque bajar el modelo sí
     puede tardar varios minutos. */
  var ESPERA_ARRANQUE = 20000;   /* 20 s hasta la primera señal */
  var ESPERA_DESCARGA = 300000;  /* 5 min una vez que está bajando */

  function conPlazo(promesa, hayVida) {
    return new Promise(function (resolver, rechazar) {
      var reloj, vivo = false, terminado = false;

      var rearmar = function (ms) {
        clearTimeout(reloj);
        reloj = setTimeout(function () {
          if (terminado) return;
          terminado = true;
          rechazar(new Error(vivo ? "descarga-lenta" : "no-arranca"));
        }, ms);
      };

      hayVida(function () {
        if (terminado) return;
        vivo = true;
        rearmar(ESPERA_DESCARGA);
      });

      rearmar(ESPERA_ARRANQUE);
      promesa.then(function (v) {
        if (terminado) return;
        terminado = true; clearTimeout(reloj); resolver(v);
      }, function (e) {
        if (terminado) return;
        terminado = true; clearTimeout(reloj); rechazar(e);
      });
    });
  }

  /* alProgreso recibe un entero 0–100 mientras baja el modelo */
  function preparar(alProgreso) {
    if (instancia) return Promise.resolve(instancia);
    if (creando) return creando;

    var m = motor();
    if (!m) return Promise.reject(new Error("sin-soporte"));

    creando = estado().then(function (est) {
      if (est === "unavailable") throw new Error("par-no-disponible");
      if (est === "sin-soporte") throw new Error("sin-soporte");

      var avisarVida = null;
      var creacion = m.create({
        sourceLanguage: ORIGEN,
        targetLanguage: DESTINO,
        monitor: function (mon) {
          if (!mon || !mon.addEventListener) return;
          mon.addEventListener("downloadprogress", function (e) {
            if (avisarVida) avisarVida();
            if (!alProgreso) return;
            var total = e.total || 1;
            alProgreso(Math.round((e.loaded / total) * 100));
          });
        }
      });

      return conPlazo(Promise.resolve(creacion), function (marcar) { avisarVida = marcar; });
    }).then(function (t) {
      instancia = t;
      creando = null;
      return t;
    }).catch(function (err) {
      creando = null;
      throw err;
    });

    return creando;
  }

  function traducir(texto, alProgreso) {
    if (!texto || !texto.trim()) return Promise.resolve("");
    if (!disponible() && hayIA()) return traducirConIA(texto);
    return preparar(alProgreso)
      .then(function (t) { return t.translate(texto); })
      .catch(function (err) {
        if (hayIA()) return traducirConIA(texto);
        throw err;
      });
  }

  /* ── Markdown: se traduce el contenido, no la sintaxis ──────
     Si se mandara la línea entera, los asteriscos y las almohadillas
     volverían movidos de sitio. Se separa el prefijo, se traduce lo
     que es prosa y se vuelve a montar. */
  function piezas(linea) {
    var m;
    if (!linea.trim()) return null;
    if (linea.trim() === "---") return null;

    m = /^(#{1,6} )(.*)$/.exec(linea);
    if (m) return { pre: m[1], txt: m[2], post: "" };

    m = /^(> )(.*)$/.exec(linea);
    if (m) return { pre: m[1], txt: m[2], post: "" };

    /* «- [x] tarea» de la lista de verificación */
    m = /^(- \[[ x]\] )(.*)$/.exec(linea);
    if (m) return { pre: m[1], txt: m[2], post: "" };

    m = /^(- )(.*)$/.exec(linea);
    if (m) return { pre: m[1], txt: m[2], post: "" };

    /* «*nota en cursiva*» */
    m = /^\*([^*].*)\*$/.exec(linea.trim());
    if (m) return { pre: "*", txt: m[1], post: "*" };

    return { pre: "", txt: linea, post: "" };
  }

  /* «**Etiqueta:** valor» → etiqueta y valor se traducen por
     separado, para que los asteriscos no se muevan de sitio, y se
     vuelven a unir con un solo espacio: los traductores no respetan
     los espacios de los extremos. */
  function trozosDeLinea(txt) {
    var m = /^\*\*([^*]+)\*\*(.*)$/.exec(txt);
    if (m) return { etiqueta: m[1].trim(), valor: m[2].trim() };
    return { etiqueta: null, valor: txt };
  }

  /* Devuelve el mismo Markdown con la prosa en inglés.

     Con Gemini se manda el documento entero de una vez: el modelo
     entiende el Markdown y lo respeta, así que no hay que
     desarmarlo. Con el traductor del navegador sí, porque traduce
     frases sueltas y devolvería los asteriscos movidos de sitio. */
  function traducirMarkdown(md, alProgreso, alAvance) {
    if (!disponible() && hayIA()) {
      if (alAvance) alAvance(50);
      return traducirConIA(md).then(function (en) {
        if (alAvance) alAvance(100);
        return en;
      });
    }
    return traducirMarkdownEnElEquipo(md, alProgreso, alAvance)
      .catch(function (err) {
        if (hayIA()) return traducirConIA(md);
        throw err;
      });
  }

  function traducirMarkdownEnElEquipo(md, alProgreso, alAvance) {
    var lineas = md.split("\n");
    var hechas = 0;

    return preparar(alProgreso).then(function (t) {
      return lineas.reduce(function (cadena, linea) {
        return cadena.then(function (acc) {
          var p = piezas(linea);
          if (!p || !p.txt.trim()) { acc.push(linea); return acc; }

          var tr = trozosDeLinea(p.txt);
          var partes = tr.etiqueta === null
            ? [t.translate(tr.valor)]
            : [t.translate(tr.etiqueta), tr.valor ? t.translate(tr.valor) : Promise.resolve("")];

          return Promise.all(partes).then(function (en) {
            var cuerpo = tr.etiqueta === null
              ? en[0]
              : "**" + en[0] + "**" + (en[1] ? " " + en[1] : "");
            acc.push(p.pre + cuerpo + p.post);
            hechas++;
            if (alAvance) alAvance(Math.round((hechas / lineas.length) * 100));
            return acc;
          });
        });
      }, Promise.resolve([])).then(function (acc) { return acc.join("\n"); });
    });
  }

  return {
    disponible: disponible,          /* traductor propio del navegador */
    hayIA: hayIA,                    /* respaldo con Gemini */
    hayAlguna: hayAlguna,            /* cualquiera de los dos */
    motivoSinTraductor: motivoSinTraductor,
    estado: estado,
    traducir: traducir,
    traducirMarkdown: traducirMarkdown
  };
})();
