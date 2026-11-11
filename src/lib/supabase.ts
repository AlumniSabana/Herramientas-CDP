import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && key && !url.includes("TU-PROYECTO"));

// La sesión vive en sessionStorage a propósito: en un equipo compartido del campus
// se cierra sola al cerrar la pestaña y no queda la cuenta abierta para el siguiente.
export const supabase = createClient(url ?? "http://localhost", key ?? "sin-configurar", {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const TRADUCCIONES: [RegExp, string][] = [
  [/invalid login credentials/i, "Correo o contraseña incorrectos."],
  [/email not confirmed/i, "Debes confirmar tu correo institucional antes de ingresar. Revisa tu bandeja de entrada."],
  [/user already registered/i, "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña."],
  [/token has expired|otp.*expired|invalid.*token|otp_expired/i, "El código es incorrecto o venció. Pide uno nuevo."],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "Hiciste demasiados intentos. Espera unos minutos."],
  [/password should be at least/i, "La contraseña debe tener al menos 8 caracteres."],
  [/same password|different from the old/i, "La contraseña nueva debe ser distinta de la anterior."],
  [/failed to fetch|networkerror|load failed/i, "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo."],
  [/compute resources|worker_limit/i, "El servicio está saturado. Espera un minuto e inténtalo de nuevo."],
];

/** Convierte cualquier error en un texto en español que se le pueda mostrar a una persona. */
export function mensajeDeError(e: unknown): string {
  const m =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e && "message" in e
        ? String((e as { message: unknown }).message)
        : String(e);
  // Los mensajes de la base (triggers de registro) ya vienen en español.
  if (/unisabana\.edu\.co|acuerdo de confidencialidad/i.test(m)) return m.replace(/^.*?(Debes)/s, "$1");
  return TRADUCCIONES.find(([re]) => re.test(m))?.[1] ?? (m || "Ocurrió un error inesperado.");
}
