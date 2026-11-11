/* Presencia visual: cálculo puro a partir de muestras numéricas.
   Aquí nunca hay imágenes: solo cifras y etiquetas. */
import { mmss } from "./analisis";

export type MuestraCara = {
  t: number;
  hay: boolean;
  cx?: number;
  cy?: number;
  ancho?: number;
  alto?: number;
  dentro?: boolean;
  yaw?: number | null;
  pitch?: number | null;
  deFrente?: boolean;
};

export type MuestraCuerpo = {
  t: number;
  hay: boolean;
  hombrosVisibles?: boolean;
  anchoHombros?: number;
  inclinacionHombros?: number;
  simetria?: number;
  inclinacionTronco?: number | null;
  tx?: number;
  ty?: number;
  manos?: { x: number; y: number }[];
};

export type ResumenVisual = {
  medida: boolean;
  encuadre: number | null;
  orientacion: number | null;
  postura: number | null;
  puntaje: number | null;
  movimiento: string | null;
  gestualidad: string | null;
  estabilidad: number | null;
  bruscos: number;
  repetitivo: boolean;
  manosPct: number;
  rostroPct: number;
  cuerpoPct: number;
  muestras: number;
  segundos: number;
};

/** Lo que se guarda en rondas.visual (columnas en snake_case, solo números y etiquetas). */
export type VisualGuardado = {
  medida: boolean;
  puntaje?: number | null;
  encuadre?: number | null;
  orientacion?: number | null;
  postura?: number | null;
  movimiento?: string | null;
  gestualidad?: string | null;
  estabilidad?: number | null;
  repetitivo?: boolean;
  rostro_pct?: number;
  cuerpo_pct?: number;
  manos_pct?: number;
  muestras?: number;
  segundos?: number;
};

export const resumenParaRonda = (r: ResumenVisual | null): VisualGuardado => {
  if (!r || !r.medida) return { medida: false };
  return {
    medida: true,
    puntaje: r.puntaje,
    encuadre: r.encuadre,
    orientacion: r.orientacion,
    postura: r.postura,
    movimiento: r.movimiento,
    gestualidad: r.gestualidad,
    estabilidad: r.estabilidad,
    repetitivo: r.repetitivo,
    rostro_pct: r.rostroPct,
    cuerpo_pct: r.cuerpoPct,
    manos_pct: r.manosPct,
    muestras: r.muestras,
    segundos: r.segundos,
  };
};

const limita = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const media = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const desv = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = media(a);
  return Math.sqrt(media(a.map((x) => (x - m) * (x - m))));
};

export function puntajeEncuadreMuestra(m: MuestraCara): number {
  if (!m.hay) return 0;
  const dx = Math.abs((m.cx ?? 0.5) - 0.5);
  const pX = dx <= 0.06 ? 100 : dx <= 0.12 ? 82 : dx <= 0.2 ? 58 : dx <= 0.3 ? 32 : 12;
  const dy = Math.abs((m.cy ?? 0.42) - 0.42);
  const pY = dy <= 0.07 ? 100 : dy <= 0.13 ? 80 : dy <= 0.2 ? 55 : dy <= 0.28 ? 30 : 12;
  const a = m.ancho ?? 0;
  const pD =
    a >= 0.17 && a <= 0.34 ? 100
    : (a >= 0.13 && a < 0.17) || (a > 0.34 && a <= 0.42) ? 76
    : (a >= 0.1 && a < 0.13) || (a > 0.42 && a <= 0.5) ? 48
    : 20;
  const pM = m.dentro ? 100 : 25;
  return pX * 0.28 + pY * 0.22 + pD * 0.28 + pM * 0.22;
}

export function puntajePosturaMuestra(m: MuestraCuerpo): number {
  if (!m.hay) return 0;
  const iH = m.inclinacionHombros ?? 0;
  const pH = iH <= 3 ? 100 : iH <= 6 ? 85 : iH <= 10 ? 62 : iH <= 16 ? 38 : 18;
  const s = m.simetria ?? 0;
  const pS = s <= 0.05 ? 100 : s <= 0.1 ? 84 : s <= 0.18 ? 60 : s <= 0.28 ? 36 : 16;
  if (m.inclinacionTronco == null) return pH * 0.55 + pS * 0.45;
  const iT = m.inclinacionTronco;
  const pT = iT <= 5 ? 100 : iT <= 10 ? 84 : iT <= 16 ? 60 : iT <= 24 ? 36 : 16;
  return pH * 0.32 + pS * 0.28 + pT * 0.4;
}

