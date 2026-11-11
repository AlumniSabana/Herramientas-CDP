import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { TIPOS, type TipoId } from "./contenido";
import { listarRondas, type Ronda } from "./datos";
import type { Obs } from "./observaciones";
import type { Resultado } from "./analisis";

export type Reporte = {
  res: Resultado;
  idGuardado: string | null;
  obs: { obs: Obs; texto: string; plano: string } | null;
  errorGuardado?: string;
};

type Ctx = {
  tipo: TipoId;
  elegirTipo(t: TipoId, conDuracionSugerida?: boolean): void;
  duracion: number;
  setDuracion(d: number): void;
  notas: string;
  setNotas(n: string): void;
  /** El reporte vive solo en memoria: sin cuenta no se guarda nada, en ninguna parte. */
  reporte: Reporte | null;
  setReporte: Dispatch<SetStateAction<Reporte | null>>;
  historial: Ronda[];
  errorHistorial: string;
  recargarHistorial(): Promise<void>;
};

const PitchCtx = createContext<Ctx | null>(null);

export function usePitch() {
  const c = useContext(PitchCtx);
  if (!c) throw new Error("usePitch fuera de <PitchProvider>");
  return c;
}

export function PitchProvider({ children }: { children: ReactNode }) {
  const { perfil } = useAuth();
  const [tipo, setTipo] = useState<TipoId>("empleo");
  const [duracion, setDuracion] = useState(180);
  const [notas, setNotas] = useState("");
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [historial, setHistorial] = useState<Ronda[]>([]);
  const [errorHistorial, setErrorHistorial] = useState("");

  const uid = perfil?.id ?? null;

  const recargarHistorial = useCallback(async () => {
    if (!uid) {
      setHistorial([]);
      return;
    }
    try {
      setHistorial(await listarRondas(uid));
      setErrorHistorial("");
    } catch (e) {
      setHistorial([]);
      setErrorHistorial(e instanceof Error ? e.message : "error desconocido");
    }
  }, [uid]);

  useEffect(() => {
    void recargarHistorial();
  }, [recargarHistorial]);

  const elegirTipo = useCallback((t: TipoId, conDuracionSugerida = false) => {
    setTipo(t);
    if (conDuracionSugerida) setDuracion(TIPOS[t].duracionSugerida);
  }, []);

  const valor = useMemo<Ctx>(
    () => ({ tipo, elegirTipo, duracion, setDuracion, notas, setNotas, reporte, setReporte, historial, errorHistorial, recargarHistorial }),
    [tipo, elegirTipo, duracion, notas, reporte, historial, errorHistorial, recargarHistorial],
  );
  return <PitchCtx.Provider value={valor}>{children}</PitchCtx.Provider>;
}
