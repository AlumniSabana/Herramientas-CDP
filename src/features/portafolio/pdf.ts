import logo from "@/assets/logo-talenthub.png";

/* Las hojas producen Markdown; aquí se compone en un PDF con la identidad del CDP.
   jsPDF se importa al descargar para no cargar su peso al abrir la herramienta. */

const ANCHO_PAG = 210;
const ALTO_PAG = 297;
const M = { izq: 20, der: 20, sup: 20, inf: 22 };
const ANCHO = ANCHO_PAG - M.izq - M.der;
type RGB = [number, number, number];
const AZUL: RGB = [0, 20, 89];
const AZUL_MEDIO: RGB = [37, 64, 154];
const TINTA: RGB = [10, 19, 48];
const TINTA_SUAVE: RGB = [75, 86, 112];
const TINTA_TENUE: RGB = [136, 149, 164];
const LINEA: RGB = [217, 225, 238];

const EQUIV: Record<string, string> = { "✓": "x", "✔": "x", "✗": "x", "✘": "x", "□": "[ ]", "■": "[x]", "☐": "[ ]", "☑": "[x]", "→": "->", "←": "<-", "↗": "^", "➔": "->" };
// Las fuentes base del PDF solo traen Latin-1 y unos signos de cp1252.
const IMPRIMIBLE = /[ -ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;
const seguro = (t: string) => [...t].map((c) => (IMPRIMIBLE.test(c) ? c : (EQUIV[c] ?? ""))).join("");

type Seg = { t: string; estilo: "normal" | "bold" | "italic" };
function segmentar(texto: string): Seg[] {
  const out: Seg[] = [];
  let resto = texto;
  while (resto.length) {
    const m = /\*\*([^*]+)\*\*|\*([^*]+)\*/.exec(resto);
    if (!m) {
      out.push({ t: resto, estilo: "normal" });
      break;
    }
    if (m.index > 0) out.push({ t: resto.slice(0, m.index), estilo: "normal" });
    out.push({ t: m[1] ?? m[2], estilo: m[1] ? "bold" : "italic" });
    resto = resto.slice(m.index + m[0].length);
  }
  return out.filter((s) => s.t !== "");
}

type Doc = import("jspdf").jsPDF;
type OpcP = { estilo?: string; tam?: number; color?: RGB; sangria?: number; interlinea?: number; despues?: number };

class Lienzo {
  y = M.sup;
  constructor(
    private d: Doc,
    private titulo: string,
  ) {}

  asegurar(mm: number) {
    if (this.y + mm > ALTO_PAG - M.inf) {
      this.d.addPage();
      this.y = M.sup;
    }
  }

  cabecera(subtitulo: string, logoImg: string | null) {
    const d = this.d;
    const alto = 42;
    d.setFillColor(...AZUL);
    d.rect(0, 0, ANCHO_PAG, alto, "F");
    // El logo es un PNG con fondo blanco: va sobre una tarjeta blanca dentro de la banda.
    if (logoImg) {
      d.setFillColor(255, 255, 255);
      d.roundedRect(M.izq, 8, 34, 26, 2, 2, "F");
      try {
        d.addImage(logoImg, "PNG", M.izq + 2, 10, 30, 22);
      } catch {
        /* sin logo */
      }
    }
    d.setTextColor(255, 255, 255);
    d.setFont("helvetica", "bold");
    d.setFontSize(17);
    d.text(seguro(this.titulo), M.izq + 40, 19);
    d.setFont("helvetica", "normal");
    d.setFontSize(8.4);
    d.setTextColor(169, 190, 222);
    d.text(seguro(subtitulo.toUpperCase()), M.izq + 40, 26.5, { charSpace: 0.6 });
    this.y = alto + 14;
  }

  parrafo(texto: string, o: OpcP = {}) {
    const d = this.d;
    const tam = o.tam ?? 10;
    const color = o.color ?? TINTA;
    const inter = o.interlinea ?? tam * 0.52;
    const x0 = M.izq + (o.sangria ?? 0);
    const ancho = ANCHO - (o.sangria ?? 0);
    d.setFontSize(tam);
    d.setTextColor(...color);
    let linea: Seg[] = [];
    let anchoLinea = 0;
    const base = (e: Seg["estilo"]) => (e === "normal" ? (o.estilo ?? "normal") : e);
    const volcar = () => {
      if (!linea.length) return;
      this.asegurar(inter);
      let x = x0;
      for (const s of linea) {
        d.setFont("helvetica", base(s.estilo));
        d.text(s.t, x, this.y);
        x += d.getTextWidth(s.t);
      }
      this.y += inter;
      linea = [];
      anchoLinea = 0;
    };
    for (const seg of segmentar(seguro(texto))) {
      d.setFont("helvetica", base(seg.estilo));
      for (const pal of seg.t.split(/(\s+)/).filter(Boolean)) {
        if (/^\s+$/.test(pal)) {
          if (linea.length) {
            linea.push({ t: " ", estilo: seg.estilo });
            anchoLinea += d.getTextWidth(" ");
          }
          continue;
        }
        const w = d.getTextWidth(pal);
        if (anchoLinea + w > ancho && linea.length) volcar();
        linea.push({ t: pal, estilo: seg.estilo });
        anchoLinea += w;
      }
    }
    volcar();
    if (o.despues) this.y += o.despues;
  }

  titulo2(t: string) {
    this.asegurar(16);
    this.y += 3.5;
    this.parrafo(t, { estilo: "bold", tam: 14, color: AZUL, interlinea: 7 });
    this.d.setDrawColor(...LINEA);
    this.d.setLineWidth(0.3);
    this.d.line(M.izq, this.y - 1.5, ANCHO_PAG - M.der, this.y - 1.5);
    this.y += 4;
  }
  titulo3(t: string) {
    this.asegurar(14);
    this.y += 2.5;
    this.parrafo(t, { estilo: "bold", tam: 11.5, color: TINTA, interlinea: 5.6 });
    this.y += 1.5;
  }
  cita(t: string) {
    this.asegurar(12);
    const ini = this.y - 3.4;
    this.parrafo(t, { estilo: "italic", tam: 11.5, color: TINTA, sangria: 6, interlinea: 5.8 });
    this.d.setDrawColor(...AZUL);
    this.d.setLineWidth(1);
    this.d.line(M.izq + 1, ini, M.izq + 1, this.y - 2.6);
    this.y += 3;
  }
  // Las casillas se dibujan con vectores: el visto no existe en las fuentes base del PDF.
  vineta(t: string, tipo: "punto" | "vacia" | "marcada" = "punto") {
    this.asegurar(6);
    const d = this.d;
    const x = M.izq + 1.2;
    const y = this.y;
    if (tipo === "punto") {
      d.setFillColor(...AZUL_MEDIO);
      d.circle(x + 1.1, y - 1.2, 0.65, "F");
    } else {
      d.setDrawColor(...AZUL_MEDIO);
      d.setLineWidth(0.3);
      if (tipo === "marcada") {
        d.setFillColor(...AZUL_MEDIO);
        d.roundedRect(x, y - 2.8, 3.2, 3.2, 0.5, 0.5, "FD");
        d.setDrawColor(255, 255, 255);
        d.setLineWidth(0.45);
        d.lines([[0.6, 0.75], [1.5, -1.8]], x + 0.65, y - 1.35);
      } else d.roundedRect(x, y - 2.8, 3.2, 3.2, 0.5, 0.5, "D");
    }
    this.parrafo(t, { tam: 10, color: TINTA_SUAVE, sangria: 6.5, interlinea: 5 });
    this.y += 0.8;
  }
  regla() {
    this.asegurar(6);
    this.y += 3;
    this.d.setDrawColor(...LINEA);
    this.d.setLineWidth(0.3);
    this.d.line(M.izq, this.y, ANCHO_PAG - M.der, this.y);
    this.y += 4.5;
  }
}

function componer(l: Lienzo, md: string) {
  for (const ln of md.split("\n")) {
    if (!ln.trim()) l.y += 2;
    else if (ln.startsWith("# ")) l.parrafo(ln.slice(2), { estilo: "bold", tam: 16, color: TINTA, interlinea: 8 });
    else if (ln.startsWith("## ")) l.titulo2(ln.slice(3));
    else if (ln.startsWith("### ")) l.titulo3(ln.slice(4));
    else if (ln.startsWith("> ")) l.cita(ln.slice(2));
    else if (ln.trim() === "---") l.regla();
    else {
      const m = /^- \[( |x)\] (.*)$/.exec(ln);
      if (m) l.vineta(m[2], m[1] === "x" ? "marcada" : "vacia");
      else if (ln.startsWith("- ")) l.vineta(ln.slice(2));
      else if (/^\*[^*].*\*$/.test(ln.trim())) l.parrafo(ln.trim().replace(/^\*|\*$/g, ""), { estilo: "italic", tam: 8.6, color: TINTA_TENUE, interlinea: 4.4 });
      else l.parrafo(ln, { tam: 10, color: TINTA_SUAVE, interlinea: 5 });
    }
  }
}

async function logoComoDataUrl(): Promise<string | null> {
  try {
    const blob = await (await fetch(logo)).blob();
    return await new Promise((ok) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = () => ok(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Genera y descarga el PDF. Lanza si el navegador no puede. */
export async function descargarPDF(md: string, archivo: string, titulo: string, nota = "Centro de Desarrollo Profesional · Universidad de La Sabana") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: titulo, subject: "Portafolio profesional", creator: "Centro de Desarrollo Profesional · Universidad de La Sabana" });
  const l = new Lienzo(doc, titulo);
  l.cabecera("Universidad de La Sabana · Centro de Desarrollo Profesional", await logoComoDataUrl());
  componer(l, md);
  const total = doc.getNumberOfPages();
  const y = ALTO_PAG - 14;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINEA);
    doc.setLineWidth(0.2);
    doc.line(M.izq, y - 5, ANCHO_PAG - M.der, y - 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    doc.setTextColor(...TINTA_TENUE);
    doc.text(nota, M.izq, y);
    doc.text(`${i} / ${total}`, ANCHO_PAG - M.der, y, { align: "right" });
  }
  doc.save(archivo);
}
