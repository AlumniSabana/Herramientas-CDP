/* Acceso a datos del Estudio de Pitch. Sin cuenta no se guarda nada: estas funciones
   solo se llaman con sesión iniciada. */
import { supabase } from "@/lib/supabase";
import { normalizarObservaciones, observacionesAPlano, observacionesSerializar, type Obs } from "./observaciones";
import type { RondaNueva } from "./analisis";

export type Ronda = RondaNueva & { id: string; usuario_id: string; observaciones: string | null };
export type RondaAdmin = Ronda & { correo: string; nombre: string; facultad: string; programa: string; es_admin: boolean };
export type PerfilAdmin = { id: string; correo: string; nombre: string; facultad: string; programa: string; rol: "usuario" | "admin"; creado_en: string; ultimo_acceso: string | null };

/* ───────── Historial propio ───────── */
export async function listarRondas(uid: string): Promise<Ronda[]> {
  // El filtro por usuario es explícito: el administrador puede leer todas por política, y su
  // historial no debe mostrar las de los demás.
  const { data, error } = await supabase.from("rondas").select("*").eq("usuario_id", uid).order("creada_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Ronda[];
}

export async function guardarRonda(uid: string, r: RondaNueva): Promise<Ronda> {
  const { data, error } = await supabase.from("rondas").insert({ ...r, usuario_id: uid }).select().single();
  if (error) throw error;
  return data as Ronda;
}

export async function borrarRonda(id: string) {
  const { error } = await supabase.from("rondas").delete().eq("id", id);
  if (error) throw error;
}

export async function borrarTodas(uid: string) {
  const { error } = await supabase.from("rondas").delete().eq("usuario_id", uid);
  if (error) throw error;
}

export async function guardarObservaciones(id: string, texto: string) {
  const { error } = await supabase.from("rondas").update({ observaciones: texto }).eq("id", id);
  if (error) throw error;
}

/* ───────── Edge Function «observaciones» ───────── */
export class ErrorFuncion extends Error {
  constructor(mensaje: string, public estado: number | null) {
    super(mensaje);
  }
}

async function invocar(cuerpo: unknown): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("observaciones", { body: cuerpo as Record<string, unknown> });
  if (!error) return data;
  const ctx = (error as { context?: unknown }).context;
  const estado = ctx instanceof Response ? ctx.status : null;
  let detalle = "";
  if (ctx instanceof Response) {
    try {
      detalle = String(((await ctx.clone().json()) as { error?: string }).error ?? "");
    } catch {
      /* sin cuerpo legible */
    }
  }
  if (estado === 404 || estado === null) throw new ErrorFuncion("el servicio de IA todavía no está desplegado en Supabase (falta la Edge Function «observaciones»)", estado);
  if (estado === 503) throw new ErrorFuncion("el servicio de IA está desplegado pero le falta la clave del proveedor", estado);
  if (estado === 504) throw new ErrorFuncion("el servicio de IA tardó demasiado. Intenta de nuevo", estado);
  throw new ErrorFuncion(detalle || error.message, estado);
}

/** Con reintento si la función se queda sin recursos (546 / WORKER_LIMIT). */
async function invocarConReintento(cuerpo: unknown) {
  const esperas = [900, 2200];
  for (let i = 0; ; i++) {
    try {
      return await invocar(cuerpo);
    } catch (e) {
      const saturada = e instanceof ErrorFuncion && (e.estado === 546 || /compute resources|worker_limit/i.test(e.message));
      if (i >= esperas.length || !saturada) throw e;
      await new Promise((r) => setTimeout(r, esperas[i]));
    }
  }
}

export type ContextoObs = {
  ronda: RondaNueva;
  persona: { nombre: string; facultad: string; programa: string };
  previas: Ronda[];
};

export async function pedirObservaciones({ ronda, persona, previas }: ContextoObs): Promise<{ obs: Obs; texto: string; plano: string }> {
  const historial = previas.slice(0, 5).map((h) => ({
    fecha: h.creada_en,
    escenario: h.tipo_nombre || h.tipo,
    puntaje: h.puntaje,
    ppm: h.ppm,
    muletillas: h.muletillas_total,
    secciones: h.secciones_cubiertas + "/" + h.secciones_total,
    visual: h.visual?.medida ? { puntaje: h.visual.puntaje, encuadre: h.visual.encuadre, orientacion: h.visual.orientacion, postura: h.visual.postura } : null,
  }));
  const r = await invocarConReintento({ ronda, persona, historial, ronda_numero: previas.length + 1 });
  const obs = normalizarObservaciones(r);
  if (!obs) throw new Error("El servicio de IA no devolvió contenido.");
  return { obs, texto: observacionesSerializar(obs), plano: observacionesAPlano(obs) };
}

/** Sonda sin costo (no llama al modelo). */
export const sondaFuncion = () => invocar({ diagnostico: true }) as Promise<{ version?: string; clave_cargada?: boolean; modelo?: string; tope_diario?: number }>;

/* ───────── Consolidado de administración ───────── */
export type Consolidado = {
  rondas: RondaAdmin[];
  usuarios: PerfilAdmin[];
  cuentasAdmin: number;
  rondasOcultas: number;
  falloPerfiles: string;
};

export async function cargarConsolidado(): Promise<Consolidado> {
  const r = await supabase.from("rondas_admin").select("*").order("creada_en", { ascending: false });
  if (r.error) throw r.error;
  let rondas = (r.data ?? []) as RondaAdmin[];
  let usuarios: PerfilAdmin[] = [];
  let falloPerfiles = "";
  let cuentasAdmin = 0;
  let rondasOcultas = 0;

  // «perfiles_admin» trae a todas las personas con sesión alguna vez, hayan practicado o no.
  const u = await supabase.from("perfiles_admin").select("*").not("ultimo_acceso", "is", null).order("creado_en", { ascending: false });
  if (u.error) {
    falloPerfiles = u.error.message;
  } else {
    const todos = (u.data ?? []) as PerfilAdmin[];
    // Las cuentas de administración no son personas atendidas: se quitan de todas las listas.
    cuentasAdmin = todos.filter((x) => x.rol === "admin").length;
    usuarios = todos.filter((x) => x.rol !== "admin");
    const permitidos = new Set(usuarios.map((x) => x.correo.toLowerCase()));
    if (permitidos.size) {
      const antes = rondas.length;
      rondas = rondas.filter((x) => permitidos.has(String(x.correo || "").toLowerCase()));
      rondasOcultas = antes - rondas.length;
    } else {
      rondas = rondas.filter((x) => !x.es_admin);
    }
  }
  return { rondas, usuarios, cuentasAdmin, rondasOcultas, falloPerfiles };
}
