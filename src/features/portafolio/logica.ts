import { AREAS, OBJETIVOS, OBJETIVOS_OPC, ETAPAS, PROGRAMAS, PROGRAMAS_OTROS, REGLAS_FICHA, type ClaveRegla } from "./datos";
import type { Contenido, Ficha, Revision, FilaRevision } from "./tipos";

export const contarPalabras = (s: string) => s.split(/\s+/).filter(Boolean).length;
const lineas = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const ph = (v: string, marcador: string) => (v.trim() ? v.trim() : `[${marcador}]`);

export const fechaCorta = (t: string | null | undefined) => (t ? String(t).replace("T", " ").slice(0, 16) : "—");

/* ───────── Programa ───────── */
export const norm = (t: string) =>
  String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function facultadDe(c: Pick<Contenido, "area" | "programa">): string {
  return PROGRAMAS.find((g) => g.programas.some((p) => p.area === c.area && p.nombre === c.programa))?.facultad ?? "";
}

/** Programa y facultad que ya dio la persona al crear su cuenta. */
export function programaDeCuenta(programa: string, facultad: string): Pick<Contenido, "seleccion" | "area" | "programa" | "facultad"> | null {
  if (!programa && !facultad) return null;
  const meta = norm(programa);
  let aprox: { area: string; nombre: string; facultad: string } | null = null;
  for (const g of PROGRAMAS)
    for (const p of g.programas) {
      const n = norm(p.nombre);
      if (n === meta) return { seleccion: `${p.area}|${p.nombre}`, area: p.area, programa: p.nombre, facultad: g.facultad };
      if (!aprox && meta && (n.startsWith(meta) || meta.startsWith(n))) aprox = { area: p.area, nombre: p.nombre, facultad: g.facultad };
    }
  if (aprox) return { seleccion: `${aprox.area}|${aprox.nombre}`, area: aprox.area, programa: aprox.nombre, facultad: aprox.facultad };
  // No está en la lista: «otro», con el nombre escrito y el área deducida de la facultad.
  return { seleccion: "otro|", area: areaDeFacultad(facultad), programa, facultad };
}

/** Área temática de una facultad (la del primer programa de su grupo). */
export const areaDeFacultad = (facultad: string) => PROGRAMAS.find((x) => norm(x.facultad) === norm(facultad))?.programas[0].area ?? "";

export const areaDe = (c: Contenido) => AREAS[c.area] ?? null;
export const programaNombre = (c: Contenido) => c.programa || "";
export const etiquetaEtapa = (k: string) => ETAPAS.find(([v]) => v === k)?.[1] ?? k;
export const etiquetaObjetivo = (k: string) => OBJETIVOS_OPC.find(([v]) => v === k)?.[1] ?? k;
export { PROGRAMAS_OTROS };

/* ───────── Fichas ───────── */
export type EvalFicha = { vacia: boolean; completa: boolean; faltan: string[]; palabras: Record<ClaveRegla, number> };

export function evaluarFicha(f: Ficha): EvalFicha {
  const faltan: string[] = [];
  let escrito = 0;
  const palabras = {} as Record<ClaveRegla, number>;
  (Object.keys(REGLAS_FICHA) as ClaveRegla[]).forEach((k) => {
    const n = contarPalabras(f[k].trim());
    palabras[k] = n;
    if (n) escrito++;
    if (n < REGLAS_FICHA[k].min) faltan.push(REGLAS_FICHA[k].etiqueta);
  });
  return { vacia: escrito === 0 && !f.herr.trim() && !f.competencias.trim(), completa: faltan.length === 0, faltan, palabras };
}

export const fichaConTexto = (f: Ficha) =>
  Boolean(f.titulo || f.contexto || f.objetivo || f.rol || f.acciones || f.resultado || f.evidencia);

export function evaluarProyectos(fs: Ficha[]) {
  const evals = fs.map(evaluarFicha);
  return {
    total: fs.length,
    completas: evals.filter((e) => e.completa).length,
    primera: evals.find((e) => !e.completa) ?? null,
  };
}

/* ───────── Avance ───────── */
export const HOJAS = ["identidad", "perfil", "proyectos", "impacto", "contacto"] as const;
export type Hoja = (typeof HOJAS)[number];

export function estados(c: Contenido): Record<Hoja, boolean> {
  return {
    identidad: Boolean(c.nombre.trim() || c.valor.trim()),
    perfil: Boolean(c.perfil.trim() || c.capacidades.trim()),
    proyectos: c.proyectos.some(fichaConTexto),
    impacto: Boolean(c.logros.trim() || c.testimonio.trim()),
    contacto: Boolean(c.correo.trim() || c.linkedin.trim() || c.cta.trim()),
  };
}
export const hojasCompletas = (c: Contenido) => Object.values(estados(c)).filter(Boolean).length;

