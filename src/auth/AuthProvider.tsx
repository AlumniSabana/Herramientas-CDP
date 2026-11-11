import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ACUERDO_VERSION } from "@/lib/catalogo";

export type Perfil = {
  id: string;
  correo: string;
  nombre: string;
  facultad: string;
  programa: string;
  rol: "usuario" | "admin";
};

export type DatosRegistro = { correo: string; clave: string; nombre: string; facultad: string; programa: string };

type Ctx = {
  cargando: boolean;
  session: Session | null;
  perfil: Perfil | null;
  esAdmin: boolean;
  ingresar(correo: string, clave: string): Promise<void>;
  registrar(d: DatosRegistro): Promise<void>;
  verificarRegistro(correo: string, codigo: string): Promise<void>;
  reenviarCodigo(correo: string): Promise<void>;
  pedirRecuperacion(correo: string): Promise<void>;
  restablecer(correo: string, codigo: string, clave: string): Promise<void>;
  salir(): Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth fuera de <AuthProvider>");
  return c;
}

async function cargarPerfil(session: Session): Promise<Perfil> {
  const { data } = await supabase.from("perfiles").select("*").eq("id", session.user.id).maybeSingle();
  if (data) return data as Perfil;
  const m = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    correo: session.user.email ?? "",
    nombre: m.nombre ?? "",
    facultad: m.facultad ?? "",
    programa: m.programa ?? "",
    rol: "usuario",
  };
}

const fallar = (error: { message: string } | null) => {
  if (error) throw error;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const accesoMarcado = useRef<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s);
      if (!s) {
        setPerfil(null);
        accesoMarcado.current = null;
        setCargando(false);
        return;
      }
      // Fuera del callback: supabase-js no admite llamar a su cliente desde aquí dentro.
      setTimeout(async () => {
        setPerfil(await cargarPerfil(s));
        setCargando(false);
        if (accesoMarcado.current !== s.user.id) {
          accesoMarcado.current = s.user.id;
          // El acuerdo autoriza registrar la recurrencia de acceso.
          void supabase.from("perfiles").update({ ultimo_acceso: new Date().toISOString() }).eq("id", s.user.id);
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const ingresar = useCallback(async (correo: string, clave: string) => {
    fallar((await supabase.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password: clave })).error);
  }, []);

  const registrar = useCallback(async (d: DatosRegistro) => {
    const { data, error } = await supabase.auth.signUp({
      email: d.correo.trim().toLowerCase(),
      password: d.clave,
      options: {
        data: {
          nombre: d.nombre.trim(),
          facultad: d.facultad,
          programa: d.programa,
          acuerdo_version: ACUERDO_VERSION,
          acuerdo_fecha: new Date().toISOString(),
        },
      },
    });
    fallar(error);
    // Con el correo ya registrado Supabase no falla: devuelve identities vacío.
    if (data.user && data.user.identities?.length === 0) throw new Error("User already registered");
  }, []);

  const verificarRegistro = useCallback(async (correo: string, codigo: string) => {
    fallar((await supabase.auth.verifyOtp({ email: correo.trim().toLowerCase(), token: codigo.trim(), type: "signup" })).error);
  }, []);

  const reenviarCodigo = useCallback(async (correo: string) => {
    fallar((await supabase.auth.resend({ type: "signup", email: correo.trim().toLowerCase() })).error);
  }, []);

  const pedirRecuperacion = useCallback(async (correo: string) => {
    fallar((await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase())).error);
  }, []);

  const restablecer = useCallback(async (correo: string, codigo: string, clave: string) => {
    fallar((await supabase.auth.verifyOtp({ email: correo.trim().toLowerCase(), token: codigo.trim(), type: "recovery" })).error);
    fallar((await supabase.auth.updateUser({ password: clave })).error);
  }, []);

  const salir = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const valor = useMemo<Ctx>(
    () => ({
      cargando,
      session,
      perfil,
      esAdmin: perfil?.rol === "admin",
      ingresar,
      registrar,
      verificarRegistro,
      reenviarCodigo,
      pedirRecuperacion,
      restablecer,
      salir,
    }),
    [cargando, session, perfil, ingresar, registrar, verificarRegistro, reenviarCodigo, pedirRecuperacion, restablecer, salir],
  );

  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>;
}
