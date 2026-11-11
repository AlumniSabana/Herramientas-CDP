/* Piezas visuales compartidas por la práctica, el reporte, el historial y el panel de administración. */
import type { ReactNode } from "react";
import { cx } from "@/components/ui";
import { etiquetaNivel, mmss, nivel, semaforoEtiqueta, semaforoNivel, type Nivel } from "./analisis";
import type { Ronda } from "./datos";
import { observacionesGuardadas, type Obs } from "./observaciones";

export const TONO_TEXTO: Record<Nivel, string> = { bien: "text-emerald-700", ajusta: "text-amber-700", revisa: "text-rose-700" };
export const TONO_BARRA: Record<Nivel, string> = { bien: "bg-emerald-500", ajusta: "bg-amber-500", revisa: "bg-rose-600" };
const TONO_CHIP: Record<Nivel, string> = {
  bien: "bg-emerald-100 text-emerald-800",
  ajusta: "bg-amber-100 text-amber-800",
  revisa: "bg-rose-100 text-rose-800",
};

export function Chip({ pct, children }: { pct: number; children?: ReactNode }) {
  return <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", TONO_CHIP[nivel(pct)])}>{children ?? etiquetaNivel(pct)}</span>;
}

/** Texto con **negrita**. Nada más se interpreta: no se inyecta HTML. */
export function Negrita({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 ? <strong key={i} className="font-semibold text-brand-900">{t}</strong> : <span key={i}>{t}</span>))}
    </>
  );
}

/** Semáforo con forma Y color: verde y ámbar se confunden con el daltonismo más común, así que el color no es el único canal. */
export function Semaforo({ valor, cifra }: { valor: unknown; cifra?: ReactNode }) {
  const n = semaforoNivel(valor);
  const etiqueta = semaforoEtiqueta(valor);
  const forma =
    n === "bien" ? <circle cx="6" cy="6" r="5" className="fill-emerald-500" />
    : n === "ajusta" ? <rect x="1.5" y="1.5" width="9" height="9" transform="rotate(45 6 6)" className="fill-amber-500" />
    : n === "revisa" ? <path d="M6 0.8 11.4 11H0.6z" className="fill-rose-600" />
    : <circle cx="6" cy="6" r="4.2" className="fill-none stroke-slate-400" strokeWidth="1.4" />;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap" title={etiqueta}>
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">{forma}</svg>
      <span className="font-semibold tabular-nums text-slate-800">{cifra !== undefined ? cifra : n === "nada" ? "—" : String(valor)}</span>
      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}

export function fechaCorta(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ───────── Observaciones con IA ───────── */
function Bloque({ titulo, items, marca, tono }: { titulo: string; items: string[]; marca: (i: number) => string; tono: string }) {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{titulo}</p>
      <ul className="mt-3 space-y-3">
        {items.map((t, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className={cx("mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", tono)}>{marca(i)}</span>
            <p className="text-sm leading-relaxed text-slate-700"><Negrita texto={t} /></p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ObservacionesVista({ d }: { d: Obs }) {
  const aviso = d.cortado && (
    <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>La respuesta llegó incompleta.</strong> El servicio de IA se quedó sin espacio y cortó el texto antes de terminar. Presiona «Volver a generar» para pedirlo de nuevo. Si vuelve a pasar, avísale al CDP: hay que subir el límite de salida en la función del servidor.
    </div>
  );
  if (!d.estructurado) {
    return (
      <div>
        {d.parrafos.map((p, i) => (
          <p key={i} className="mt-3 text-sm leading-relaxed text-slate-700"><Negrita texto={p} /></p>
        ))}
        {aviso}
      </div>
    );
  }
  return (
    <div>
      {d.resumen && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Resumen general del desempeño</p>
          {d.resumen.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="mt-3 text-sm leading-relaxed text-slate-700"><Negrita texto={p} /></p>
          ))}
        </div>
      )}
      <Bloque titulo="Fortalezas principales" items={d.fortalezas} marca={() => "✓"} tono="bg-emerald-100 text-emerald-800" />
      <Bloque titulo="Aspectos por mejorar" items={d.aspectos} marca={() => "→"} tono="bg-amber-100 text-amber-800" />
      <Bloque titulo="Recomendaciones para la siguiente práctica" items={d.recomendaciones} marca={(i) => String(i + 1).padStart(2, "0")} tono="bg-brand-100 text-brand-800" />
      {aviso}
    </div>
  );
}

/* ───────── Ficha de una ronda guardada ─────────
   La misma que ve el Centro y que ve su autora o autor: lo que el Centro lee de una ronda
   es exactamente lo que la persona ve en su historial. */
export function FichaRonda({ r }: { r: Ronda }) {
  const obs = observacionesGuardadas(r.observaciones);
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6 sm:p-8">
      <h3 className="text-lg">
        {r.tipo_nombre || r.tipo} · {fechaCorta(r.creada_en)} · puntaje {r.puntaje}
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        {mmss(r.duracion_real)} de {mmss(r.duracion_objetivo)} · {r.ppm} palabras por minuto · {r.muletillas_total} muletillas
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(r.dimensiones || []).length ? (
          r.dimensiones.map((d) => (
            <div key={d.id} className="rounded-xl bg-white p-3 text-center shadow-sm">
              <p className="text-2xl font-semibold tabular-nums text-brand-900">{d.pct == null ? "—" : d.pct}</p>
              <p className="mt-1 text-xs leading-tight text-slate-500">{d.nombre || d.id}</p>
            </div>
          ))
        ) : (
          <p className="col-span-full text-sm text-slate-500">Sin dimensiones registradas.</p>
        )}
      </div>

      <Seccion titulo="Transcripción">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.transcripcion || "Sin transcripción."}</p>
      </Seccion>
      <Seccion titulo="Observaciones">
        {obs ? <ObservacionesVista d={obs} /> : r.observaciones ? <p className="whitespace-pre-wrap text-sm text-slate-700">{r.observaciones}</p> : <p className="text-sm text-slate-500">No se generaron observaciones para esta ronda.</p>}
      </Seccion>
      <Seccion titulo="Ejercicio sugerido">
        <p className="text-sm text-slate-700">{r.ejercicio?.titulo ? `${r.ejercicio.titulo} · ${r.ejercicio.texto}` : "—"}</p>
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{titulo}</p>
      {children}
    </div>
  );
}