/* Movimiento y gestualidad se describen, no se puntúan. */
export function etiquetaMovimiento(cuerpo: MuestraCuerpo[]) {
  if (cuerpo.length < 6) return { etiqueta: "sin datos", bruscosPorMin: 0, repetitivo: false };
  const d: number[] = [];
  let bruscos = 0;
  for (let i = 1; i < cuerpo.length; i++) {
    const a = cuerpo[i - 1];
    const b = cuerpo[i];
    const dt = Math.max(b.t - a.t, 0.001);
    const dist = Math.hypot((b.tx ?? 0) - (a.tx ?? 0), (b.ty ?? 0) - (a.ty ?? 0)) / Math.max(b.anchoHombros ?? 0, 0.05);
    const vel = dist / dt;
    d.push(vel);
    if (vel > 1.6) bruscos++;
  }
  const m = media(d);
  const xs = cuerpo.map((c) => c.tx ?? 0);
  const mx = media(xs);
  let cruces = 0;
  for (let i = 1; i < xs.length; i++) if ((xs[i - 1] - mx) * (xs[i] - mx) < 0) cruces++;
  const dur = Math.max(cuerpo[cuerpo.length - 1].t - cuerpo[0].t, 1);
  const repetitivo = (cruces / dur) * 60 > 34 && desv(xs) > 0.012;
  const etiqueta = m < 0.12 ? "quieto" : m < 0.45 ? "moderado" : "alto";
  return { etiqueta, bruscosPorMin: (bruscos / dur) * 60, repetitivo };
}

export function etiquetaGestualidad(cuerpo: MuestraCuerpo[]) {
  const conManos = cuerpo.filter((m) => m.manos && m.manos.length);
  if (cuerpo.length < 6 || conManos.length < 3) return { etiqueta: "no visible", visiblePct: 0 };
  const visiblePct = Math.round((conManos.length / cuerpo.length) * 100);
  const d: number[] = [];
  for (let i = 1; i < conManos.length; i++) {
    const a = conManos[i - 1];
    const b = conManos[i];
    const dt = Math.max(b.t - a.t, 0.001);
    const am = a.manos!;
    const bm = b.manos!;
    const n = Math.min(am.length, bm.length);
    let suma = 0;
    for (let k = 0; k < n; k++) suma += Math.hypot(bm[k].x - am[k].x, bm[k].y - am[k].y);
    if (n) d.push(suma / n / Math.max(b.anchoHombros ?? 0, 0.05) / dt);
  }
  const act = media(d);
  return { etiqueta: act < 0.28 ? "baja" : act < 0.95 ? "moderada" : "alta", visiblePct };
}

export function calcularPresenciaVisual(cara: MuestraCara[], cuerpo: MuestraCuerpo[]): ResumenVisual {
  const conCara = cara.filter((m) => m.hay);
  const conCuerpo = cuerpo.filter((m) => m.hay);
  const vacio: ResumenVisual = {
    medida: false, encuadre: null, orientacion: null, postura: null, movimiento: null, gestualidad: null,
    puntaje: null, rostroPct: 0, cuerpoPct: 0, muestras: cara.length, segundos: 0, estabilidad: null,
    bruscos: 0, repetitivo: false, manosPct: 0,
  };
  // Menos de 4 segundos útiles de rostro: no alcanza para decir nada.
  if (cara.length < 20 || conCara.length < 15) return vacio;

  const segundos = cara[cara.length - 1].t - cara[0].t;
  const rostroPct = Math.round((conCara.length / cara.length) * 100);
  const cuerpoPct = cuerpo.length ? Math.round((conCuerpo.length / cuerpo.length) * 100) : 0;

  const encBase = media(conCara.map(puntajeEncuadreMuestra));
  const encuadre = Math.round(limita(encBase * (0.35 + 0.65 * (rostroPct / 100)), 0, 100));

  // Sobre el total de la ronda: mirar fuera del cuadro también es no estar de frente.
  const orientacion = conCara.some((m) => m.yaw != null)
    ? Math.round((conCara.filter((m) => m.deFrente).length / cara.length) * 100)
    : null;

  let postura: number | null = null;
  let estabilidad: number | null = null;
  let mov: ReturnType<typeof etiquetaMovimiento> | null = null;
  let ges: ReturnType<typeof etiquetaGestualidad> | null = null;
  if (conCuerpo.length >= 8) {
    const base = media(conCuerpo.map(puntajePosturaMuestra));
    const dX = desv(conCuerpo.map((m) => m.tx ?? 0));
    const dY = desv(conCuerpo.map((m) => m.ty ?? 0));
    const deriva = Math.hypot(dX, dY) / Math.max(media(conCuerpo.map((m) => m.anchoHombros ?? 0)), 0.05);
    estabilidad = Math.round(limita(100 - deriva * 260, 0, 100));
    mov = etiquetaMovimiento(conCuerpo);
    ges = etiquetaGestualidad(conCuerpo);
    let p = base * 0.68 + estabilidad * 0.32;
    if (mov.bruscosPorMin > 12) p -= 12;
    else if (mov.bruscosPorMin > 5) p -= 6;
    if (mov.repetitivo) p -= 14; // el balanceo constante es un problema postural
    postura = Math.round(limita(p, 0, 100));
  }

  const partes: { v: number; w: number }[] = [{ v: encuadre, w: 0.34 }];
  if (orientacion !== null) partes.push({ v: orientacion, w: 0.33 });
  if (postura !== null) partes.push({ v: postura, w: 0.33 });
  const pesoTotal = partes.reduce((a, p) => a + p.w, 0);
  const puntaje = Math.round(partes.reduce((a, p) => a + p.v * p.w, 0) / pesoTotal);

  return {
    medida: true, encuadre, orientacion, postura, puntaje,
    movimiento: mov ? mov.etiqueta : null,
    gestualidad: ges ? ges.etiqueta : null,
    estabilidad,
    bruscos: mov ? Math.round(mov.bruscosPorMin * 10) / 10 : 0,
    repetitivo: mov ? mov.repetitivo : false,
    manosPct: ges ? ges.visiblePct : 0,
    rostroPct, cuerpoPct,
    muestras: cara.length,
    segundos: Math.round(segundos),
  };
}

