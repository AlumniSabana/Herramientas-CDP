import { Link } from "react-router-dom";
import { botonClase, Card, cx, Eyebrow } from "@/components/ui";
import { mmss, seccionesConTiempo } from "./analisis";
import { DURACIONES, NOTAS_DUR, TIPOS, type TipoId } from "./contenido";
import { usePitch } from "./PitchContext";

const OPCION = (activa: boolean) =>
  cx(
    "rounded-xl border p-4 text-left transition-colors",
    activa ? "border-brand-900 bg-brand-900 text-white shadow-card" : "border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50",
  );

export default function Prepara() {
  const { tipo, elegirTipo, duracion, setDuracion, notas, setNotas } = usePitch();
  const t = TIPOS[tipo];
  const secciones = seccionesConTiempo(tipo, duracion);

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <Eyebrow className="mb-2">Configuración</Eyebrow>
        <h2 className="text-3xl">Arma tu guion antes de hablar</h2>
        <p className="mt-3 text-slate-600">Elige el escenario y la duración. El guion se recalcula: cada sección recibe el tiempo que le corresponde en ese formato, con las preguntas que debe responder.</p>
      </div>

      <Card>
        <Eyebrow>Paso 1 — Escenario</Eyebrow>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(TIPOS) as [TipoId, (typeof TIPOS)[TipoId]][]).map(([k, x]) => (
            <button key={k} aria-pressed={k === tipo} onClick={() => elegirTipo(k)} className={OPCION(k === tipo)}>
              <span className="block font-semibold">{x.corto}</span>
              <span className={cx("mt-1 block text-xs", k === tipo ? "text-brand-200" : "text-slate-500")}>{x.audiencia}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow>Paso 2 — Duración</Eyebrow>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DURACIONES.map((d) => (
            <button key={d.seg} aria-pressed={d.seg === duracion} onClick={() => setDuracion(d.seg)} className={OPCION(d.seg === duracion)}>
              <span className="block text-xl font-semibold">{d.nombre}</span>
              <span className={cx("mt-1 block text-xs", d.seg === duracion ? "text-brand-200" : "text-slate-500")}>{d.desc}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm text-slate-600">{NOTAS_DUR[duracion]}</p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Paso 3 — Tu guion</Eyebrow>
            <h3 className="mt-2 text-xl">{t.nombre} · {mmss(duracion)}</h3>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.secciones.length} secciones</span>
        </div>

        <ol className="mt-6 divide-y divide-slate-100">
          {secciones.map((s) => (
            <li key={s.id} className="grid gap-3 py-5 sm:grid-cols-[4rem_1fr_4rem] sm:gap-6">
              <span className="text-lg font-semibold tabular-nums text-brand-600">{mmss(s.desde)}</span>
              <div>
                <h4 className="text-base">{s.n}</h4>
                <p className="mt-1 text-sm text-slate-600">{s.objetivo}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.pistas.map((p) => (
                    <span key={p} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-800">{p}</span>
                  ))}
                </div>
              </div>
              <span className="text-sm tabular-nums text-slate-500 sm:text-right">{s.dur}s</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 border-t border-slate-100 pt-8">
          <label htmlFor="notas" className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Notas de apoyo (opcional)</label>
          <p className="mb-3 mt-1 text-sm text-slate-600">Escribe tus frases ancla o los datos que no quieres olvidar. Estarán visibles mientras practicas. Se quedan en esta pestaña y no se guardan.</p>
          <textarea
            id="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            placeholder="Ej.: cifra clave 31 horas · nombre del cliente piloto · pedir reunión con operaciones"
            className="block w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
          />
        </div>

        <div className="mt-8">
          <Link to="/pitch/practica" className={botonClase("primary", "lg")}>Ir a practicar →</Link>
        </div>
      </Card>
    </div>
  );
}
