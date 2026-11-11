import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Alert, Button, botonClase, Card, cx, Eyebrow, Vacio } from "@/components/ui";
import { construirRonda, ejercicioPara, mmss, nivel, trozosConMuletillas, veredicto, type Dimension } from "./analisis";
import { TIPOS } from "./contenido";
import { borrarRonda, borrarTodas, guardarObservaciones, guardarRonda, pedirObservaciones } from "./datos";
import { descargarReportePDF, exportarCSV } from "./exportar";
import { usePitch } from "./PitchContext";
import { Chip, FichaRonda, fechaCorta, Negrita, ObservacionesVista, Semaforo, TONO_BARRA, TONO_TEXTO } from "./piezas";

function FilaDimension({ d }: { d: Dimension }) {
  if (d.pct === null) {
    return (
      <div className="grid gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:grid-cols-[1fr_9rem] sm:gap-8">
        <div>
          <div className="flex flex-wrap items-center gap-3"><h4 className="text-base">{d.n}</h4><Chip pct={60}>Sin medición</Chip></div>
          <p className="mt-2 text-sm text-slate-600">{d.txt}</p>
          <p className="mt-2 text-xs text-slate-500">{d.dato}</p>
        </div>
        <p className="text-2xl font-semibold text-slate-400 sm:text-right">—</p>
      </div>
    );
  }
  const n = nivel(d.pct);
  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:grid-cols-[1fr_9rem] sm:gap-8">
      <div>
        <div className="flex flex-wrap items-center gap-3"><h4 className="text-base">{d.n}</h4><Chip pct={d.pct} /></div>
        <p className="mt-2 text-sm text-slate-600">{d.txt}</p>
        <p className="mt-2 text-xs text-slate-500">{d.dato}</p>
      </div>
      <div className="sm:text-right">
        <p className={cx("text-2xl font-semibold tabular-nums", TONO_TEXTO[n])}>{d.val}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${d.pct} de 100`}>
          <div className={cx("h-full rounded-full", TONO_BARRA[n])} style={{ width: `${d.pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function Lista({ items, marca, vacio, tono }: { items: Dimension[]; marca: string; vacio: string; tono: string }) {
  if (!items.length) return <p className="mt-4 text-sm text-slate-500">{vacio}</p>;
  return (
    <ul className="mt-4 space-y-4">
      {items.map((d) => (
        <li key={d.id} className="flex gap-3 text-sm text-slate-700">
          <span aria-hidden className={cx("mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", tono)}>{marca}</span>
          <p><strong className="text-brand-900">{d.n}.</strong> {d.txt}</p>
        </li>
      ))}
    </ul>
  );
}

export default function Reporte() {
  const { reporte, setReporte, historial, recargarHistorial } = usePitch();
  const { perfil } = useAuth();
  const [generando, setGenerando] = useState(false);
  const [errorObs, setErrorObs] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");

  if (!reporte) {
    return (
      <div className="space-y-12">
        <Vacio titulo="Todavía no hay un reporte en esta sesión">
          <p>Practica una ronda y aquí aparecerá tu reporte con siete dimensiones medibles. Sin cuenta, el reporte existe solo mientras esta pestaña esté abierta.</p>
          <Link to="/pitch/practica" className={botonClase("primary", "md", "mt-6")}>Ir a practicar →</Link>
        </Vacio>
        <Historial />
      </div>
    );
  }

  const { res, idGuardado, obs } = reporte;
  const t = TIPOS[res.tipo];
  const ej = ejercicioPara(res);
  const n = nivel(res.puntaje);

  const generar = async () => {
    setGenerando(true);
    setErrorObs("");
    try {
      const o = await pedirObservaciones({
        ronda: construirRonda(res),
        persona: { nombre: perfil?.nombre ?? "", facultad: perfil?.facultad ?? "", programa: perfil?.programa ?? "" },
        previas: historial,
      });
      setReporte((r) => (r && r.res === res ? { ...r, obs: o } : r));
      if (idGuardado) guardarObservaciones(idGuardado, o.texto).catch(() => setAviso("Las observaciones se generaron, pero no se pudieron guardar en tu cuenta."));
    } catch (e) {
      setErrorObs(e instanceof Error ? e.message : "error desconocido");
    } finally {
      setGenerando(false);
    }
  };

  const guardar = async () => {
    if (!perfil) return;
    setGuardando(true);
    try {
      const g = await guardarRonda(perfil.id, construirRonda(res));
      if (obs) await guardarObservaciones(g.id, obs.texto).catch(() => {});
      setReporte((r) => (r && r.res === res ? { ...r, idGuardado: g.id, errorGuardado: undefined } : r));
      await recargarHistorial();
      setAviso("Ronda guardada en tu cuenta.");
    } catch (e) {
      setAviso("No se pudo guardar: " + (e instanceof Error ? e.message : "error desconocido"));
    } finally {
      setGuardando(false);
    }
  };

  const descargar = async () => {
    try {
      await descargarReportePDF(res, perfil, obs?.plano ?? "");
      setAviso("Reporte descargado en PDF.");
    } catch (e) {
      setAviso("No se pudo generar el PDF (" + (e instanceof Error ? e.message : "error") + ").");
    }
  };

  return (
    <div className="space-y-12">
      <div className="max-w-3xl">
        <Eyebrow className="mb-2">Retroalimentación</Eyebrow>
        <h2 className="text-3xl">Tu reporte de práctica</h2>
        <p className="mt-3 text-slate-600">Siete dimensiones medibles de tu entrega, con lo que sostuviste bien y lo que conviene ajustar en la siguiente ronda.</p>
      </div>

      {reporte.errorGuardado && <Alert tono="error">{reporte.errorGuardado}. Puedes intentarlo de nuevo con «Guardar esta ronda en mi cuenta».</Alert>}
      {perfil && idGuardado && <Alert tono="ok">Esta ronda quedó guardada en tu cuenta.</Alert>}
      {!perfil && <Alert>Estás practicando sin cuenta: este reporte no se guardó en ninguna parte y desaparecerá al cerrar o recargar la pestaña. <Link to="/registro" className="font-semibold underline">Crea una cuenta</Link> para conservar tu historial.</Alert>}

      {/* Marcador */}
      <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8 md:grid-cols-[13rem_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-brand-50 p-6 text-center">
          <p className={cx("text-7xl font-semibold tabular-nums", TONO_TEXTO[n])}>{res.puntaje}</p>
          <p className="text-sm text-slate-500">de 100</p>
          <div className="mt-3"><Chip pct={res.puntaje} /></div>
        </div>
        <div>
          <h3 className="text-xl">{t.nombre} · {mmss(res.duracion)}</h3>
          <p className="mt-2 text-slate-600">{veredicto(res.puntaje)}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              [mmss(res.segundos), "Duración real"], [res.meta.ppm, "Palabras / min"], [res.meta.nPal, "Palabras"],
              [res.meta.muletillas.total, "Muletillas"], [`${res.meta.cubiertas}/${res.meta.totalSecciones}`, "Secciones"],
            ].map(([v, k]) => (
              <div key={k}>
                <dd className="text-2xl font-semibold tabular-nums text-brand-900">{v}</dd>
                <dt className="text-xs text-slate-500">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="space-y-5">{res.dims.map((d) => <FilaDimension key={d.id} d={d} />)}</div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-emerald-200">
          <h3 className="text-lg">Lo que sostuviste</h3>
          <Lista items={res.positivos} marca="✓" tono="bg-emerald-100 text-emerald-800" vacio="Ninguna dimensión llegó al umbral alto en esta ronda. Es normal en la primera." />
        </Card>
        <Card className="border-amber-200">
          <h3 className="text-lg">Lo que conviene ajustar</h3>
          <Lista items={res.mejoras} marca="→" tono="bg-amber-100 text-amber-800" vacio="Nada por debajo del umbral. Sube la exigencia con el ejercicio de abajo." />
        </Card>
      </div>

      {/* Observaciones con IA: solo si la persona las pide, y requieren cuenta */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl">Observaciones sobre tu entrega</h3>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">Análisis con IA</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {!perfil
            ? "Las observaciones las redacta la inteligencia artificial a partir de tu entrega, tu programa y tu historial. Necesitas una cuenta para usarlas."
            : obs
              ? "Redactadas por el servicio de IA de la Universidad a partir de tus cifras, tu transcripción y tu historial. Son orientación de práctica, no una evaluación académica."
              : "Se enviarán tus cifras, tu transcripción y tu programa académico al servicio de IA de la Universidad para redactar un análisis personalizado. El audio no se envía. Solo ocurre si presionas el botón."}
        </p>
        {generando && <p role="status" className="mt-6 text-sm font-medium text-brand-700">Generando análisis personalizado…</p>}
        {errorObs && (
          <Alert tono="error" className="mt-6">
            <strong>No fue posible generar las observaciones. Intenta nuevamente.</strong>
            <span className="mt-1 block">Motivo: {errorObs}</span>
          </Alert>
        )}
        {obs && !generando && <ObservacionesVista d={obs.obs} />}
        <div className="mt-6">
          {perfil ? (
            <Button disabled={generando} onClick={() => void generar()}>{generando ? "Generando…" : obs ? "Volver a generar" : "Generar observaciones"}</Button>
          ) : (
            <Link to="/registro" className={botonClase("primary")}>Crear cuenta o iniciar sesión</Link>
          )}
        </div>
      </Card>

      <div className="rounded-2xl bg-brand-900 p-6 text-white shadow-lift sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Ejercicio para la siguiente ronda</p>
        <h3 className="mt-2 text-2xl text-white">{ej.titulo}</h3>
        <p className="mt-2 max-w-3xl text-brand-100">{ej.texto}</p>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-brand-100 marker:text-brand-300">
          {ej.pasos.map((p) => <li key={p}><Negrita texto={p} /></li>)}
        </ol>
      </div>

      <Card>
        <h3 className="text-lg">Lo que dijiste</h3>
        <p className="mb-4 mt-1 text-sm text-slate-500">Las muletillas detectadas están resaltadas. Se procesó en tu navegador y desaparece al cerrar la pestaña.</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {trozosConMuletillas(res.texto).map((x, i) => (x.mula ? <mark key={i} className="rounded bg-amber-200 px-0.5 text-amber-950">{x.t}</mark> : <span key={i}>{x.t}</span>))}
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        {perfil && !idGuardado && <Button disabled={guardando} onClick={() => void guardar()}>{guardando ? "Guardando…" : "Guardar esta ronda en mi cuenta"}</Button>}
        <Link to="/pitch/practica" className={botonClase("secondary")}>Practicar otra ronda</Link>
        <Button variant="secondary" onClick={() => void descargar()}>Descargar reporte (.pdf)</Button>
        <Link to="/pitch/prepara" className={botonClase("secondary")}>Volver al guion</Link>
      </div>
      {aviso && <p role="status" className="text-sm text-slate-600">{aviso}</p>}

      <Historial />
    </div>
  );
}

/* ───────── Historial propio (solo con cuenta) ───────── */
function Historial() {
  const { historial, errorHistorial, recargarHistorial } = usePitch();
  const { perfil } = useAuth();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  if (!perfil) {
    return (
      <Card className="bg-brand-50 text-center">
        <h3 className="text-xl">Tu historial</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">Sin cuenta no se guarda nada. Crea una con tu correo institucional para ver tu progreso entre rondas y desde cualquier dispositivo.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/registro" className={botonClase("primary")}>Crear cuenta</Link>
          <Link to="/ingresar" className={botonClase("secondary")}>Ingresar</Link>
        </div>
      </Card>
    );
  }

  const ronda = historial.find((h) => h.id === abierta);
  const quitar = async (id: string) => {
    try {
      await borrarRonda(id);
      if (abierta === id) setAbierta(null);
      await recargarHistorial();
      setAviso("Ronda eliminada.");
    } catch (e) {
      setAviso("No se pudo eliminar: " + (e instanceof Error ? e.message : "error"));
    }
  };
  const quitarTodo = async () => {
    if (!confirmando) {
      setConfirmando(true);
      setAviso("Esto elimina todas tus rondas de forma permanente. Vuelve a pulsar para confirmar.");
      setTimeout(() => setConfirmando(false), 6000);
      return;
    }
    setConfirmando(false);
    try {
      await borrarTodas(perfil.id);
      setAbierta(null);
      await recargarHistorial();
      setAviso("Historial eliminado.");
    } catch (e) {
      setAviso("No se pudo borrar: " + (e instanceof Error ? e.message : "error"));
    }
  };

  return (
    <section aria-labelledby="hist-t" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 id="hist-t" className="text-2xl">Tu historial</h3>
          <p className="mt-1 text-sm text-slate-600">Guardado en tu cuenta ({perfil.correo}). Disponible desde cualquier dispositivo.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={() => (historial.length ? (exportarCSV(historial, perfil, `estudio-de-pitch-${perfil.correo.split("@")[0]}.csv`), setAviso(`Archivo descargado con ${historial.length} ${historial.length === 1 ? "ronda" : "rondas"}. Ábrelo con Excel.`)) : setAviso("Todavía no hay rondas que exportar. Practica una y vuelve."))}>Descargar para Excel (.csv)</Button>
          <Button variant="secondary" size="sm" onClick={() => void quitarTodo()}>{confirmando ? "¿Seguro? Confirmar" : "Borrar todo"}</Button>
        </div>
      </div>
      {errorHistorial && <Alert tono="error">No se pudo leer el historial: {errorHistorial}</Alert>}
      {aviso && <p role="status" className="text-sm text-slate-600">{aviso}</p>}

      {historial.length === 0 ? (
        <Vacio titulo="Aún no tienes rondas guardadas">
          <p>Cada ronda que practiques con tu sesión iniciada aparecerá aquí con su puntaje.</p>
          <Link to="/pitch/practica" className={botonClase("primary", "md", "mt-6")}>Practicar ahora →</Link>
        </Vacio>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-brand-50 text-xs uppercase tracking-wider text-brand-800">
              <tr>{["#", "Fecha", "Escenario", "Objetivo", "Real", "Ppm", "Muletillas", "Puntaje", "", ""].map((h, i) => <th key={i} className="px-4 py-4 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.map((h, i) => (
                <tr key={h.id}>
                  <td className="px-4 py-3 tabular-nums">{historial.length - i}</td>
                  <td className="px-4 py-3 tabular-nums">{fechaCorta(h.creada_en)}</td>
                  <td className="px-4 py-3">{h.tipo_nombre || h.tipo}</td>
                  <td className="px-4 py-3 tabular-nums">{mmss(h.duracion_objetivo)}</td>
                  <td className="px-4 py-3 tabular-nums">{mmss(h.duracion_real)}</td>
                  <td className="px-4 py-3 tabular-nums">{h.ppm}</td>
                  <td className="px-4 py-3 tabular-nums">{h.muletillas_total}</td>
                  <td className="px-4 py-3"><Semaforo valor={h.puntaje} /></td>
                  <td className="px-4 py-3"><button className="font-semibold text-brand-600 hover:underline" onClick={() => setAbierta(abierta === h.id ? null : h.id)}>{abierta === h.id ? "Cerrar" : "Ver"}</button></td>
                  <td className="px-4 py-3"><button className="text-slate-500 hover:text-rose-700 hover:underline" onClick={() => void quitar(h.id)}>Borrar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ronda && <FichaRonda r={ronda} />}
    </section>
  );
}
