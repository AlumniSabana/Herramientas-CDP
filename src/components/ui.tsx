import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ───────── Botones ───────── */
type Variante = "primary" | "secondary" | "ghost" | "danger" | "onDark";
type Tam = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primary: "bg-brand-900 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600",
  secondary: "border border-brand-200 bg-white text-brand-900 hover:border-brand-400 hover:bg-brand-50",
  ghost: "text-brand-800 hover:bg-brand-100",
  danger: "bg-rose-700 text-white hover:bg-rose-800",
  onDark: "bg-white text-brand-900 hover:bg-brand-100",
};
const TAMANOS: Record<Tam, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

/** Clases de botón para usarlas también en <Link> y <a>. */
export const botonClase = (v: Variante = "primary", t: Tam = "md", extra?: string) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTES[v],
    TAMANOS[t],
    extra,
  );

export function Button({ variant, size, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variante; size?: Tam }) {
  return <button type="button" {...p} className={botonClase(variant, size, className)} />;
}

/* ───────── Contenedores ───────── */
export function Contenedor({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs font-bold uppercase tracking-[0.16em] text-brand-600", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, titulo, descripcion, acciones }: { eyebrow?: string; titulo: string; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="text-3xl sm:text-4xl">{titulo}</h1>
        {descripcion && <p className="mt-3 text-slate-600">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-3">{acciones}</div>}
    </div>
  );
}

/* ───────── Avisos y estados ───────── */
const TONOS = {
  info: "border-brand-200 bg-brand-50 text-brand-900",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
};
export function Alert({ tono = "info", children, className }: { tono?: keyof typeof TONOS; children: ReactNode; className?: string }) {
  return (
    <div role={tono === "error" ? "alert" : "status"} className={cx("rounded-xl border px-4 py-3 text-sm leading-relaxed", TONOS[tono], className)}>
      {children}
    </div>
  );
}

export function Badge({ tono = "info", children }: { tono?: "info" | "ok" | "warn" | "error" | "neutro"; children: ReactNode }) {
  const t = tono === "neutro" ? "bg-slate-100 text-slate-700" : { info: "bg-brand-100 text-brand-800", ok: "bg-emerald-100 text-emerald-800", warn: "bg-amber-100 text-amber-800", error: "bg-rose-100 text-rose-800" }[tono];
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cx("inline-block size-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700", className)} />;
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-slate-500" role="status">
      <Spinner /> {texto}
    </div>
  );
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="font-semibold text-brand-900">{titulo}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-slate-600">{children}</div>}
    </div>
  );
}

/* ───────── Formularios ───────── */
const CONTROL =
  "block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25 disabled:bg-slate-100";

type CampoBase = { label: string; ayuda?: string; error?: string; className?: string };

function Campo({ label, ayuda, error, className, id, children }: CampoBase & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1.5 text-xs text-slate-500">{ayuda}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

export function Input({ label, ayuda, error, className, ...p }: CampoBase & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Campo id={id} {...{ label, ayuda, error, className }}>
      <input id={id} {...p} className={cx(CONTROL, error && "border-rose-500")} />
    </Campo>
  );
}

export function Textarea({ label, ayuda, error, className, ...p }: CampoBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Campo id={id} {...{ label, ayuda, error, className }}>
      <textarea id={id} rows={4} {...p} className={cx(CONTROL, "resize-y", error && "border-rose-500")} />
    </Campo>
  );
}

export function Select({ label, ayuda, error, className, children, ...p }: CampoBase & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Campo id={id} {...{ label, ayuda, error, className }}>
      <select id={id} {...p} className={cx(CONTROL, "pr-9", error && "border-rose-500")}>
        {children}
      </select>
    </Campo>
  );
}