/** Columnas de métricas de `portafolios` (nunca el texto). */
export function metricas(c: Contenido) {
  const evals = c.proyectos.filter(fichaConTexto).map(evaluarFicha);
  return {
    programa: c.programa,
    facultad: c.facultad,
    area: c.area,
    etapa: c.etapa,
    objetivo: c.objetivo,
    hojas_completas: hojasCompletas(c),
    fichas_total: evals.length,
    fichas_completas: evals.filter((e) => e.completa).length,
  };
}

/* ───────── Markdown ───────── */
function bloqueProyectos(o: string[], c: Contenido) {
  const ps = c.proyectos.filter(fichaConTexto);
  o.push("## Proyectos y evidencias", "");
  if (!ps.length) {
    o.push("[Aún no has redactado ninguna ficha de proyecto. Recuerda: tres proyectos bien contados valen más que diez enumerados.]", "");
    return;
  }
  ps.forEach((p) => {
    o.push(`### ${ph(p.titulo, "Título del proyecto")}`, "");
    o.push(`**Contexto o reto:** ${ph(p.contexto, "Dato por completar")}`);
    o.push(`**Objetivo:** ${ph(p.objetivo, "Dato por completar")}`);
    o.push(`**Mi rol:** ${ph(p.rol, "Dato por completar")}`);
    o.push(`**Acciones y decisiones:** ${ph(p.acciones, "Dato por completar")}`);
    if (p.herr.trim()) o.push(`**Herramientas o métodos:** ${p.herr.trim()}`);
    o.push(`**Resultado o impacto:** ${ph(p.resultado, "Resultado por confirmar")}`);
    o.push(`**Evidencia:** ${ph(p.evidencia, "Evidencia pendiente")}`);
    if (p.competencias.trim()) o.push(`**Competencias demostradas:** ${p.competencias.trim()}`);
    o.push("");
  });
}

export function armarProyectos(c: Contenido): string {
  const o: string[] = [];
  const firma = [c.nombre.trim(), c.programa, c.facultad].filter(Boolean).join(" · ");
  if (firma) o.push(`*${firma}*`, "");
  bloqueProyectos(o, c);
  o.push("---", "");
  o.push("*Fichas redactadas con la herramienta de portafolios del Centro de Desarrollo Profesional, Universidad de La Sabana. Revisa cada marcador entre corchetes antes de publicarlas.*");
  return o.join("\n");
}

export const portafolioVacio = (c: Contenido) =>
  !c.nombre.trim() && !c.valor.trim() && !c.perfil.trim() && !c.proyectos.some(fichaConTexto) && !c.correo.trim();

export function armar(c: Contenido): string {
  const a = areaDe(c);
  const o: string[] = [];
  o.push(`# ${ph(c.nombre, "Tu nombre completo")}`, "");
  const l2 = [c.programa || a?.label || "", c.facultad, c.campo.trim()].filter(Boolean).join(" · ");
  o.push(l2 || "[Programa académico y campo de desempeño]", "");
  o.push(`> ${ph(c.valor, "Propuesta de valor: profesional en [campo] que [acción] para [público o resultado]")}`, "");

  o.push("## Perfil profesional", "");
  o.push(ph(c.perfil, "Perfil por escribir: quién eres, qué sabes hacer, qué herramientas usas, qué te fortalece y qué te diferencia"), "");
  const cap = lineas(c.capacidades);
  if (cap.length) {
    o.push("**Capacidades principales**", "");
    cap.forEach((x) => o.push(`- ${x}`));
    o.push("");
  }
  const her = lineas(c.herramientas);
  if (her.length) o.push("**Herramientas y metodologías**", "", her.join(" · "), "");
  if (c.formacion.trim()) o.push(`**Formación destacada:** ${c.formacion.trim()}`, "");

  bloqueProyectos(o, c);

  const log = lineas(c.logros);
  const tes = c.testimonio.trim();
  if (log.length || tes) {
    o.push("## Impacto", "");
    log.forEach((l) => o.push(`- ${l}`));
    if (log.length) o.push("");
    if (tes) o.push(`> ${tes}`, "", "*(Testimonio publicado con autorización de quien lo emite.)*", "");
  }

  o.push("## Contacto", "");
  const canales = [c.correo, c.linkedin, c.otro].map((x) => x.trim()).filter(Boolean);
  o.push(canales.length ? canales.join(" · ") : "[Correo profesional] · [LinkedIn] · [Otro canal]", "");
  o.push(ph(c.cta, "Llamado a la acción: qué esperas que hagan después de leer tu portafolio"), "");

  o.push("---", "");
  const ctx: string[] = [];
  if (c.facultad) ctx.push(`Facultad: ${c.facultad}`);
  if (a) ctx.push(`Área: ${a.label}`);
  ctx.push(`Etapa: ${etiquetaEtapa(c.etapa)}`);
  ctx.push(`Objetivo: ${OBJETIVOS[c.objetivo] || c.objetivo}`);
  if (c.audiencia.trim()) ctx.push(`Audiencia: ${c.audiencia.trim()}`);
  o.push(`*${ctx.join(" · ")}*`, "");
  o.push("*Estructura construida con la herramienta de portafolios del Centro de Desarrollo Profesional, Universidad de La Sabana. Revisa cada marcador entre corchetes antes de publicar.*");
  return o.join("\n");
}

