import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase, mensajeDeError } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Cargando } from "@/components/ui";
import { contenidoVacio, normalizar, type Contenido } from "./tipos";
import { metricas, programaDeCuenta } from "./logica";

export type EstadoGuardado = "limpio" | "pendiente" | "guardando" | "guardado" | "error";

type Ctx = {
  c: Contenido;
  /** Cambia campos; guarda solo (con espera de ~1,5 s). */
  set(patch: Partial<Contenido> | ((c: Contenido) => Partial<Contenido>)): void;
  estado: EstadoGuardado;
  error: string;
  portafolioId: string | null;
  /** Guarda ya, sin esperar. */
  guardarYa(): Promise<string | null>;
  marcarDescargado(): void;
  marcarRevisado(): Promise<string | null>;
  vaciar(): Promise<void>;
  /** El programa viene de la cuenta: no se edita aquí. */
  programaDeCuenta: boolean;
};

const BorradorCtx = createContext<Ctx | null>(null);
export const useBorrador = () => {
  const x = useContext(BorradorCtx);
  if (!x) throw new Error("useBorrador fuera de <BorradorProvider>");
  return x;
};

const ESPERA = 1500;

export function BorradorProvider({ children }: { children: ReactNode }) {
  const { session, perfil } = useAuth();
  const uid = session?.user.id ?? "";
  const [c, setC] = useState<Contenido>(contenidoVacio);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<EstadoGuardado>("limpio");
  const [error, setError] = useState("");
  const [portafolioId, setPortafolioId] = useState<string | null>(null);

  // Lo que se guarda se lee de refs: el temporizador y el cierre de página ven siempre lo último.
  const cRef = useRef(c);
  const sucio = useRef(false);
  const ocupado = useRef(false);
  const repetir = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const flags = useRef({ descargado: false, revisado_ia: false });
  const idRef = useRef<string | null>(null);

  const delPerfil = Boolean(perfil?.programa || perfil?.facultad);

  /* ── Carga ── */
  useEffect(() => {
    if (!uid) return;
    let vivo = true;
    (async () => {
      const { data, error: e } = await supabase.from("portafolios").select("id, contenido, descargado, revisado_ia").eq("usuario_id", uid).maybeSingle();
      if (!vivo) return;
      if (e) setError(mensajeDeError(e));
      let inicial = normalizar((data?.contenido ?? null) as Partial<Contenido> | null);
      // Quien creó su cuenta ya dijo su programa: no se le vuelve a preguntar.
      const p = programaDeCuenta(perfil?.programa ?? "", perfil?.facultad ?? "");
      if (p) inicial = { ...inicial, ...p, area: p.area || inicial.area };
      cRef.current = inicial;
      idRef.current = data?.id ?? null;
      flags.current = { descargado: Boolean(data?.descargado), revisado_ia: Boolean(data?.revisado_ia) };
      sucio.current = false;
      setC(inicial);
      setPortafolioId(data?.id ?? null);
      setEstado(data ? "guardado" : "limpio");
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
    // El perfil llega poco después de la sesión: se recarga cuando cambia el programa.
  }, [uid, perfil?.programa, perfil?.facultad]);

  /* ── Guardado ── */
  const guardar = useCallback(async (): Promise<string | null> => {
    window.clearTimeout(timer.current);
    if (!uid) return null;
    if (ocupado.current) {
      repetir.current = true;
      return idRef.current;
    }
    // Sin cambios no se escribe: guardar contenido sin cargar aún pisaría el borrador del servidor.
    if (!sucio.current) return idRef.current;
    ocupado.current = true;
    sucio.current = false;
    setEstado("guardando");
    const contenido = cRef.current;
    const { data, error: e } = await supabase
      .from("portafolios")
      .upsert({ usuario_id: uid, contenido, ...metricas(contenido), ...flags.current }, { onConflict: "usuario_id" })
      .select("id")
      .single();
    ocupado.current = false;
    if (e) {
      sucio.current = true;
      setError(mensajeDeError(e));
      setEstado("error");
      return null;
    }
    idRef.current = data.id;
    setPortafolioId(data.id);
    setError("");
    if (repetir.current || sucio.current) {
      repetir.current = false;
      void guardar();
    } else setEstado("guardado");
    return data.id;
  }, [uid]);

  const marcarSucio = useCallback(() => {
    sucio.current = true;
    setEstado("pendiente");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void guardar(), ESPERA);
  }, [guardar]);

  const set = useCallback<Ctx["set"]>(
    (patch) => {
      const siguiente = { ...cRef.current, ...(typeof patch === "function" ? patch(cRef.current) : patch) };
      cRef.current = siguiente;
      setC(siguiente);
      marcarSucio();
    },
    [marcarSucio],
  );

  // Al salir de la herramienta no se pierde lo escrito.
  useEffect(() => () => void guardar(), [guardar]);
  useEffect(() => {
    const aviso = (ev: BeforeUnloadEvent) => {
      if (sucio.current || ocupado.current) ev.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, []);

  const marcarDescargado = useCallback(() => {
    flags.current.descargado = true;
    sucio.current = true;
    void guardar();
  }, [guardar]);

  const marcarRevisado = useCallback(async () => {
    flags.current.revisado_ia = true;
    sucio.current = true;
    return guardar();
  }, [guardar]);

  const vaciar = useCallback(async () => {
    window.clearTimeout(timer.current);
    sucio.current = false;
    const { error: e } = await supabase.from("portafolios").delete().eq("usuario_id", uid);
    if (e) {
      setError(mensajeDeError(e));
      setEstado("error");
      return;
    }
    const p = programaDeCuenta(perfil?.programa ?? "", perfil?.facultad ?? "");
    const nuevo = { ...contenidoVacio(), ...(p ?? {}) };
    cRef.current = nuevo;
    idRef.current = null;
    flags.current = { descargado: false, revisado_ia: false };
    setC(nuevo);
    setPortafolioId(null);
    setError("");
    setEstado("limpio");
  }, [uid, perfil?.programa, perfil?.facultad]);

  const valor = useMemo<Ctx>(
    () => ({ c, set, estado, error, portafolioId, guardarYa: guardar, marcarDescargado, marcarRevisado, vaciar, programaDeCuenta: delPerfil }),
    [c, set, estado, error, portafolioId, guardar, marcarDescargado, marcarRevisado, vaciar, delPerfil],
  );

  if (cargando) return <Cargando texto="Abriendo tu portafolio…" />;
  return <BorradorCtx.Provider value={valor}>{children}</BorradorCtx.Provider>;
}
