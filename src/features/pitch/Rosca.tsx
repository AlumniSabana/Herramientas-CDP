/* Rosca de composición.
   Solo cinco sectores: una rosca sirve para ver la proporción de un vistazo, no para comparar valores
   parecidos. Se pintan los cuatro mayores y el resto se agrupa en «Otras»; el detalle completo está en
   la tabla de al lado, que además es el respaldo accesible de la gráfica.
   Un solo tono (escala del azul institucional): la identidad nunca depende del color, cada sector
   lleva su etiqueta en la leyenda con cifra y porcentaje. */
import { cx } from "@/components/ui";

export type DatoRosca = { nombre: string; valor: number; clave: string };

const TONOS = ["#001459", "#2A5AA8", "#5E93CE", "#A3C3E6"];
const OTRAS = "#5C6472";
const MAX = 4;
const R = 36;
const C = 2 * Math.PI * R;

type Trozo = { nombre: string; valor: number; color: string; clave: string | null; agrupa?: string[] };

export function Rosca({ titulo, datos, unidad = "personas", alElegir }: { titulo: string; datos: DatoRosca[]; unidad?: string; alElegir?: (clave: string) => void }) {
  const con = datos.filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);
  const total = con.reduce((a, d) => a + d.valor, 0);

  const trozos: Trozo[] = con.slice(0, MAX).map((d, i) => ({ nombre: d.nombre, valor: d.valor, color: TONOS[i], clave: d.clave }));
  const resto = con.slice(MAX);
  if (resto.length) {
    const uno = resto.length === 1;
    trozos.push({
      nombre: uno ? resto[0].nombre : "Otras " + resto.length,
      valor: resto.reduce((a, d) => a + d.valor, 0),
      color: uno ? TONOS[MAX - 1] : OTRAS,
      // El sector agrupado no lleva a ninguna parte: son varias; la tabla las tiene una por una.
      clave: uno ? resto[0].clave : null,
      agrupa: uno ? undefined : resto.map((d) => d.nombre),
    });
  }

  let acumulado = 0;
  const arcos = trozos.map((t, i) => {
    const desde = acumulado;
    acumulado += t.valor / total;
    const largo = Math.max(0, acumulado - desde) * C;
    const visible = Math.max(0.5, largo - 1.6); // aire entre sectores
    return { t, i, visible, offset: -desde * C };
  });

  const alt = total
    ? `${titulo}. ${trozos.map((t) => `${t.nombre}, ${t.valor}`).join("; ")}. Total ${total} ${unidad}. El detalle completo está en la tabla.`
    : "Sin datos que representar.";

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <figcaption className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{titulo}</figcaption>
      <div className="mt-5 grid items-center gap-8 sm:grid-cols-[11rem_1fr]">
        <div className="relative mx-auto size-44">
          <svg viewBox="0 0 100 100" role="img" aria-label={alt} className="size-full">
            {total === 0 ? (
              <circle cx="50" cy="50" r={R} fill="none" stroke="#E9EEF7" strokeWidth="17" />
            ) : (
              arcos.map(({ t, i, visible, offset }) => (
                <circle
                  key={i} cx="50" cy="50" r={R} fill="none" stroke={t.color} strokeWidth="17"
                  strokeDasharray={`${visible.toFixed(2)} ${(C - visible).toFixed(2)}`} strokeDashoffset={offset.toFixed(2)}
                  transform="rotate(-90 50 50)"
                  className={cx(alElegir && t.clave && "cursor-pointer hover:opacity-80")}
                  onClick={alElegir && t.clave ? () => alElegir(t.clave!) : undefined}
                >
                  <title>{`${t.nombre}: ${t.valor} de ${total} (${Math.round((t.valor / total) * 100)} %)`}</title>
                </circle>
              ))
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tabular-nums text-brand-900">{total}</span>
            <span className="text-xs text-slate-500">{unidad}</span>
          </div>
        </div>
        <div className="space-y-1">
          {total === 0 && <p className="text-sm text-slate-500">Todavía no hay a nadie registrado aquí.</p>}
          {trozos.map((t, i) => {
            const contenido = (
              <>
                <span className="size-3 shrink-0 rounded-sm" style={{ background: t.color }} />
                <span className="flex-1 truncate text-left">{t.nombre}</span>
                <span className="font-semibold tabular-nums">{t.valor}</span>
                <span className="w-12 text-right tabular-nums text-slate-500">{Math.round((t.valor / total) * 100)} %</span>
              </>
            );
            const titulo2 = t.agrupa ? `Agrupa ${t.agrupa.length}: ${t.agrupa.join(", ")}` : t.nombre;
            return alElegir && t.clave ? (
              <button key={i} type="button" title={titulo2} onClick={() => alElegir(t.clave!)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-brand-50">
                {contenido}
              </button>
            ) : (
              <div key={i} title={titulo2} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700">
                {contenido}
              </div>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
