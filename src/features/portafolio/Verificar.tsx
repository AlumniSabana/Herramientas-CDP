import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, mensajeDeError } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Alert, Badge, Button, Card, Eyebrow, cx } from "@/components/ui";
import { CHECK_BASE } from "./datos";
import { useBorrador } from "./Borrador";
import { checklistItems, checklistMd, armar, contextoRevision, fechaCorta, filaDeRevision, haySuficienteParaRevisar, revisionDesdeFila } from "./logica";
import { Encabezado, Prosa, RevisionVista } from "./piezas";
import { descargarPDF } from "./pdf";
import type { FilaRevision, Revision } from "./tipos";

function Checklist() {
  const { c, set } = useBorrador();
  const items = checklistItems(c, CHECK_BASE);
  const n = items.filter((i) => c.check[i.t]).length;
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-brand-900">
          {n} de {items.length}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={items.length}>
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(n / items.length) * 100}%` }} />
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((i) => (
          <label key={i.t} className={cx("flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 text-sm text-slate-700 hover:border-brand-300", i.esp ? "border-l-4 border-slate-200 border-l-brand-600" : "border-slate-200")}>
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-900" checked={Boolean(c.check[i.t])} onChange={(e) => set((x) => ({ check: { ...x.check, [i.t]: e.target.checked } }))} />
            <span>{i.t}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function Revisiones() {
  const { c, portafolioId, guardarYa, marcarRevisado } = useBorrador();
  const { session } = useAuth();
  const uid = session?.user.id ?? "";
  const [guardadas, setGuardadas] = useState<FilaRevision[]>([]);
  const [fallo, setFallo] = useState("");
  const [actual, setActual] = useState<Revision | null>(null);
  const [activa, setActiva] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [nota, setNota] = useState<{ t: string; tono: "info" | "warn" }>({ t: "", tono: "info" });

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from("revisiones_ia").select("*").eq("usuario_id", uid).order("creado_en", { ascending: false }).limit(10);
    if (error) setFallo(mensajeDeError(error));
    else {
      setFallo("");
      setGuardadas((data ?? []) as FilaRevision[]);
    }
  }, [uid]);
  useEffect(() => void cargar(), [cargar]);

  const pedir = async () => {
    if (!haySuficienteParaRevisar(c)) return setNota({ t: "Todavía no hay bastante escrito para revisar. Completa al menos una ficha de proyecto o tu perfil profesional y vuelve.", tono: "warn" });
    setOcupado(true);
    setActual(null);
    setActiva("");
    setNota({ t: "Leyendo tu portafolio. Puede tardar hasta medio minuto.", tono: "info" });
    try {
      // Se manda solo el texto del portafolio: ni nombre ni correo.
      const { data, error } = await supabase.functions.invoke("revisar-portafolio", {
        body: { contexto: contextoRevision(c), proyectos: c.proyectos.filter((p) => p.titulo || p.contexto || p.objetivo || p.rol || p.acciones || p.resultado || p.evidencia), portafolio: armar(c) },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const cuerpo = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
        if (ctx?.status === 404) throw new Error("el servicio de revisión todavía no está desplegado en Supabase (falta la Edge Function «revisar-portafolio»)");
        if (ctx?.status === 503) throw new Error("el servicio de revisión está desplegado pero le falta la clave del proveedor");
        if (ctx?.status === 504) throw new Error("la revisión tardó demasiado. Vuelve a intentarlo");
        throw new Error(cuerpo?.error ?? error.message);
      }
      const d = (data ?? {}) as Revision;
      setActual(d);
      setNota({ t: "Revisión hecha y guardada en tu cuenta. Vuelve a pedirla cuando hayas corregido: se guardan las últimas diez.", tono: "info" });
      // La revisión cuelga del portafolio: si aún no hay fila, se guarda primero.
      const id = portafolioId ?? (await guardarYa());
      const { error: e2 } = await supabase.from("revisiones_ia").insert({ usuario_id: uid, portafolio_id: id, resultado: filaDeRevision(d) });
      if (e2) setFallo(mensajeDeError(e2));
      else {
        await marcarRevisado();
        await cargar();
      }
    } catch (e) {
      setNota({ t: `No se pudo revisar: ${mensajeDeError(e)}.`, tono: "warn" });
    }
    setOcupado(false);
  };

  const borrar = async (id: string) => {
    if (!window.confirm("¿Borrar esta revisión guardada? No se puede deshacer.")) return;
    const { error } = await supabase.from("revisiones_ia").delete().eq("id", id);
    if (error) return setFallo(mensajeDeError(error));
    setGuardadas((g) => g.filter((x) => x.id !== id));
    if (activa === id) {
      setActual(null);
      setActiva("");
    }
  };

  return (
    <Card className="space-y-6 border-brand-200 bg-brand-50/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>
            Segunda opinión <Badge tono="info">Generada con inteligencia artificial</Badge>
          </Eyebrow>
          <h3 className="mt-2 text-2xl">¿Qué diría un asesor de tu portafolio?</h3>
        </div>
        <Button onClick={pedir} disabled={ocupado}>
          {ocupado ? "Revisando…" : actual || guardadas.length ? "Revisar otra vez" : "Revisar mi portafolio"}
        </Button>
      </div>
      <Prosa>
        Lee lo que has escrito y te señala qué no aguantaría una entrevista. Empieza por las fichas de proyecto. <b>No reescribe tu texto</b>: te dice qué falta y te pregunta lo que tendrías que responder, porque el portafolio tiene que seguir siendo tuyo.
      </Prosa>
      <Prosa>
        <b>La escribe una máquina, no una persona del Centro.</b> Es un modelo de inteligencia artificial que lee tu texto y responde en segundos: sirve para detectar lo obvio antes de que lo vea alguien más, pero no conoce tu trabajo y se equivoca. Léela como una opinión más, no como una calificación. Cuando quieras que la revise un asesor de verdad, tienes la hoja «Hablar con un asesor».
      </Prosa>
      <Prosa>
        <b>Quién la puede leer.</b> La revisión queda guardada en tu cuenta y el Centro de Desarrollo Profesional también puede consultarla: así, si pides una asesoría, quien te atienda llega sabiendo por dónde va tu portafolio. Tu portafolio en sí no lo ve nadie más que tú. Si prefieres que una revisión no quede, bórrala en la lista de aquí abajo.
      </Prosa>
      <Alert tono={nota.tono === "warn" ? "warn" : "info"}>
        {nota.t || "La escribe un modelo de inteligencia artificial. Se le envía solo el texto de tu portafolio, no tu nombre ni tu correo, y él no guarda nada. La revisión que te devuelva queda guardada en tu cuenta y el Centro de Desarrollo Profesional puede consultarla para atenderte mejor; puedes borrarla cuando quieras."}
      </Alert>
      {actual && <RevisionVista d={actual} />}
      {fallo && !guardadas.length && (
        <p className="text-sm text-amber-800" title={fallo}>
          Las revisiones todavía no se están guardando en tu cuenta. La de esta pantalla se ve igual, pero se perderá al recargar.
        </p>
      )}
      {guardadas.length > 0 && (
        <div className="space-y-3 border-t border-brand-200 pt-5">
          <Eyebrow>Tus revisiones anteriores</Eyebrow>
          <ul className="space-y-2">
            {guardadas.map((f) => {
              const r = revisionDesdeFila(f);
              const n = Number(r.fichas) || 0;
              return (
                <li key={f.id} className={cx("flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm", activa === f.id ? "border-brand-600" : "border-slate-200")}>
                  <b className="text-brand-900">{fechaCorta(f.creado_en)}</b>
                  <span className="text-slate-600">
                    {r.listo ? "Lista para publicar" : "Con observaciones"} · {n} {n === 1 ? "ficha" : "fichas"}
                  </span>
                  <span className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setActual(r);
                        setActiva(f.id);
                        setNota({ t: `Estás viendo la revisión del ${fechaCorta(f.creado_en)}. Pulsa «Revisar otra vez» para pedir una nueva sobre lo que tienes escrito ahora.`, tono: "info" });
                      }}
                    >
                      Ver
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void borrar(f.id)}>
                      Borrar
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-500">Se guardan las diez últimas. Las ves tú y el Centro de Desarrollo Profesional, que las usa para preparar tu asesoría. Borra la que no quieras que quede.</p>
        </div>
      )}
    </Card>
  );
}

export function Verificar() {
  const { c, vaciar, marcarDescargado } = useBorrador();
  const navegar = useNavigate();
  const [aviso, setAviso] = useState("");

  const descargar = async () => {
    try {
      await descargarPDF(`${armar(c)}\n\n${checklistMd(c, CHECK_BASE)}`, "portafolio-y-checklist.pdf", c.nombre.trim() || "Portafolio profesional");
      marcarDescargado();
      setAviso("PDF descargado.");
    } catch {
      setAviso("No se pudo generar el PDF en este navegador.");
    }
  };

  return (
    <div className="space-y-8">
      <Encabezado paso="Validación final" titulo="Antes de publicar" />
      <Prosa>Recorre esta lista con tu portafolio abierto al lado. Los puntos marcados con una línea azul a la izquierda son propios de tu programa.</Prosa>
      <Checklist />
      <Revisiones />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={descargar}>
          Descargar portafolio y checklist (PDF)
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={async () => {
            if (!window.confirm("¿Empezar de nuevo? Se borra todo tu portafolio de tu cuenta y no se puede deshacer.")) return;
            await vaciar();
            navegar("/portafolio/programa");
          }}
        >
          Empezar de nuevo
        </Button>
        {aviso && <span className="text-sm text-slate-500" role="status">{aviso}</span>}
      </div>
    </div>
  );
}
