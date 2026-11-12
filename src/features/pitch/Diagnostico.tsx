/* Diagnóstico del servicio de IA: recorre la cadena eslabón por eslabón y dice cuál está roto y qué hacer.
   La sonda de la Edge Function contesta sin llamar al modelo, así que comprobar no cuesta nada;
   solo «Probar una observación real» consume una llamada al proveedor. */
import { useState, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, cx } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { palabras } from "./analisis";
import { ErrorFuncion, pedirObservaciones, sondaFuncion } from "./datos";

type Estado = "espera" | "ok" | "mal" | "duda";
type Paso = { estado: Estado; texto: ReactNode; arreglo?: ReactNode };

const PASOS = [
  ["sesion", "Sesión iniciada"],
  ["bd", "Base de datos (perfiles y rondas)"],
  ["perfiles", "Ver a todas las personas registradas"],
  ["consolidado", "Ver las rondas y transcripciones de todos"],
  ["funcion", "Edge Function «observaciones» desplegada"],
  ["clave", "Clave del proveedor de IA cargada"],
  ["modelo", "El modelo responde"],
] as const;

const code = (t: string) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{t}</code>;
const MARCA: Record<Estado, { s: string; c: string }> = {
  ok: { s: "✓", c: "bg-emerald-100 text-emerald-800" },
  mal: { s: "✕", c: "bg-rose-100 text-rose-800" },
  duda: { s: "!", c: "bg-amber-100 text-amber-800" },
  espera: { s: "·", c: "bg-slate-100 text-slate-500" },
};