export type DimensionBase = { id: string; n: string; val: string; pct: number | null; dato: string; txt: string };

/** La dimensión «visual» con el mismo contrato que las demás. Con pct null no entra al promedio. */
export function dimensionVisual(r: ResumenVisual | null, usada: boolean, motivo: string): DimensionBase {
  if (!r || !r.medida) {
    const m = !usada ? "practicaste sin cámara, así que no hay señal de video" : motivo || "no se recogieron suficientes muestras de video";
    return {
      id: "visual", n: "Presencia visual", val: "—", pct: null,
      dato: "no medida · " + m,
      txt: "Esta dimensión no entra en el puntaje. Para medirla, empieza la ronda con «Practicar con cámara»: el análisis ocurre en tu navegador y ningún video sale de tu equipo.",
    };
  }
  const partes: string[] = ["encuadre " + r.encuadre + "/100"];
  if (r.orientacion !== null) partes.push("de frente " + r.orientacion + "% del tiempo");
  if (r.postura !== null) partes.push("postura " + r.postura + "/100");
  if (r.movimiento) partes.push("movimiento " + r.movimiento);
  if (r.gestualidad) partes.push("gestualidad " + r.gestualidad);
  partes.push(r.muestras + " muestras en " + mmss(r.segundos));

  const frases: string[] = [];
  const enc = r.encuadre ?? 0;
  if (enc >= 75 && (r.orientacion === null || r.orientacion >= 70)) {
    frases.push("Te mantuviste centrado en cámara y de frente la mayor parte de la práctica.");
  } else if (enc < 60) {
    frases.push("El encuadre se movió bastante: quedaste descentrado, demasiado cerca o demasiado lejos. Ajusta la cámara a la altura de los ojos y déjate unos dedos de aire sobre la cabeza.");
  } else if (r.orientacion !== null && r.orientacion < 60) {
    frases.push("Buena parte del tiempo la cabeza no apuntó a la cámara. Suele pasar por leer el guion en pantalla: sube las notas al borde superior, junto al lente.");
  }
  if (r.postura !== null) {
    if (r.postura >= 75 && !r.repetitivo) frases.push("La postura se sostuvo estable y con los hombros parejos.");
    else if (r.postura >= 75) frases.push("Los hombros se mantuvieron parejos, pero el cuerpo no se quedó quieto.");
    else if (r.postura >= 50) frases.push("La postura se inclina o se desplaza más de lo necesario. Planta los pies y deja que el movimiento venga de las manos, no del tronco.");
    else frases.push("Hubo inclinación marcada o cambios bruscos de posición. Fija un punto de apoyo antes de empezar y vuelve a él después de cada gesto.");
  }
  if (r.repetitivo) frases.push("Se detectó un balanceo repetitivo de lado a lado: quien escucha lo registra aunque no lo comente.");
  else if (r.movimiento === "quieto" && r.manosPct < 25) frases.push("Casi no hubo movimiento ni manos a la vista. Un poco de gesto ayuda a marcar las ideas, siempre que acompañe lo que dices.");
  else if (r.movimiento === "alto") frases.push("El movimiento fue alto y continuo. Reserva el desplazamiento para los cambios de sección, no para todo el discurso.");
  if (r.rostroPct < 60) frases.push("Solo se te detectó el rostro en el " + r.rostroPct + "% de las muestras: buena parte del tiempo estuviste fuera del cuadro o de espaldas al lente.");
  if (r.cuerpoPct < 40) frases.push("El cuerpo apenas se vio en el cuadro, así que la lectura de postura es parcial. Aléjate un poco para que se vean los hombros.");

  return {
    id: "visual", n: "Presencia visual", val: String(r.puntaje), pct: r.puntaje,
    dato: partes.join(" · "),
    txt: frases.join(" ") || "Se midió tu presencia en cámara durante la ronda.",
  };
}
