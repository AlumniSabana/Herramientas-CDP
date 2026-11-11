import type { ReactNode } from "react";
import { Alert, Eyebrow, Input, Textarea, cx } from "@/components/ui";
import { useBorrador } from "./Borrador";
import { estadoValido, ESTADOS } from "./logica";
import type { Contenido, Revision } from "./tipos";

/** Cabecera de una hoja: paso, título y la pregunta que responde. */
export function Encabezado({ paso, titulo, pregunta }: { paso: string; titulo: string; pregunta?: string }) {
  return (
    <header className="mb-8">
      <Eyebrow className="mb-3">{paso}</Eyebrow>
      <h2 className="text-3xl sm:text-4xl">{titulo}</h2>
      {pregunta && <p className="mt-3 text-xl font-medium text-brand-600">{pregunta}</p>}
    </header>
  );
}

export const Prosa = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cx("max-w-prose leading-relaxed text-slate-600", className)}>{children}</p>
);

/** Recuadro de sugerencia adaptada al programa. */
export function Nota({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border-l-4 border-brand-600 bg-brand-50 px-5 py-4 text-sm leading-relaxed text-slate-700">
      <p className="mb-1 font-semibold text-brand-900">{titulo}</p>
      {children}
    </div>
  );
}

export function Aviso({ children, titulo }: { children: ReactNode; titulo?: string }) {
  return (
    <Alert tono="warn" className="max-w-prose">
      {titulo && <b>{titulo} </b>}
      {children}
    </Alert>
  );
}

export function Tabla({ cabeza, filas }: { cabeza: string[]; filas: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-50 text-brand-900">
          <tr>
            {cabeza.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
          {filas.map((f, i) => (
            <tr key={i}>
              {f.map((celda, j) => (
                <td key={j} className={cx("px-4 py-3 align-top", j === 0 && "font-semibold text-brand-900")}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Campos enlazados al borrador ── */
type Clave = Exclude<keyof Contenido, "proyectos" | "check">;

export function Txt({ k, label, ayuda, placeholder, type = "text", className }: { k: Clave; label: string; ayuda?: string; placeholder?: string; type?: string; className?: string }) {
  const { c, set } = useBorrador();
  return <Input label={label} ayuda={ayuda} placeholder={placeholder} type={type} className={className} value={c[k]} onChange={(e) => set({ [k]: e.target.value })} />;
}

export function Area({ k, label, ayuda, placeholder, rows = 3, extra }: { k: Clave; label: string; ayuda?: string; placeholder?: string; rows?: number; extra?: ReactNode }) {
  const { c, set } = useBorrador();
  return (
    <div>
      <Textarea label={label} ayuda={ayuda} placeholder={placeholder} rows={rows} value={c[k]} onChange={(e) => set({ [k]: e.target.value })} />
      {extra}
    </div>
  );
}

/* ── Revisión con IA: se pinta igual para quien la pidió y para el CDP ── */
const TONO_ESTADO: Record<string, string> = {
  solido: "border-emerald-300 bg-emerald-50 text-emerald-800",
  afinar: "border-amber-300 bg-amber-50 text-amber-800",
  desarrollar: "border-rose-300 bg-rose-50 text-rose-800",
};

function Bloque({ titulo, estado, observaciones }: { titulo: string; estado?: string; observaciones?: string[] }) {
  const e = estadoValido(estado);
  const lista = (observaciones ?? []).filter((t) => String(t ?? "").trim());
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base">{titulo}</h4>
        <span className={cx("rounded-full border px-2.5 py-0.5 text-xs font-semibold", TONO_ESTADO[e])}>{ESTADOS[e]}</span>
      </div>
      {lista.length > 0 && (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          {lista.map((t, i) => (
            <li key={i}>{String(t)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RevisionVista({ d, tuyo = true }: { d: Revision; tuyo?: boolean }) {
  // Todo es texto de un modelo: React lo escapa, nunca se inserta como HTML.
  if (d.crudo) return <p className="whitespace-pre-wrap rounded-xl bg-slate-100 p-4 text-sm text-slate-700">{d.crudo}</p>;
  return (
    <div className="space-y-6">
      {d.veredicto && (
        <p className={cx("rounded-xl border-l-4 px-5 py-4 font-medium", d.listo ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-brand-600 bg-brand-50 text-brand-900")}>{d.veredicto}</p>
      )}
      {!!d.proyectos?.length && (
        <section className="space-y-3">
          <Eyebrow>{tuyo ? "Tus fichas de proyecto" : "Sus fichas de proyecto"}</Eyebrow>
          {d.proyectos.map((p, i) => (
            <Bloque key={i} titulo={`Ficha ${p.ficha ?? i + 1}${p.titulo ? `: ${p.titulo}` : ""}`} estado={p.estado} observaciones={p.observaciones} />
          ))}
        </section>
      )}
      {!!d.secciones?.length && (
        <section className="space-y-3">
          <Eyebrow>El resto del portafolio</Eyebrow>
          {d.secciones.map((s, i) => (
            <Bloque key={i} titulo={s.nombre || "Sección"} estado={s.estado} observaciones={s.observaciones} />
          ))}
        </section>
      )}
      {d.prioridad && (
        <p className="rounded-xl bg-brand-900 px-5 py-4 text-sm text-brand-100">
          <b className="mb-1 block text-white">Si solo arreglas una cosa</b>
          {d.prioridad}
        </p>
      )}
      <p className="text-xs leading-relaxed text-slate-500">
        {tuyo
          ? "Esta segunda opinión la generó un modelo de inteligencia artificial (Gemini) que no conoce tu trabajo ni habló contigo: son observaciones, no correcciones, y puede equivocarse. Tú decides cuáles aplicas. Para una revisión hecha por una persona, escribe al Centro de Desarrollo Profesional desde la hoja «Hablar con un asesor»."
          : "La generó un modelo de inteligencia artificial (Gemini) que no conoce su trabajo ni habló con esta persona. Son observaciones automáticas, no un diagnóstico del Centro: léelas como un punto de partida para la asesoría, no como una evaluación."}
      </p>
    </div>
  );
}

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}