export function fichaMarkdown(f: Ficha): string {
  const o = [`### ${f.titulo.trim() || "Proyecto sin título"}`, ""];
  (
    [
      ["contexto", "Contexto o reto"],
      ["objetivo", "Objetivo"],
      ["rol", "Mi rol"],
      ["acciones", "Acciones y decisiones"],
      ["herr", "Herramientas o métodos"],
      ["resultado", "Resultado o impacto"],
      ["evidencia", "Evidencia"],
      ["competencias", "Competencias demostradas"],
    ] as const
  ).forEach(([k, et]) => {
    if (f[k].trim()) o.push(`**${et}:** ${f[k].trim()}`);
  });
  return o.join("\n");
}

export function checklistItems(c: Contenido, base: string[]) {
  const a = areaDe(c);
  return [...base.map((t) => ({ t, esp: false })), ...(a ? a.check.map((t) => ({ t, esp: true })) : [])];
}

export function checklistMd(c: Contenido, base: string[]) {
  return ["## Lista de verificación antes de publicar", "", ...checklistItems(c, base).map((i) => `- [${c.check[i.t] ? "x" : " "}] ${i.t}`)].join("\n");
}

/* ───────── Revisión con IA ───────── */
export const ESTADOS: Record<string, string> = { solido: "Sólido", afinar: "Por afinar", desarrollar: "Por desarrollar" };
const ESTADOS_ANTIGUOS: Record<string, string> = { mejorable: "afinar", insuficiente: "desarrollar", flojo: "desarrollar", vacio: "desarrollar" };
export function estadoValido(e: unknown): keyof typeof ESTADOS {
  let k = String(e ?? "").trim().toLowerCase();
  if (ESTADOS_ANTIGUOS[k]) k = ESTADOS_ANTIGUOS[k];
  return ESTADOS[k] ? k : "afinar";
}

export function contextoRevision(c: Contenido) {
  const a = areaDe(c);
  return {
    programa: c.programa,
    area: a?.label ?? "",
    etapa: etiquetaEtapa(c.etapa),
    objetivo: etiquetaObjetivo(c.objetivo),
    audiencia: c.audiencia.trim(),
    aviso: a?.aviso ?? "",
  };
}

export const haySuficienteParaRevisar = (c: Contenido) =>
  c.proyectos.some(fichaConTexto) || contarPalabras([c.valor, c.perfil, c.capacidades].join(" ")) >= 25;

export function revisionDesdeFila(f: Pick<FilaRevision, "resultado">): Revision {
  let r: Revision | string = f.resultado ?? {};
  if (typeof r === "string") {
    try {
      r = JSON.parse(r) as Revision;
    } catch {
      r = {};
    }
  }
  if (r.crudo) return { crudo: r.crudo };
  return { veredicto: r.veredicto ?? "", listo: r.listo === true, prioridad: r.prioridad ?? "", fichas: r.fichas, proyectos: r.proyectos ?? [], secciones: r.secciones ?? [] };
}

export function filaDeRevision(d: Revision): Revision {
  return {
    veredicto: String(d.veredicto ?? "").slice(0, 1000),
    listo: d.listo === true,
    prioridad: String(d.prioridad ?? "").slice(0, 1000),
    fichas: (d.proyectos ?? []).length,
    proyectos: d.proyectos ?? [],
    secciones: d.secciones ?? [],
    crudo: d.crudo ? String(d.crudo) : "",
  };
}
