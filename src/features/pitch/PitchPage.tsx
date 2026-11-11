import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Contenedor, cx } from "@/components/ui";
import { PitchProvider } from "./PitchContext";
import Aprende from "./Aprende";
import Prepara from "./Prepara";
import Practica from "./Practica";
import Reporte from "./Reporte";

const ETAPAS = [
  { to: "/pitch", n: "01", texto: "Aprende", fin: true },
  { to: "/pitch/prepara", n: "02", texto: "Prepara" },
  { to: "/pitch/practica", n: "03", texto: "Practica" },
  { to: "/pitch/reporte", n: "04", texto: "Reporte" },
];

export default function PitchPage() {
  return (
    <PitchProvider>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 text-white">
        <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/30 blur-3xl" />
        <Contenedor className="relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">Estudio digital de producción de pitch con inteligencia artificial</p>
            <h1 className="mt-4 text-4xl text-white sm:text-5xl">
              Tienes tres minutos. <span className="text-brand-300">Practícalos en voz alta.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-brand-100">
              Aprende qué es un pitch y cómo se construye, ensáyalo con cronómetro y guía de ritmo, y recibe un reporte que te dice qué funcionó y qué ajustar antes de la conversación que importa.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["6", "escenarios: elevator, comercial, emprendimiento, empleo, proyecto académico y presentación final"],
              ["1 · 3 · 5 · 10", "formatos de duración, cada uno con su propia estructura"],
            ].map(([n, t]) => (
              <div key={n} className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur">
                <p className="text-3xl font-semibold text-white">{n}</p>
                <p className="mt-2 text-sm text-brand-100">{t}</p>
              </div>
            ))}
          </div>
        </Contenedor>
      </section>

      <nav aria-label="Etapas del entrenamiento" className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <Contenedor className="flex gap-2 overflow-x-auto py-3">
          {ETAPAS.map((e) => (
            <NavLink
              key={e.to}
              to={e.to}
              end={e.fin}
              className={({ isActive }) =>
                cx(
                  "flex shrink-0 items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                  isActive ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-brand-50 hover:text-brand-900",
                )
              }
            >
              <span className="text-xs opacity-70">{e.n}</span>
              {e.texto}
            </NavLink>
          ))}
        </Contenedor>
      </nav>

      <Contenedor className="py-12 sm:py-16">
        <Routes>
          <Route index element={<Aprende />} />
          <Route path="prepara" element={<Prepara />} />
          <Route path="practica" element={<Practica />} />
          <Route path="reporte" element={<Reporte />} />
          <Route path="*" element={<Navigate to="/pitch" replace />} />
        </Routes>
      </Contenedor>
    </PitchProvider>
  );
}
