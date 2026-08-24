/* ══════════════════════════════════════════════════════════════
   GENERACIÓN DE PDF
   ------------------------------------------------------------
   Las hojas producen Markdown (armar, armarProyectos, checklistMd).
   Este módulo lo compone en un PDF con la identidad de la
   Universidad, en lugar de entregar el texto crudo.

   Se mantiene el Markdown como fuente única: si mañana cambia la
   redacción de una ficha, cambia en los dos sitios a la vez.
   ══════════════════════════════════════════════════════════════ */

var PDF = (function () {
  "use strict";

  var MM = { ancho: 210, alto: 297 };          /* A4 vertical */
  var MARGEN = { izq: 20, der: 20, sup: 20, inf: 22 };
  var ANCHO = MM.ancho - MARGEN.izq - MARGEN.der;

  var AZUL = [0, 20, 89];
  var AZUL_MEDIO = [37, 64, 154];
  var TINTA = [10, 19, 48];
  var TINTA_SUAVE = [75, 86, 112];
  var TINTA_TENUE = [136, 149, 164];
  var LINEA = [217, 225, 238];

  /* ── Estado de composición ───────────────────────────────── */
  function Lienzo(doc, titulo) {
    this.doc = doc;
    this.titulo = titulo;
    this.y = MARGEN.sup;
    this.pagina = 1;
  }

  Lienzo.prototype.espacio = function (mm) { this.y += mm; };

  Lienzo.prototype.cabeMas = function (mm) {
    return this.y + mm <= MM.alto - MARGEN.inf;
  };

  Lienzo.prototype.nuevaPagina = function () {
    this.doc.addPage();
    this.pagina++;
    this.y = MARGEN.sup;
  };

  Lienzo.prototype.asegurar = function (mm) {
    if (!this.cabeMas(mm)) this.nuevaPagina();
  };

  /* ── Portada: banda azul con la marca ────────────────────── */
  Lienzo.prototype.cabecera = function (logoAlumni, subtitulo) {
    var d = this.doc, alto = 42;
    d.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
    d.rect(0, 0, MM.ancho, alto, "F");

    if (logoAlumni) {
      /* El logo mide 150×84; a 22 mm de ancho conserva la proporción */
      try { d.addImage(logoAlumni, "PNG", MARGEN.izq, 9, 22, 12.32); } catch (e) { /* sin logo */ }
    }

    d.setTextColor(255, 255, 255);
    d.setFont("times", "bolditalic");
    d.setFontSize(19);
    d.text(seguro(this.titulo), MARGEN.izq + 30, 18);

    d.setFont("helvetica", "normal");
    d.setFontSize(8.4);
    d.setTextColor(169, 190, 222);
    d.text(seguro(subtitulo.toUpperCase()), MARGEN.izq + 30, 25.5, { charSpace: 0.6 });

    this.y = alto + 14;
  };

  /* ── Pie de todas las páginas ────────────────────────────── */
  function pies(doc, total, nota) {
    var i, y = MM.alto - 14;
    for (i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(LINEA[0], LINEA[1], LINEA[2]);
      doc.setLineWidth(0.2);
      doc.line(MARGEN.izq, y - 5, MM.ancho - MARGEN.der, y - 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.6);
      doc.setTextColor(TINTA_TENUE[0], TINTA_TENUE[1], TINTA_TENUE[2]);
      doc.text(nota, MARGEN.izq, y);
      doc.text(i + " / " + total, MM.ancho - MARGEN.der, y, { align: "right" });
    }
  }

  /* Las fuentes estándar del PDF sólo cubren Latin-1 más un puñado
     de signos tipográficos. El español entra completo, pero flechas,
     vistos o emojis pegados por quien escribe saldrían como basura;
     se traducen a un equivalente imprimible o se descartan. */
  var EQUIV = {
    "\u2713": "x", "\u2714": "x", "\u2717": "x", "\u2718": "x",
    "\u25A1": "[ ]", "\u25A0": "[x]", "\u2610": "[ ]", "\u2611": "[x]",
    "\u2192": "->", "\u2190": "<-", "\u2197": "^", "\u2794": "->",
    "\u2022": "\u2022", "\u00B7": "\u00B7"
  };
  /* Latin-1 y los signos de cp1252 que las fuentes base sí traen */
  var IMPRIMIBLE = /[\u0020-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/;

  function seguro(t) {
    var salida = "", i, c;
    for (i = 0; i < t.length; i++) {
      c = t.charAt(i);
      if (IMPRIMIBLE.test(c)) { salida += c; continue; }
      salida += EQUIV[c] || "";
    }
    return salida;
  }

  /* ── Texto en línea: **negrita** y *cursiva* ──────────────── */
  function segmentar(texto) {
    var partes = [], resto = texto, m;
    while (resto.length) {
      m = /\*\*([^*]+)\*\*|\*([^*]+)\*/.exec(resto);
      if (!m) { partes.push({ t: resto, estilo: "normal" }); break; }
      if (m.index > 0) partes.push({ t: resto.slice(0, m.index), estilo: "normal" });
      partes.push({ t: m[1] || m[2], estilo: m[1] ? "bold" : "italic" });
      resto = resto.slice(m.index + m[0].length);
    }
    return partes.filter(function (p) { return p.t !== ""; });
  }

  /* Compone segmentos con salto de línea propio: jsPDF no sabe
     mezclar estilos dentro de un párrafo, así que se mide palabra
     por palabra y se decide dónde cortar. */
  Lienzo.prototype.parrafo = function (texto, o) {
    o = o || {};
    var d = this.doc;
    var fuente = o.fuente || "helvetica";
    var tam = o.tam || 10;
    var color = o.color || TINTA;
    var sangria = o.sangria || 0;
    var interlinea = o.interlinea || tam * 0.52;
    var ancho = ANCHO - sangria;
    var x0 = MARGEN.izq + sangria;

    d.setFontSize(tam);
    d.setTextColor(color[0], color[1], color[2]);

    var segs = segmentar(seguro(texto));
    var linea = [], anchoLinea = 0, i, j, palabras, estilo, w, esp;

    var volcar = function (lienzo) {
      if (!linea.length) return;
      lienzo.asegurar(interlinea);
      var x = x0, k;
      for (k = 0; k < linea.length; k++) {
        d.setFont(fuente, linea[k].estilo === "normal" ? (o.estilo || "normal") : linea[k].estilo);
        d.text(linea[k].t, x, lienzo.y);
        x += d.getTextWidth(linea[k].t);
      }
      lienzo.y += interlinea;
      linea = []; anchoLinea = 0;
    };

    for (i = 0; i < segs.length; i++) {
      estilo = segs[i].estilo === "normal" ? (o.estilo || "normal") : segs[i].estilo;
      d.setFont(fuente, estilo);
      palabras = segs[i].t.split(/(\s+)/).filter(function (p) { return p !== ""; });
      for (j = 0; j < palabras.length; j++) {
        if (/^\s+$/.test(palabras[j])) {
          if (linea.length) { esp = d.getTextWidth(" "); linea.push({ t: " ", estilo: segs[i].estilo }); anchoLinea += esp; }
          continue;
        }
        w = d.getTextWidth(palabras[j]);
        if (anchoLinea + w > ancho && linea.length) volcar(this);
        linea.push({ t: palabras[j], estilo: segs[i].estilo });
        anchoLinea += w;
      }
    }
    volcar(this);
    if (o.despues) this.espacio(o.despues);
  };

  /* ── Bloques ─────────────────────────────────────────────── */
  Lienzo.prototype.titulo2 = function (texto) {
    this.asegurar(16);
    this.espacio(3.5);
    this.parrafo(texto, { fuente: "times", estilo: "bolditalic", tam: 15, color: AZUL, interlinea: 7 });
    var d = this.doc;
    d.setDrawColor(LINEA[0], LINEA[1], LINEA[2]);
    d.setLineWidth(0.3);
    d.line(MARGEN.izq, this.y - 1.5, MM.ancho - MARGEN.der, this.y - 1.5);
    this.espacio(4);
  };

  Lienzo.prototype.titulo3 = function (texto) {
    this.asegurar(14);
    this.espacio(2.5);
    this.parrafo(texto, { fuente: "times", estilo: "bold", tam: 12, color: TINTA, interlinea: 5.6 });
    this.espacio(1.5);
  };

  Lienzo.prototype.cita = function (texto) {
    this.asegurar(12);
    var d = this.doc, yIni = this.y - 3.4;
    this.parrafo(texto, { fuente: "times", estilo: "italic", tam: 12, color: TINTA, sangria: 6, interlinea: 5.8 });
    d.setDrawColor(AZUL[0], AZUL[1], AZUL[2]);
    d.setLineWidth(1);
    d.line(MARGEN.izq + 1, yIni, MARGEN.izq + 1, this.y - 2.6);
    this.espacio(3);
  };

  /* tipo: "punto" (por defecto), "vacia" o "marcada". Las casillas se
     dibujan con vectores: el visto y el cuadrado no existen en las
     fuentes base del PDF y saldrían como caracteres rotos. */
  Lienzo.prototype.vinneta = function (texto, tipo) {
    this.asegurar(6);
    var d = this.doc, y = this.y, x = MARGEN.izq + 1.2;

    if (tipo === "vacia" || tipo === "marcada") {
      d.setDrawColor(AZUL_MEDIO[0], AZUL_MEDIO[1], AZUL_MEDIO[2]);
      d.setLineWidth(0.3);
      if (tipo === "marcada") {
        d.setFillColor(AZUL_MEDIO[0], AZUL_MEDIO[1], AZUL_MEDIO[2]);
        d.roundedRect(x, y - 2.8, 3.2, 3.2, 0.5, 0.5, "FD");
        d.setDrawColor(255, 255, 255);
        d.setLineWidth(0.45);
        d.lines([[0.6, 0.75], [1.5, -1.8]], x + 0.65, y - 1.35);
      } else {
        d.roundedRect(x, y - 2.8, 3.2, 3.2, 0.5, 0.5, "D");
      }
    } else {
      d.setFillColor(AZUL_MEDIO[0], AZUL_MEDIO[1], AZUL_MEDIO[2]);
      d.circle(x + 1.1, y - 1.2, 0.65, "F");
    }

    this.parrafo(texto, { tam: 10, color: TINTA_SUAVE, sangria: 6.5, interlinea: 5 });
    this.espacio(0.8);
  };

  Lienzo.prototype.regla = function () {
    this.asegurar(6);
    this.espacio(3);
    var d = this.doc;
    d.setDrawColor(LINEA[0], LINEA[1], LINEA[2]);
    d.setLineWidth(0.3);
    d.line(MARGEN.izq, this.y, MM.ancho - MARGEN.der, this.y);
    this.espacio(4.5);
  };

  /* ── Markdown → bloques ──────────────────────────────────── */
  function componer(lienzo, md) {
    var lineas = md.split("\n"), i, l, m;
    for (i = 0; i < lineas.length; i++) {
      l = lineas[i];
      if (!l.trim()) { lienzo.espacio(2); continue; }

      if (l.indexOf("# ") === 0 && l.indexOf("## ") !== 0) {
        /* El «# Nombre» del portafolio ya viaja en la cabecera */
        lienzo.parrafo(l.slice(2), { fuente: "times", estilo: "bold", tam: 17, color: TINTA, interlinea: 8 });
        continue;
      }
      if (l.indexOf("## ") === 0) { lienzo.titulo2(l.slice(3)); continue; }
      if (l.indexOf("### ") === 0) { lienzo.titulo3(l.slice(4)); continue; }
      if (l.indexOf("> ") === 0) { lienzo.cita(l.slice(2)); continue; }
      if (l.trim() === "---") { lienzo.regla(); continue; }

      m = /^- \[( |x)\] (.*)$/.exec(l);
      if (m) { lienzo.vinneta(m[2], m[1] === "x" ? "marcada" : "vacia"); continue; }
      if (l.indexOf("- ") === 0) { lienzo.vinneta(l.slice(2)); continue; }

      /* Línea entera en cursiva: nota al pie o firma */
      if (/^\*[^*].*\*$/.test(l.trim())) {
        lienzo.parrafo(l.trim().replace(/^\*|\*$/g, ""), {
          estilo: "italic", tam: 8.6, color: TINTA_TENUE, interlinea: 4.4
        });
        continue;
      }
      lienzo.parrafo(l, { tam: 10, color: TINTA_SUAVE, interlinea: 5 });
    }
  }

  /* ── API ─────────────────────────────────────────────────── */
  /* md: texto Markdown · o: { archivo, titulo, subtitulo, logo, nota } */
  function generar(md, o) {
    var ctor = window.jspdf && window.jspdf.jsPDF;
    if (!ctor) return false;

    var doc = new ctor({ unit: "mm", format: "a4", compress: true });
    doc.setProperties({
      title: o.titulo,
      subject: "Portafolio profesional",
      creator: "Centro de Desarrollo Profesional · Universidad de La Sabana"
    });

    var lienzo = new Lienzo(doc, o.titulo);
    lienzo.cabecera(o.logo, o.subtitulo || "Universidad de La Sabana · Centro de Desarrollo Profesional");
    componer(lienzo, md);
    pies(doc, doc.getNumberOfPages(), o.nota || "Centro de Desarrollo Profesional · Universidad de La Sabana");

    doc.save(o.archivo);
    return true;
  }

  return { generar: generar };
})();
