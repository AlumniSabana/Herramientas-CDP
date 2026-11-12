/* Descargas: PDF del reporte (jsPDF) y CSV del historial / consolidado. */
import { ejercicioPara, etiquetaNivel, mmss, nivel, type Resultado } from "./analisis";
import { TIPOS } from "./contenido";
import type { RondaAdmin, Ronda } from "./datos";
import type { Perfil } from "@/auth/AuthProvider";

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const p2 = (n: number) => String(n).padStart(2, "0");
const sello = () => {
  const d = new Date();
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
};

/* Las fuentes base del PDF son WinAnsi: se sustituye lo que no existe en ellas. */
const apto = (t: string) => t.replace(/\*\*/g, "").replace(/−/g, "-").replace(/→/g, ">").replace(/✓/g, "+").replace(/[^\u0000-ÿ–—‘-”•…]/g, "?");

const COLOR: Record<string, [number, number, number]> = { bien: [20, 138, 94], ajusta: [181, 115, 30], revisa: [163, 38, 46] };
const NAVY: [number, number, number] = [0, 20, 89];
const GRIS: [number, number, number] = [75, 86, 112];
const CLARO: [number, number, number] = [136, 149, 164];

export async function descargarReportePDF(res: Resultado, perfil: Perfil | null, observacionesPlano: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const M = 54;
  const util = ancho - M * 2;
  let y = 0;
  const ej = ejercicioPara(res);
  const t = TIPOS[res.tipo];

  const asegura = (h: number) => {
    if (y + h > alto - M) {
      doc.addPage();
      y = M;
    }
  };
  const texto = (s: string, o: { tam?: number; negrita?: boolean; color?: [number, number, number]; sangria?: number } = {}) => {
    const tam = o.tam ?? 10.5;
    doc.setFont("helvetica", o.negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    doc.setTextColor(...(o.color ?? GRIS));
    const lineas = doc.splitTextToSize(apto(s), util - (o.sangria ?? 0)) as string[];
    lineas.forEach((l) => {
      asegura(tam * 1.4);
      doc.text(l, M + (o.sangria ?? 0), y + tam);
      y += tam * 1.4;
    });
  };
  const espacio = (h: number) => (y += h);
  const regla = () => {
    asegura(14);
    doc.setDrawColor(217, 225, 238);
    doc.line(M, y, ancho - M, y);
    y += 14;
  };
  const barra = (pct: number, c: [number, number, number]) => {
    asegura(10);
    doc.setFillColor(233, 238, 247);
    doc.rect(M, y, util, 6, "F");
    doc.setFillColor(...c);
    doc.rect(M, y, (util * Math.max(0, Math.min(100, pct))) / 100, 6, "F");
    y += 10;
  };
  const fila = (izq: string, der: string, c: [number, number, number], tam = 11.5) => {
    asegura(tam * 1.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(tam);
    doc.setTextColor(...NAVY);
    doc.text(apto(izq), M, y + tam);
    doc.setTextColor(...c);
    doc.text(apto(der), ancho - M, y + tam, { align: "right" });
    y += tam * 1.6;
  };

  // Banda superior
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, ancho, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Estudio de Pitch", M, 33);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Centro de Desarrollo Profesional  ·  Alumni  ·  Universidad de La Sabana", M, 52);
  y = 96;

  const d = new Date();
  texto(t.nombre, { tam: 16, negrita: true, color: NAVY });
  texto(
    `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}   ·   formato ${mmss(res.duracion)}   ·   ${res.modo === "mic" ? "con micrófono" : "sin micrófono"}${perfil ? "   ·   " + perfil.correo : ""}`,
    { tam: 9.5, color: CLARO },
  );
  if (perfil && (perfil.facultad || perfil.programa)) texto([perfil.nombre, perfil.facultad, perfil.programa].filter(Boolean).join("   ·   "), { tam: 9.5, color: CLARO });

  espacio(16);
  fila("Puntaje general", `${res.puntaje} / 100  ${etiquetaNivel(res.puntaje).toUpperCase()}`, COLOR[nivel(res.puntaje)], 13);
  barra(res.puntaje, COLOR[nivel(res.puntaje)]);
  espacio(6);
  texto(`Duración ${mmss(res.segundos)} de ${mmss(res.duracion)}    ${res.meta.ppm} palabras por minuto    ${res.meta.nPal} palabras    ${res.meta.muletillas.total} muletillas    ${res.meta.cubiertas}/${res.meta.totalSecciones} secciones`, { tam: 10 });

  espacio(14);
  regla();
  texto("Dimensiones medidas", { tam: 13, negrita: true, color: NAVY });
  espacio(4);
  res.dims.forEach((dim) => {
    espacio(8);
    fila(dim.n, dim.pct == null ? "Sin medición" : `${dim.val}   ${etiquetaNivel(dim.pct).toUpperCase()}`, dim.pct == null ? CLARO : COLOR[nivel(dim.pct)]);
    texto(dim.txt);
    texto(dim.dato, { tam: 9.5, color: CLARO });
    if (dim.pct != null) barra(dim.pct, COLOR[nivel(dim.pct)]);
    espacio(4);
  });

  espacio(10);
  regla();
  texto("Ejercicio para la siguiente ronda", { tam: 13, negrita: true, color: NAVY });
  espacio(4);
  texto(ej.titulo, { tam: 11.5, negrita: true, color: NAVY });
  texto(ej.texto);
  espacio(4);
  ej.pasos.forEach((p, i) => texto(`${i + 1}.  ${p}`, { sangria: 10 }));

  if (observacionesPlano) {
    espacio(12);
    regla();
    texto("Observaciones", { tam: 13, negrita: true, color: NAVY });
    espacio(4);
    observacionesPlano.split(/\n{2,}/).forEach((par) => {
      par.split(/\n/).forEach((l) => texto(l));
      espacio(4);
    });
  }

  espacio(12);
  regla();
  texto("Lo que dijiste", { tam: 13, negrita: true, color: NAVY });
  espacio(4);
  texto(res.texto || "Sin transcripción.");

  espacio(18);
  regla();
  texto(
    "Este reporte se calculó en tu navegador a partir de señales medibles de tu entrega. No evalúa la calidad de tus argumentos ni sustituye una asesoría personalizada del Centro de Desarrollo Profesional. La grabación de audio nunca se almacena.",
    { tam: 8.5, color: CLARO },
  );

  doc.save(`reporte-pitch-${res.tipo}-${sello()}.pdf`);
}

/* ───────── CSV (con BOM para que Excel lo abra con acentos) ───────── */
const COL_DIM = ["duracion", "ritmo", "fluidez", "estructura", "concrecion", "cierre", "visual"];
const CAB = [
  "Correo", "Nombre", "Facultad", "Programa", "Fecha", "Escenario", "Modo", "Objetivo (s)", "Duración real (s)", "Puntaje",
  "Palabras", "Palabras por minuto", "Muletillas", "Secciones cubiertas", "Secciones totales",
  "Duración %", "Ritmo %", "Fluidez %", "Estructura %", "Concreción %", "Cierre %", "Presencia visual %",
  "Encuadre", "Orientación a cámara %", "Postura", "Movimiento corporal", "Gestualidad",
  "Muletillas frecuentes", "Ejercicio sugerido", "Transcripción",
];

const celda = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Evita que Excel interprete una celda como fórmula.
  const seguro = /^[=+\-@]/.test(s) ? "'" + s : s;
  return /[",\n\r;]/.test(seguro) ? '"' + seguro.replace(/"/g, '""') + '"' : seguro;
};

export function exportarCSV(lista: (Ronda | RondaAdmin)[], perfil: Perfil | null, archivo: string) {
  const filas: unknown[][] = [CAB];
  lista.slice().reverse().forEach((h) => {
    const a = h as Partial<RondaAdmin> & Ronda;
    const dm: Record<string, number | null> = {};
    (h.dimensiones || []).forEach((d) => (dm[d.id] = d.pct));
    const vs = h.visual?.medida ? h.visual : null;
    filas.push([
      a.correo || perfil?.correo || "", a.nombre || perfil?.nombre || "", a.facultad || perfil?.facultad || "", a.programa || perfil?.programa || "",
      String(h.creada_en || "").replace("T", " ").slice(0, 16), h.tipo_nombre || h.tipo || "",
      (h.modo === "manual" ? "sin micrófono" : "con micrófono") + (vs ? " + cámara" : ""),
      h.duracion_objetivo, h.duracion_real, h.puntaje, h.palabras, h.ppm, h.muletillas_total, h.secciones_cubiertas, h.secciones_total,
      ...COL_DIM.map((k) => dm[k] ?? ""),
      vs?.encuadre ?? "", vs?.orientacion ?? "", vs?.postura ?? "", vs?.movimiento ?? "", vs?.gestualidad ?? "",
      (h.muletillas_top || []).map((m) => `${m.palabra} (${m.veces})`).join(", "),
      h.ejercicio?.titulo ?? "", h.transcripcion || "",
    ]);
  });
  const csv = "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
  descargar(new Blob([csv], { type: "text/csv;charset=utf-8" }), archivo);
}
