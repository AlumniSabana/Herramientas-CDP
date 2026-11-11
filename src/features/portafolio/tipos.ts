export type Ficha = {
  id: string;
  titulo: string;
  contexto: string;
  objetivo: string;
  rol: string;
  acciones: string;
  herr: string;
  resultado: string;
  evidencia: string;
  competencias: string;
};

/** Forma del JSON que se guarda en `portafolios.contenido`. */
export type Contenido = {
  /** Valor del desplegable de programa: «area|nombre», «pos|», «tec|» u «otro|». */
  seleccion: string;
  /** Clave de la lista de programas: «eco», «pos», «otro»… */
  area: string;
  /** Nombre del programa (de la lista o escrito a mano). */
  programa: string;
  /** Facultad deducida del programa o tomada de la cuenta. */
  facultad: string;
  etapa: string;
  objetivo: string;
  audiencia: string;
  nombre: string;
  campo: string;
  valor: string;
  perfil: string;
  capacidades: string;
  herramientas: string;
  formacion: string;
  proyectos: Ficha[];
  logros: string;
  testimonio: string;
  correo: string;
  linkedin: string;
  otro: string;
  cta: string;
  /** Texto de cada punto de la lista de verificación → marcado o no. */
  check: Record<string, boolean>;
};

export const fichaVacia = (): Ficha => ({
  id: crypto.randomUUID(),
  titulo: "",
  contexto: "",
  objetivo: "",
  rol: "",
  acciones: "",
  herr: "",
  resultado: "",
  evidencia: "",
  competencias: "",
});

export const contenidoVacio = (): Contenido => ({
  seleccion: "",
  area: "",
  programa: "",
  facultad: "",
  etapa: "estudiante",
  objetivo: "practica",
  audiencia: "",
  nombre: "",
  campo: "",
  valor: "",
  perfil: "",
  capacidades: "",
  herramientas: "",
  formacion: "",
  proyectos: [fichaVacia(), fichaVacia(), fichaVacia()],
  logros: "",
  testimonio: "",
  correo: "",
  linkedin: "",
  otro: "",
  cta: "",
  check: {},
});

/** Completa lo que falte en un contenido guardado por una versión anterior. */
export function normalizar(c: Partial<Contenido> | null | undefined): Contenido {
  const base = contenidoVacio();
  const m = { ...base, ...(c ?? {}) };
  m.proyectos = Array.isArray(c?.proyectos) && c.proyectos.length ? c.proyectos.map((p) => ({ ...fichaVacia(), ...p })) : base.proyectos;
  m.check = { ...(c?.check ?? {}) };
  return m;
}

export type Revision = {
  veredicto?: string;
  listo?: boolean;
  prioridad?: string;
  fichas?: number;
  proyectos?: { ficha?: number; titulo?: string; estado?: string; observaciones?: string[] }[];
  secciones?: { nombre?: string; estado?: string; observaciones?: string[] }[];
  crudo?: string;
};

export type FilaRevision = { id: string; usuario_id: string; portafolio_id: string | null; resultado: Revision | string; creado_en: string };

export type FilaAdmin = {
  usuario_id: string;
  correo: string;
  nombre: string;
  facultad: string;
  programa: string;
  area: string | null;
  etapa: string | null;
  objetivo: string | null;
  hojas_completas: number;
  fichas_total: number;
  fichas_completas: number;
  descargado: boolean;
  revisado_ia: boolean;
  es_admin: boolean;
  creado_en: string;
  actualizado_en: string;
};

export type FilaRevisionAdmin = FilaRevision & { correo: string; nombre: string; facultad: string; programa: string; es_admin: boolean };
