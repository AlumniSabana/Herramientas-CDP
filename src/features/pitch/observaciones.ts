/* Observaciones con IA: normalización tolerante de lo que devuelve la Edge Function.
   Acepta objeto por secciones, prosa corrida, JSON dentro de «texto» o Markdown con
   encabezados. Si nada encaja, se muestra el texto tal cual en vez de romperse. */

export type Obs =
  | { estructurado: true; resumen: string; fortalezas: string[]; aspectos: string[]; recomendaciones: string[]; cortado: boolean }
  | { estructurado: false; parrafos: string[]; cortado: boolean };

const LETRA = /[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

/** Quita los restos de Markdown que el modelo suele dejar sueltos (conserva **negrita**). */
export function obsLimpiar(t: unknown): string {
  return String(t == null ? "" : t)
    .replace(/^\s*(?:[-*•–—]|\d+[.)])\s+/, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/`{1,3}/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function obsLista(v: unknown): string[] {
  if (v == null) return [];
  let bruto: unknown[];
  if (Array.isArray(v)) {
    bruto = v.map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return [o.titulo, o.texto, o.descripcion, o.detalle, o.valor].filter(Boolean).join(" — ");
      }
      return x;
    });
  } else {
    bruto = String(v).split(/\r?\n+/);
  }
  return bruto.map(obsLimpiar).filter((t) => LETRA.test(t)).slice(0, 8);
}

const SECCIONES: { clave: "resumen" | "fortalezas" | "aspectos" | "recomendaciones"; re: RegExp }[] = [
  { clave: "resumen", re: /resumen|desempe|general|s[ií]ntesis|valoraci/i },
  { clave: "fortalezas", re: /fortalez|lo que (sostuviste|funcion)|destac|puntos? fuertes?|logros/i },
  { clave: "aspectos", re: /mejor|debilidad|aspectos?|oportunidad|ajust|corregir/i },
  { clave: "recomendaciones", re: /recomend|siguiente|pr[oó]xim|acci[oó]n|pasos|sugerenc/i },
];

const METADATO = /^\s*(informe|reporte|an[aá]lisis)\b.*retroaliment|^\s*(programa|facultad|n[uú]mero de pr[aá]ctica|puntaje|escenario|fecha|estudiante|nombre)\s*:/i;

function esEncabezado(linea: string): string | null {
  const t = linea.trim();
  if (!t) return null;
  let m = t.match(/^#{1,6}\s+(.{2,90})$/);
  if (m) return m[1].replace(/[:：]\s*$/, "").trim();
  m = t.match(/^\*\*(.{2,90}?)\*\*[:：]?\s*$/);
  if (m) return m[1].replace(/[:：]\s*$/, "").trim();
  if (t.length <= 90 && !/[.!?»]$/.test(t)) {
    const limpio = t.replace(/^\*+|\*+$/g, "").replace(/[:：]\s*$/, "").trim();
    if (limpio.length >= 3 && SECCIONES.some((s) => s.re.test(limpio)) && !/^\d/.test(limpio)) return limpio;
  }
  return null;
}

const cubo = (titulo: string) => SECCIONES.find((s) => s.re.test(titulo))?.clave ?? null;

function desdeMarkdown(texto: string): Obs | null {
  const cubos: Record<"resumen" | "fortalezas" | "aspectos" | "recomendaciones", string[]> = { resumen: [], fortalezas: [], aspectos: [], recomendaciones: [] };
  let actual: keyof typeof cubos | null = null;
  const huerfanas: string[] = [];
  let reconocidas = 0;

  for (const cruda of String(texto || "").split(/\r?\n/)) {
    const linea = cruda.replace(/\s+$/, "");
    if (!linea.trim()) {
      const destino = actual ? cubos[actual] : huerfanas;
      if (destino.length && destino[destino.length - 1] !== "") destino.push("");
      continue;
    }
    if (/^\s*([-*_=·—–])\1{2,}\s*$/.test(linea)) continue;
    const titulo = esEncabezado(linea);
    if (titulo) {
      const b = cubo(titulo);
      if (b) {
        actual = b;
        reconocidas++;
      }
      continue;
    }
    if (METADATO.test(linea)) continue;
    (actual ? cubos[actual] : huerfanas).push(linea.trim());
  }
  if (reconocidas < 2) return null;
  if (!cubos.resumen.length && huerfanas.length) cubos.resumen = huerfanas;

  const aItems = (lineas: string[]) => {
    const out: string[] = [];
    let corte = true;
    lineas.forEach((l) => {
      if (l === "") {
        corte = true;
        return;
      }
      const previa = out.length ? out[out.length - 1] : "";
      const cerrada = /[.!?…»]\s*$/.test(previa);
      if (corte || cerrada || /^\s*(?:[-*•–—]|\d+[.)])\s+/.test(l) || !out.length) out.push(l);
      else out[out.length - 1] += " " + l;
      corte = false;
    });
    return out.map(obsLimpiar).filter((t) => LETRA.test(t)).slice(0, 8);
  };

  const d = {
    estructurado: true as const,
    resumen: cubos.resumen.filter((l) => l !== "").map(obsLimpiar).filter(Boolean).join("\n\n"),
    fortalezas: aItems(cubos.fortalezas),
    aspectos: aItems(cubos.aspectos),
    recomendaciones: aItems(cubos.recomendaciones),
    cortado: false,
  };
  if (!d.resumen && !d.fortalezas.length && !d.aspectos.length && !d.recomendaciones.length) return null;
  return d;
}

const CONECTORES = new Set(
  ("y e o u de del al a en con por para que se su sus la el los las un una unos unas lo como sin sobre entre desde hasta pero cuando donde aunque además luego si es son ni tras ante bajo durante mediante según hacia porque mientras tanto cada").split(" "),
);

/** ¿La respuesta llegó cortada a media frase? */
export function obsCortado(t: string): boolean {
  const s = String(t || "").trim();
  if (s.length < 12) return false;
  if (/[.!?…»"')\]]\s*$/.test(s)) return false;
  if (/[,;:]\s*$/.test(s)) return true;
  const ultima = (s.match(/[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$/) || [""])[0].toLowerCase();
  if (CONECTORES.has(ultima)) return true;
  return s.length >= 120;
}

function jsonDeCadena(t: string): Record<string, unknown> | null {
  const s = String(t || "").trim();
  if (!s || s.indexOf("{") < 0) return null;
  const sinCercas = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const candidatos = [sinCercas];
  const a = sinCercas.indexOf("{");
  const b = sinCercas.lastIndexOf("}");
  if (a >= 0 && b > a) candidatos.push(sinCercas.slice(a, b + 1));
  for (const c of candidatos) {
    try {
      const o: unknown = JSON.parse(c);
      if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}

const CLAVES = {
  resumen: ["resumen", "resumen_general", "resumenGeneral", "summary", "general"],
  fort: ["fortalezas", "fortalezas_principales", "fortalezasPrincipales", "strengths"],
  mej: ["aspectos_mejora", "aspectos_a_mejorar", "aspectosMejora", "aspectos_por_mejorar", "mejoras", "debilidades", "improvements"],
  rec: ["recomendaciones", "recomendaciones_siguiente_practica", "recomendacionesSiguientePractica", "siguientes_pasos", "recommendations"],
};
const primera = (o: Record<string, unknown>, claves: string[]) => {
  for (const k of claves) if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  return null;
};
const tieneSecciones = (o: Record<string, unknown>) =>
  !!(primera(o, CLAVES.resumen) || primera(o, CLAVES.fort) || primera(o, CLAVES.mej) || primera(o, CLAVES.rec));

export function normalizarObservaciones(r: unknown): Obs | null {
  if (!r) return null;
  let o: Record<string, unknown> = typeof r === "string" ? { texto: r } : (r as Record<string, unknown>);

  if (!tieneSecciones(o) && typeof o.texto === "string") {
    const cortado = obsCortado(o.texto);
    const dentro = jsonDeCadena(o.texto);
    if (dentro && tieneSecciones(dentro)) {
      o = dentro;
    } else {
      const porSecciones = desdeMarkdown(o.texto);
      if (porSecciones) return { ...porSecciones, cortado };
      const parrafos = o.texto
        .split(/\n{2,}/)
        .map((p) => obsLimpiar(p.replace(/\n/g, " ")))
        .filter((p) => LETRA.test(p));
      if (!parrafos.length) return null;
      return { estructurado: false, parrafos, cortado };
    }
  }
  if (!tieneSecciones(o)) return null;

  const d = {
    estructurado: true as const,
    resumen: obsLimpiar(primera(o, CLAVES.resumen) || ""),
    fortalezas: obsLista(primera(o, CLAVES.fort)),
    aspectos: obsLista(primera(o, CLAVES.mej)),
    recomendaciones: obsLista(primera(o, CLAVES.rec)),
    cortado: false,
  };
  if (!d.resumen && !d.fortalezas.length && !d.aspectos.length && !d.recomendaciones.length) return null;
  const ultimo = (d.recomendaciones.length ? d.recomendaciones : d.aspectos.length ? d.aspectos : d.fortalezas.length ? d.fortalezas : [d.resumen]).slice(-1)[0];
  d.cortado = obsCortado(ultimo) || obsCortado(d.resumen);
  return d;
}

/** Texto llano, para el PDF y el diagnóstico. */
export function observacionesAPlano(d: Obs | null): string {
  if (!d) return "";
  if (!d.estructurado) return d.parrafos.join("\n\n");
  const bloque = (t: string, items: string[]) => (items.length ? t + "\n" + items.map((x, i) => "  " + (i + 1) + ". " + x).join("\n") : "");
  return [
    d.resumen ? "Resumen general del desempeño\n" + d.resumen : "",
    bloque("Fortalezas principales", d.fortalezas),
    bloque("Aspectos por mejorar", d.aspectos),
    bloque("Recomendaciones para la siguiente práctica", d.recomendaciones),
  ].filter(Boolean).join("\n\n");
}

/** Lo que se guarda en rondas.observaciones: conserva la estructura para releerla por secciones. */
export function observacionesSerializar(d: Obs): string {
  if (!d.estructurado) return d.parrafos.join("\n\n");
  return JSON.stringify({ resumen: d.resumen, fortalezas: d.fortalezas, aspectos_mejora: d.aspectos, recomendaciones: d.recomendaciones });
}

/** Lo guardado en una ronda → Obs (o null si no hay nada). */
export const observacionesGuardadas = (guardado: string | null | undefined) => (guardado ? normalizarObservaciones({ texto: guardado }) : null);