export default function Diagnostico() {
  const { perfil, esAdmin } = useAuth();
  const [pasos, setPasos] = useState<Record<string, Paso>>({});
  const [corriendo, setCorriendo] = useState(false);
  const [puedeProbar, setPuedeProbar] = useState(false);
  const [probando, setProbando] = useState(false);

  const poner = (id: string, p: Paso) => setPasos((a) => ({ ...a, [id]: p }));

  const correr = async () => {
    setCorriendo(true);
    setPuedeProbar(false);
    setPasos(Object.fromEntries(PASOS.map(([id]) => [id, { estado: "espera", texto: "Comprobando…" } as Paso])));

    poner("sesion", { estado: "ok", texto: `Conectado como ${perfil?.correo ?? "—"}${esAdmin ? " (administrador)." : "."}` });

    const bd = await supabase.from("rondas").select("id").limit(1);
    if (bd.error) {
      poner("bd", { estado: "mal", texto: "No respondió: " + bd.error.message, arreglo: <>Corre la migración {code("20261110000000_esquema_inicial.sql")} completa en el editor SQL de Supabase.</> });
      setCorriendo(false);
      return;
    }
    poner("bd", { estado: "ok", texto: "La base de datos responde y las políticas por fila dejan leer tus rondas." });

    if (!esAdmin) {
      poner("perfiles", { estado: "duda", texto: "No aplica: esta cuenta no tiene rol de administrador." });
      poner("consolidado", { estado: "duda", texto: "No aplica: esta cuenta no tiene rol de administrador." });
    } else {
      const u = await supabase.from("perfiles_admin").select("correo,rol,ultimo_acceso").order("creado_en");
      if (u.error) {
        poner("perfiles", { estado: "mal", texto: <>No se pudo leer {code("perfiles_admin")}: {u.error.message}</>, arreglo: <>Revisa que la vista exista y tenga {code("grant select … to authenticated")}. La migración la crea.</> });
      } else {
        const con = (u.data ?? []).filter((x) => x.ultimo_acceso);
        const sin = (u.data ?? []).length - con.length;
        const admins = con.filter((x) => x.rol === "admin").length;
        poner("perfiles", con.length > 1
          ? { estado: "ok", texto: <>El panel muestra {con.length} personas con sesión iniciada alguna vez ({admins} con rol de administrador){sin ? `, y oculta ${sin} ${sin === 1 ? "cuenta creada que nunca se usó" : "cuentas creadas que nunca se usaron"}.` : ". Ninguna cuenta quedó fuera por falta de actividad."} Fuente: {code("perfiles_admin")}.</> }
          : { estado: "duda", texto: <>La vista {code("perfiles_admin")} responde, pero solo ves tu propio perfil.</>, arreglo: "Si esperabas ver a otras personas, revisa que tu perfil tenga rol «admin» y que no se haya reescrito la vista con security_invoker." });
      }
      const r = await supabase.from("rondas_admin").select("correo,transcripcion,observaciones").order("creada_en", { ascending: false });
      if (r.error) {
        poner("consolidado", { estado: "mal", texto: <>No se pudo leer la vista {code("rondas_admin")}: {r.error.message}</>, arreglo: <>Vuelve a correr la migración. La vista se crea sin {code("security_invoker")} a propósito.</> });
      } else {
        const f = r.data ?? [];
        poner("consolidado", f.length
          ? { estado: "ok", texto: `${f.length} rondas de ${new Set(f.map((x) => x.correo)).size} personas · ${f.filter((x) => x.transcripcion).length} con transcripción · ${f.filter((x) => x.observaciones).length} con observaciones de IA. Haz clic en cualquier persona de la lista para leerlas.` }
          : { estado: "duda", texto: "La vista responde, pero todavía no hay ninguna ronda guardada.", arreglo: "Si alguien ya practicó con su cuenta, revisa que la ronda se haya guardado: sin sesión iniciada no se guarda nada." });
      }
    }

    try {
      const sonda = await sondaFuncion();
      poner("funcion", { estado: "ok", texto: "Desplegada y respondiendo" + (sonda?.version ? ` (versión ${sonda.version}).` : ".") });
      if (sonda?.clave_cargada) {
        poner("clave", { estado: "ok", texto: `Cargada. Modelo configurado: ${sonda.modelo ?? "—"}${sonda.tope_diario ? ` · tope de ${sonda.tope_diario} observaciones por persona al día.` : " · sin tope diario."}` });
        poner("modelo", { estado: "espera", texto: "Listo para probar. La prueba real sí consume una llamada al proveedor." });
        setPuedeProbar(true);
      } else {
        poner("clave", { estado: "mal", texto: "La función está desplegada pero no encuentra la clave del proveedor.", arreglo: <>En el panel: <strong>Edge Functions → Secrets</strong>, con nombre exacto {code("GEMINI_API_KEY")} y tu clave. Después vuelve a desplegar la función.</> });
        poner("modelo", { estado: "espera", texto: "No se puede probar sin la clave." });
      }
    } catch (e) {
      const est = e instanceof ErrorFuncion ? e.estado : null;
      poner("funcion",
        est === 404 || est === null
          ? { estado: "mal", texto: "No está desplegada: Supabase devuelve 404.", arreglo: <>En el panel de Supabase: <strong>Edge Functions → Deploy a new function</strong>, nómbrala exactamente {code("observaciones")} y usa {code("supabase/functions/observaciones/index.ts")}.</> }
          : est === 401
            ? { estado: "mal", texto: "Desplegada, pero rechazó la sesión (401).", arreglo: "Cierra sesión y vuelve a entrar. Si sigue igual, revisa que la función tenga «Verify JWT» activado y que el proyecto sea el mismo de la aplicación." }
            : { estado: "mal", texto: "Respondió con un error: " + (e instanceof Error ? e.message : "desconocido"), arreglo: <>Mira <strong>Edge Functions → observaciones → Logs</strong> en el panel de Supabase.</> });
      poner("clave", { estado: "espera", texto: "No se pudo comprobar: primero hay que desplegar la función." });
      poner("modelo", { estado: "espera", texto: "No se pudo comprobar." });
    }
    setCorriendo(false);
  };

  const probar = async () => {
    setProbando(true);
    poner("modelo", { estado: "espera", texto: "Pidiendo una observación de prueba al modelo…" });
    try {
      const { plano } = await pedirObservaciones({
        ronda: {
          creada_en: new Date().toISOString(), tipo: "elevator", tipo_nombre: "Prueba de conexión", duracion_objetivo: 60, duracion_real: 58, modo: "manual",
          puntaje: 70, palabras: 60, ppm: 120, muletillas_total: 1, muletillas_top: [], secciones_cubiertas: 3, secciones_total: 4, dimensiones: [],
          ejercicio: { titulo: "", texto: "", pasos: [] }, visual: { medida: false },
          transcripcion: "Esta es una prueba de conexión del Centro de Desarrollo Profesional. Buenos días, soy estudiante de la Universidad de La Sabana y quiero verificar que el servicio de observaciones está funcionando correctamente. Gracias.",
        },
        persona: { nombre: "Prueba", facultad: "—", programa: "—" },
        previas: [],
      });
      poner("modelo", { estado: "ok", texto: <>El modelo respondió con {palabras(plano).length} palabras. La cadena completa funciona.<br /><span className="text-xs text-slate-500">Primeras líneas: «{plano.replace(/\*\*/g, "").slice(0, 180)}…»</span></> });
    } catch (e) {
      poner("modelo", { estado: "mal", texto: "No respondió: " + (e instanceof Error ? e.message : "error"), arreglo: <>Revisa <strong>Edge Functions → observaciones → Logs</strong>. Si dice algo de «credit balance» o «authentication», el problema está en la cuenta del proveedor, no en Supabase.</> });
    }
    setProbando(false);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="text-xl">Diagnóstico del servicio de IA</h3>
          <p className="mt-2 text-sm text-slate-600">Comprueba la conexión con la base de datos y con las observaciones de IA. Comprobar no cuesta nada.</p>
        </div>
        <Button disabled={corriendo} onClick={() => void correr()}>{corriendo ? "Comprobando…" : Object.keys(pasos).length ? "Comprobar de nuevo" : "Comprobar"}</Button>
      </div>
      <ol className="mt-8 space-y-5">
        {PASOS.map(([id, nombre]) => {
          const p = pasos[id] ?? { estado: "espera" as Estado, texto: "Sin comprobar." };
          return (
            <li key={id} className="flex gap-4">
              <span aria-hidden className={cx("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", MARCA[p.estado].c)}>{MARCA[p.estado].s}</span>
              <div className="text-sm">
                <h4 className="text-base">{nombre}</h4>
                <p className="mt-1 text-slate-600">{p.texto}</p>
                {p.arreglo && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{p.arreglo}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {puedeProbar && (
        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
          <Button disabled={probando} onClick={() => void probar()}>Probar una observación real</Button>
          <span className="text-xs text-slate-500">Esta prueba sí consume una llamada al proveedor (fracciones de centavo).</span>
        </div>
      )}
    </Card>
  );
}
