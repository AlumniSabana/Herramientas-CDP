/* Análisis del pitch: todo se calcula en el navegador a partir del texto y el tiempo. */
import { MULETILLAS_FUERTES, MULETILLAS_SUAVES, PALABRAS_CTA, TIPOS, type Seccion, type TipoId } from "./contenido";
import { dimensionVisual, resumenParaRonda, type DimensionBase, type ResumenVisual, type VisualGuardado } from "./visual";

export type Dimension = DimensionBase;
export type Modo = "mic" | "manual";
export type Nivel = "bien" | "ajusta" | "revisa";
export type NivelSem = Nivel | "nada";

export const mmss = (s: number) => {
  s = Math.max(0, Math.floor(Number(s) || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};

export const normaliza = (t: string) =>
  (t || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\w\s%]/gi, " ").replace(/\s+/g, " ").trim();

export const palabras = (t: string) => (t || "").trim().split(/\s+/).filter((w) => w.length > 0);

export const nivel = (p: number): Nivel => (p >= 75 ? "bien" : p >= 50 ? "ajusta" : "revisa");
export const etiquetaNivel = (p: number) => (p >= 75 ? "Sólido" : p >= 50 ? "Ajustable" : "Prioridad");

/** Semáforo: con puntaje nulo es «sin practicar», que no es un suspenso. */
export const semaforoNivel = (p: unknown): NivelSem =>
  p == null || p === "" || isNaN(Number(p)) ? "nada" : nivel(Number(p));
export const semaforoEtiqueta = (p: unknown) => (semaforoNivel(p) === "nada" ? "Sin practicar" : etiquetaNivel(Number(p)));

export type Muletillas = { total: number; ponderado: number; detalle: Record<string, number>; top: [string, number][] };

const escRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function contarMuletillas(texto: string): Muletillas {
  const n = " " + normaliza(texto) + " ";
  const detalle: Record<string, number> = {};
  let total = 0;
  let ponderado = 0;
  const contar = (lista: string[], peso: number) => {
    lista.forEach((m) => {
      const t = normaliza(m);
      if (!t) return;
      const c = (n.match(new RegExp("(?<=\\s)" + escRe(t) + "(?=\\s)", "g")) || []).length;
      if (c > 0) {
        detalle[m] = (detalle[m] || 0) + c;
        total += c;
        ponderado += c * peso;
      }
    });
  };
  contar(MULETILLAS_FUERTES, 1);
  contar(MULETILLAS_SUAVES, 0.5);
  const top = Object.entries(detalle).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { total, ponderado, detalle, top };
}

export type SeccionTiempo = Seccion & { desde: number; hasta: number; dur: number };

export function seccionesConTiempo(tipo: TipoId, duracion: number): SeccionTiempo[] {
  let acum = 0;
  return TIPOS[tipo].secciones.map((s) => {
    const dur = Math.round(duracion * s.peso);
    const desde = acum;
    acum += dur;
    return { ...s, desde, hasta: acum, dur };
  });
}

export type Resultado = {
  dims: Dimension[];
  puntaje: number;
  positivos: Dimension[];
  mejoras: Dimension[];
  texto: string;
  segundos: number;
  tipo: TipoId;
  duracion: number;
  modo: Modo;
  visual: ResumenVisual | null;
  meta: { nPal: number; ppm: number; muletillas: Muletillas; cifras: number; cubiertas: number; totalSecciones: number; faltantes: string[] };
};

export type EntradaAnalisis = {
  texto: string;
  segundos: number;
  tipo: TipoId;
  duracion: number;
  modo: Modo;
  visual: ResumenVisual | null;
  camaraUsada: boolean;
  motivoCamara: string;
};

export function analizar(e: EntradaAnalisis): Resultado {
  const { texto, segundos, tipo, duracion, modo } = e;
  const pal = palabras(texto);
  const nPal = pal.length;
  const min = Math.max(segundos / 60, 0.05);
  const ppm = Math.round(nPal / min);
  const mule = contarMuletillas(texto);
  const mulePorMin = mule.ponderado / min;
  const secciones = seccionesConTiempo(tipo, duracion);
  const norm = normaliza(texto);
  const dims: Dimension[] = [];

  /* 1 · Duración */
  const desvio = (segundos - duracion) / duracion;
  const absDes = Math.abs(desvio);
  const pDur = absDes <= 0.05 ? 100 : absDes <= 0.1 ? 88 : absDes <= 0.2 ? 68 : absDes <= 0.35 ? 45 : 22;
  dims.push({
    id: "duracion", n: "Duración", val: mmss(segundos), pct: pDur,
    dato: "objetivo " + mmss(duracion) + " · desvío " + (desvio >= 0 ? "+" : "−") + Math.round(absDes * 100) + "%",
    txt:
      absDes <= 0.1
        ? "Cerraste dentro del margen del formato. Eso ya es señal de que el contenido está calibrado al tiempo."
        : desvio > 0
          ? "Te pasaste del objetivo. En un escenario real te habrían cortado: sobra contenido, no falta tiempo."
          : "Terminaste antes de lo previsto. Sobra espacio para una evidencia concreta en el núcleo del pitch.",
  });

  /* 2 · Ritmo */
  let pRit: number;
  if (ppm >= 115 && ppm <= 160) pRit = 100;
  else if (ppm >= 100 && ppm < 115) pRit = 78;
  else if (ppm > 160 && ppm <= 180) pRit = 72;
  else if (ppm >= 85 && ppm < 100) pRit = 55;
  else if (ppm > 180 && ppm <= 200) pRit = 48;
  else pRit = 28;
  dims.push({
    id: "ritmo", n: "Ritmo", val: ppm + " ppm", pct: pRit,
    dato: nPal + " palabras en " + mmss(segundos) + " · rango bueno 115–160",
    txt:
      pRit >= 75
        ? "Ritmo dentro del rango en que una audiencia sigue sin esfuerzo."
        : ppm > 160
          ? "Vas rápido. A esa velocidad quien escucha deja de procesar y solo alcanza a oír."
          : "Vas lento. Hay espacio para decir más, o el discurso está sostenido por pausas de duda.",
  });

  /* 3 · Fluidez */
  const pFlu = mulePorMin <= 1 ? 100 : mulePorMin <= 2.5 ? 82 : mulePorMin <= 4 ? 62 : mulePorMin <= 6 ? 40 : 20;
  dims.push({
    id: "fluidez", n: "Fluidez", val: String(mule.total), pct: pFlu,
    dato: mulePorMin.toFixed(1) + " por minuto" + (mule.top.length ? " · " + mule.top.map((t) => "«" + t[0] + "» ×" + t[1]).join(", ") : ""),
    txt:
      pFlu >= 75
        ? "Muy pocas muletillas. El discurso avanza sin relleno."
        : "Las muletillas aparecen cuando el cerebro busca la siguiente idea. Se reducen conociendo mejor la estructura, no hablando más despacio.",
  });

  /* 4 · Estructura */
  const cobertura = secciones.map((s) => {
    const hits = s.kw.filter((k) => norm.includes(normaliza(k))).length;
    return { n: s.n, hits, cubierta: hits >= 2 };
  });
  const cubiertas = cobertura.filter((c) => c.cubierta).length;
  const pEst = Math.round((cubiertas / secciones.length) * 100);
  const faltantes = cobertura.filter((c) => !c.cubierta).map((c) => c.n);
  dims.push({
    id: "estructura", n: "Cobertura de estructura", val: cubiertas + "/" + secciones.length, pct: pEst,
    dato: faltantes.length ? "sin señal en: " + faltantes.join(", ") : "todas las secciones aparecen",
    txt: faltantes.length
      ? "No se detectó lenguaje propio de " + (faltantes.length === 1 ? "una sección" : faltantes.length + " secciones") + ". Puede ser que las omitieras, o que las dijeras en términos tan generales que no se distinguen."
      : "Recorriste las secciones del guion. La estructura se sostuvo de principio a fin.",
  });

  /* 5 · Concreción: cuántas «anclas» (datos verificables) tiene el discurso */
  const cifras = (texto.match(/\b\d+([.,]\d+)?\s*(%|por ciento|mil|millones?|años?|meses?|semanas?|d[ií]as?|horas?|minutos?|veces|personas|clientes|usuarios|pesos|d[oó]lares)?/gi) || [])
    .map((c) => c.trim())
    .filter(Boolean);
  const propios = texto.match(/(?<![.!?¿¡]\s)(?<!^)\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/g) || [];
  const propiosUnicos = Array.from(new Set(propios));
  // Un nombre propio cuenta la mitad que una cifra y se topa en 8: sitúa, pero no prueba.
  const anclas = cifras.length + Math.min(propiosUnicos.length, 8) * 0.5;
  const cada100 = anclas / Math.max(1, nPal / 100);
  let pCon = cada100 >= 4 ? 100 : cada100 >= 2.5 ? 82 : cada100 >= 1.5 ? 62 : cada100 >= 0.8 ? 42 : 22;
  if (cada100 > 9) pCon = Math.min(pCon, 74); // saturado de números
  const ejemploCifras = cifras.slice(0, 3).map((c) => "«" + c + "»").join(", ");
  const faltan = Math.max(0, Math.ceil(2.5 * Math.max(1, nPal / 100) - anclas));
  const que = "Una «ancla» es un dato que quien escucha puede verificar o recordar: una cifra, una fecha, un plazo, el nombre de un cliente o de una institución. ";
  const txtCon =
    cada100 > 9
      ? que + "Aquí sobran: el discurso se volvió un listado de números y ninguno alcanza a pesar. Quédate con los dos o tres que de verdad prueban tu punto y explica qué significan."
      : pCon >= 75
        ? que + "Tienes suficientes y bien repartidas. Los números hacen el trabajo que los adjetivos no pueden: «redujimos 40%» convence donde «mejoramos mucho» no dice nada."
        : que + "En esta ronda " + (anclas < 1 ? "no apareció ninguna" : "aparecieron pocas") + ". Para un texto de " + nPal + " palabras te " +
          (faltan === 1 ? "falta 1" : "faltan unas " + faltan) + ". Revisa cada frase con un adjetivo —«muy eficiente», «gran impacto»— y cámbiala por el dato que la respalda.";
  dims.push({
    id: "concrecion", n: "Concreción · datos que respaldan",
    val: cifras.length + (cifras.length === 1 ? " cifra" : " cifras"), pct: pCon,
    dato:
      "detectadas: " + (ejemploCifras || "ninguna cifra") +
      (propiosUnicos.length ? " · " + propiosUnicos.length + (propiosUnicos.length === 1 ? " nombre propio" : " nombres propios") : " · sin nombres propios") +
      " · " + cada100.toFixed(1).replace(".", ",") + " anclas por cada 100 palabras · rango bueno 2,5–6",
    txt: txtCon,
  });

  /* 6 · Cierre con petición */
  const corte = Math.floor(pal.length * 0.78);
  const cola = normaliza(pal.slice(corte).join(" "));
  const ctas = PALABRAS_CTA.filter((c) => cola.includes(normaliza(c)));
  const hayPregunta = /[?¿]/.test(pal.slice(corte).join(" "));
  const pCie = ctas.length >= 2 ? 100 : ctas.length === 1 ? 76 : hayPregunta ? 58 : 20;
  dims.push({
    id: "cierre", n: "Cierre con petición", val: ctas.length ? "Sí" : hayPregunta ? "Parcial" : "No", pct: pCie,
    dato: ctas.length ? "detectado: " + ctas.slice(0, 3).map((c) => "«" + c + "»").join(", ") : "no se detectó una petición explícita en el tramo final",
    txt:
      pCie >= 75
        ? "Cerraste pidiendo algo concreto. Eso convierte el pitch en una conversación que continúa."
        : "El final se apaga sin pedir nada. Define en una frase qué quieres que pase después y dilo en voz alta.",
  });

  /* 7 · Presencia visual (sin cámara: pct null, no entra al promedio) */
  dims.push(dimensionVisual(e.visual, e.camaraUsada, e.motivoCamara));

  const medibles = dims.filter((d) => d.pct !== null);
  const puntaje = Math.round(medibles.reduce((a, d) => a + (d.pct as number), 0) / medibles.length);
  const positivos = medibles.filter((d) => (d.pct as number) >= 75).sort((a, b) => (b.pct as number) - (a.pct as number));
  const mejoras = medibles.filter((d) => (d.pct as number) < 75).sort((a, b) => (a.pct as number) - (b.pct as number));

  return {
    dims, puntaje, positivos, mejoras, texto, segundos, tipo, duracion, modo, visual: e.visual,
    meta: { nPal, ppm, muletillas: mule, cifras: cifras.length, cubiertas, totalSecciones: secciones.length, faltantes },
  };
}

/* ───────── Ejercicio sugerido (los pasos usan **negrita**) ───────── */
export type Ejercicio = { titulo: string; texto: string; pasos: string[] };

export function ejercicioPara(res: Resultado): Ejercicio {
  const peor = res.mejoras[0];
  const t = TIPOS[res.tipo];
  const mapa: Record<string, Ejercicio> = {
    duracion: {
      titulo: "Recorta antes de repetir",
      texto: "El problema no es la velocidad, es el volumen de contenido. Antes de la siguiente ronda, decide qué sale.",
      pasos: [
        "Escribe tu guion completo y **marca una sola idea por sección**. Todo lo demás se va.",
        "Cronometra cada sección por separado leyendo en voz alta, sin apurarte.",
        "Suma los tiempos. Si el total pasa el objetivo, recorta contenido — nunca aceleres para que quepa.",
      ],
    },
    ritmo: {
      titulo: "Calibra la velocidad con un tramo de referencia",
      texto: "El ritmo cómodo está entre 115 y 160 palabras por minuto. Se entrena con un fragmento corto, no con el pitch entero.",
      pasos: [
        "Toma **solo la primera sección** del guion y dila en voz alta cronometrando.",
        "Ajusta hasta que ese tramo caiga en su tiempo asignado sin correr ni arrastrar.",
        "Cuando lo tengas, ese es tu ritmo de referencia. Repite el pitch completo tratando de sostenerlo.",
      ],
    },
    fluidez: {
      titulo: "Cambia la muletilla por silencio",
      texto: "Las muletillas aparecen mientras buscas la siguiente idea. La solución no es hablar más despacio: es tener la estructura tan clara que no necesites rellenar.",
      pasos: [
        "Memoriza **la primera frase de cada sección** — solo esas. Son tus puntos de anclaje.",
        "Practica y cada vez que sientas venir una muletilla, **calla dos segundos**. Un silencio breve se lee como seguridad; «eh» se lee como duda.",
        "Repite hasta que las transiciones entre secciones salgan sin relleno.",
      ],
    },
    estructura: {
      titulo: "Recorre el guion sección por sección",
      texto: "Quedaron secciones sin señal clara: " + (res.meta.faltantes.join(", ") || "—") + ". O no las dijiste, o fueron tan generales que se diluyeron.",
      pasos: [
        "Vuelve a la etapa **Prepara** y lee el objetivo de cada sección que falló.",
        "Escribe **una frase concreta** que responda a cada pregunta guía de esas secciones.",
        "Practica solo esas secciones aisladas antes de volver al pitch completo.",
      ],
    },
    concrecion: {
      titulo: "Una cifra por sección",
      texto: "Sin datos concretos, cualquier persona podría decir lo mismo que tú. La especificidad es lo que hace un pitch memorable.",
      pasos: [
        "Elige **un número real por sección**: un porcentaje, un plazo, un monto, una cantidad de casos.",
        "Escríbelos en las notas de apoyo antes de practicar.",
        "En la siguiente ronda, oblígate a decir todos. Si no tienes el dato, di el orden de magnitud — pero no lo reemplaces por un adjetivo.",
      ],
    },
    cierre: {
      titulo: "Escribe tu petición antes de ensayar",
      texto: "Para un pitch de tipo «" + t.corto.toLowerCase() + "», la última frase decide si hay siguiente conversación.",
      pasos: [
        "Completa esta frase: **«Me gustaría ___ para ___»**. Sé específico en tiempo y acción.",
        "Escríbela literal en las notas de apoyo.",
        "Practica los últimos 30 segundos por separado, cinco veces, hasta que salga sin titubear.",
      ],
    },
    visual: {
      titulo: "Arma el encuadre antes de hablar",
      texto: "Lo que se ve pesa antes de que digas la primera frase. El encuadre y la postura se deciden en treinta segundos, no en el pitch.",
      pasos: [
        "Sube la cámara **a la altura de los ojos** — con libros si hace falta — y siéntate a distancia de brazo.",
        "Encuádrate de la mitad del pecho para arriba, con dos dedos de aire sobre la cabeza, y deja el lente al frente.",
        "Pega tus notas **justo debajo del lente**: así el gesto de leer no te saca de la cámara.",
        "Antes de empezar, planta los pies o apoya la espalda. Repite la ronda y compara el puntaje de encuadre.",
      ],
    },
  };
  return (
    (peor && mapa[peor.id]) || {
      titulo: "Sube la exigencia",
      texto: "Todas las dimensiones medidas están en verde. El siguiente nivel es hacerlo bajo presión.",
      pasos: [
        "Repite el pitch **sin mirar el guion ni las notas**.",
        "Pídele a alguien que te interrumpa a mitad de camino con una pregunta y retoma donde ibas.",
        "Prueba el mismo contenido en el formato inmediatamente más corto.",
      ],
    }
  );
}

export const veredicto = (p: number) =>
  p >= 75
    ? "Entrega sólida. Lo que sigue es pulir detalles, no rehacer el pitch."
    : p >= 50
      ? "La base está. Hay dos o tres ajustes concretos que cambian bastante el resultado."
      : "Todavía hay trabajo estructural. Empieza por la dimensión más baja y repite.";

/** Parte el texto en trozos marcando las muletillas, para resaltarlas sin inyectar HTML. */
export function trozosConMuletillas(texto: string): { t: string; mula: boolean }[] {
  const todas = MULETILLAS_FUERTES.concat(MULETILLAS_SUAVES).slice().sort((a, b) => b.length - a.length).map(escRe);
  const re = new RegExp("(^|[\\s,;.:¡¿(])(" + todas.join("|") + ")(?=[\\s,;.:!?)]|$)", "gi");
  const out: { t: string; mula: boolean }[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    const ini = (m.index ?? 0) + m[1].length;
    if (ini > ultimo) out.push({ t: texto.slice(ultimo, ini), mula: false });
    out.push({ t: m[2], mula: true });
    ultimo = ini + m[2].length;
  }
  if (ultimo < texto.length) out.push({ t: texto.slice(ultimo), mula: false });
  return out;
}

/* ───────── Fila que se guarda (el audio NUNCA entra aquí) ───────── */
export type RondaNueva = {
  creada_en: string;
  tipo: string;
  tipo_nombre: string;
  duracion_objetivo: number;
  duracion_real: number;
  modo: string;
  puntaje: number;
  palabras: number;
  ppm: number;
  muletillas_total: number;
  muletillas_top: { palabra: string; veces: number }[];
  secciones_cubiertas: number;
  secciones_total: number;
  dimensiones: { id: string; nombre: string; valor: string; pct: number | null; dato: string; texto: string }[];
  ejercicio: Ejercicio;
  visual: VisualGuardado;
  transcripcion: string;
};

export function construirRonda(res: Resultado): RondaNueva {
  const ej = ejercicioPara(res);
  return {
    creada_en: new Date().toISOString(),
    tipo: res.tipo,
    tipo_nombre: TIPOS[res.tipo].nombre,
    duracion_objetivo: res.duracion,
    duracion_real: Math.round(res.segundos),
    modo: res.modo,
    puntaje: res.puntaje,
    palabras: res.meta.nPal,
    ppm: res.meta.ppm,
    muletillas_total: res.meta.muletillas.total,
    muletillas_top: res.meta.muletillas.top.map((x) => ({ palabra: x[0], veces: x[1] })),
    secciones_cubiertas: res.meta.cubiertas,
    secciones_total: res.meta.totalSecciones,
    dimensiones: res.dims.map((d) => ({ id: d.id, nombre: d.n, valor: d.val, pct: d.pct, dato: d.dato, texto: d.txt })),
    ejercicio: { titulo: ej.titulo, texto: ej.texto, pasos: ej.pasos.map((p) => p.replace(/\*\*/g, "")) },
    visual: resumenParaRonda(res.visual),
    transcripcion: res.texto,
  };
}
