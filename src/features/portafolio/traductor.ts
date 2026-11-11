import { supabase } from "@/lib/supabase";

/* Traducción al inglés. Primero el traductor del propio navegador (API Translator): gratis, sin
   cuenta y el texto no sale del equipo. Si no existe, la Edge Function «traducir» (Gemini). */

type Motor = {
  create(o: { sourceLanguage: string; targetLanguage: string; monitor?: (m: EventTarget) => void }): Promise<{ translate(t: string): Promise<string> }>;
  availability?(o: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
};

const ORIGEN = "es";
const DESTINO = "en";
let instancia: { translate(t: string): Promise<string> } | null = null;
let creando: Promise<{ translate(t: string): Promise<string> }> | null = null;

function motor(): Motor | null {
  const g = globalThis as unknown as { Translator?: Motor };
  return g.Translator?.create ? g.Translator : null;
}

export const hayTraductorLocal = () => Boolean(motor());

export class ErrorTraductor extends Error {}

const ESPERA_ARRANQUE = 20_000;
const ESPERA_DESCARGA = 300_000;

function conPlazo<T>(p: Promise<T>, hayVida: (marcar: () => void) => void): Promise<T> {
  return new Promise((ok, no) => {
    let reloj: number;
    let vivo = false;
    let fin = false;
    const armar = (ms: number) => {
      window.clearTimeout(reloj);
      reloj = window.setTimeout(() => {
        if (!fin) {
          fin = true;
          no(new ErrorTraductor(vivo ? "descarga-lenta" : "no-arranca"));
        }
      }, ms);
    };
    hayVida(() => {
      if (!fin) {
        vivo = true;
        armar(ESPERA_DESCARGA);
      }
    });
    armar(ESPERA_ARRANQUE);
    p.then(
      (v) => {
        if (!fin) {
          fin = true;
          window.clearTimeout(reloj);
          ok(v);
        }
      },
      (e) => {
        if (!fin) {
          fin = true;
          window.clearTimeout(reloj);
          no(e);
        }
      },
    );
  });
}

async function preparar(alProgreso?: (pct: number) => void) {
  if (instancia) return instancia;
  if (creando) return creando;
  const m = motor();
  if (!m) throw new ErrorTraductor("sin-soporte");
  creando = (async () => {
    const est = m.availability ? await m.availability({ sourceLanguage: ORIGEN, targetLanguage: DESTINO }).catch(() => "unavailable") : "available";
    if (est === "unavailable") throw new ErrorTraductor("par-no-disponible");
    let avisarVida: () => void = () => {};
    const creacion = m.create({
      sourceLanguage: ORIGEN,
      targetLanguage: DESTINO,
      monitor: (mon) =>
        mon.addEventListener("downloadprogress", (e) => {
          avisarVida();
          const ev = e as Event & { loaded: number; total?: number };
          alProgreso?.(Math.round((ev.loaded / (ev.total || 1)) * 100));
        }),
    });
    instancia = await conPlazo(Promise.resolve(creacion), (marcar) => (avisarVida = marcar));
    return instancia;
  })().finally(() => {
    creando = null;
  });
  return creando;
}

async function traducirConIA(texto: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("traducir", { body: { texto } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const cuerpo = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
    if (ctx?.status === 404) throw new Error("el servicio de traducción todavía no está desplegado en Supabase (falta la Edge Function «traducir»)");
    if (ctx?.status === 503) throw new Error("el servicio de traducción está desplegado pero le falta la clave del proveedor");
    throw new Error(cuerpo?.error ?? error.message);
  }
  const t = (data as { texto?: string } | null)?.texto;
  if (!t) throw new Error("respuesta-vacia");
  return t;
}

/* «**Etiqueta:** valor» y prefijos de Markdown: se traduce la prosa, no la sintaxis. */
function piezas(linea: string): { pre: string; txt: string; post: string } | null {
  if (!linea.trim() || linea.trim() === "---") return null;
  let m = /^(#{1,6} )(.*)$/.exec(linea) ?? /^(> )(.*)$/.exec(linea) ?? /^(- \[[ x]\] )(.*)$/.exec(linea) ?? /^(- )(.*)$/.exec(linea);
  if (m) return { pre: m[1], txt: m[2], post: "" };
  m = /^\*([^*].*)\*$/.exec(linea.trim());
  if (m) return { pre: "*", txt: m[1], post: "*" };
  return { pre: "", txt: linea, post: "" };
}

async function enElEquipo(md: string, alProgreso?: (p: number) => void, alAvance?: (p: number) => void) {
  const t = await preparar(alProgreso);
  const ls = md.split("\n");
  const out: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const p = piezas(ls[i]);
    if (!p || !p.txt.trim()) out.push(ls[i]);
    else {
      const m = /^\*\*([^*]+)\*\*(.*)$/.exec(p.txt);
      if (m) {
        const [et, val] = await Promise.all([t.translate(m[1].trim()), m[2].trim() ? t.translate(m[2].trim()) : Promise.resolve("")]);
        out.push(`${p.pre}**${et}**${val ? " " + val : ""}${p.post}`);
      } else out.push(p.pre + (await t.translate(p.txt)) + p.post);
    }
    alAvance?.(Math.round(((i + 1) / ls.length) * 100));
  }
  return out.join("\n");
}

/** `hayIA` = hay sesión, así que la Edge Function sirve de respaldo. */
export async function traducirMarkdown(md: string, hayIA: boolean, alProgreso?: (p: number) => void, alAvance?: (p: number) => void): Promise<string> {
  if (!hayTraductorLocal() && hayIA) return traducirConIA(md);
  try {
    return await enElEquipo(md, alProgreso, alAvance);
  } catch (e) {
    if (hayIA) return traducirConIA(md);
    throw e;
  }
}

export function mensajeTraductor(err: unknown): string {
  const causa = err instanceof Error ? err.message : "";
  if (causa === "sin-soporte") return "Tu navegador no incluye traductor. Copia el texto y tradúcelo aparte.";
  if (causa === "par-no-disponible") return "Tu navegador no tiene disponible la traducción de español a inglés. Revisa los idiomas instalados en su configuración, o copia el texto y tradúcelo aparte.";
  if (causa === "no-arranca") return "El traductor del navegador no respondió. Suele pasar la primera vez: vuelve a intentarlo, y si sigue igual copia el texto y tradúcelo aparte.";
  if (causa === "descarga-lenta") return "La descarga del modelo de traducción está tardando demasiado. Comprueba tu conexión y vuelve a intentarlo.";
  return err instanceof Error && causa ? `No se pudo traducir: ${causa}.` : "No se pudo traducir. Intenta de nuevo o copia el texto.";
}
