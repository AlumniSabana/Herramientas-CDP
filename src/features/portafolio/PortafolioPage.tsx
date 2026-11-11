import { useEffect, useState, type ComponentType } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, Contenedor, botonClase, cx } from "@/components/ui";
import { BorradorProvider, useBorrador, type EstadoGuardado } from "./Borrador";
import { Asesor, Contacto, Identidad, Impacto, Intro, Perfil, Plataformas, Programa } from "./Hojas";
import { Proyectos } from "./Proyectos";
import { Resultado } from "./Resultado";
import { Verificar } from "./Verificar";
import { estados, evaluarProyectos, hojasCompletas } from "./logica";

type Paso = { ruta: string; titulo: string; grupo: string; n?: number; hoja?: keyof ReturnType<typeof estados>; el: ComponentType };

const GRUPOS = ["Para empezar", "Construcción de tu portafolio", "Revisar y publicar"];
const PASOS: Paso[] = [
  { ruta: "que-es", titulo: "¿Qué es un portafolio?", grupo: GRUPOS[0], el: Intro },
  { ruta: "programa", titulo: "Tu programa", grupo: GRUPOS[0], el: Programa },
  { ruta: "identidad", titulo: "Identidad", grupo: GRUPOS[1], n: 1, hoja: "identidad", el: Identidad },
  { ruta: "perfil", titulo: "Perfil profesional", grupo: GRUPOS[1], n: 2, hoja: "perfil", el: Perfil },
  { ruta: "proyectos", titulo: "Proyectos y evidencias", grupo: GRUPOS[1], n: 3, hoja: "proyectos", el: Proyectos },
  { ruta: "impacto", titulo: "Impacto", grupo: GRUPOS[1], n: 4, hoja: "impacto", el: Impacto },
  { ruta: "contacto", titulo: "Contacto", grupo: GRUPOS[1], n: 5, hoja: "contacto", el: Contacto },
  { ruta: "verificar", titulo: "Antes de publicar", grupo: GRUPOS[2], el: Verificar },
  { ruta: "resultado", titulo: "Tu portafolio", grupo: GRUPOS[2], el: Resultado },
  { ruta: "plataformas", titulo: "¿Dónde publicarlo?", grupo: GRUPOS[2], el: Plataformas },
  { ruta: "asesor", titulo: "Hablar con un asesor", grupo: GRUPOS[2], el: Asesor },
];
const IDX_PROYECTOS = PASOS.findIndex((p) => p.ruta === "proyectos");

const TEXTO_ESTADO: Record<EstadoGuardado, string> = {
  limpio: "Sin cambios todavía",
  pendiente: "Cambios sin guardar…",
  guardando: "Guardando…",
  guardado: "Guardado en tu cuenta",
  error: "Error al guardar",
};

function Guardado() {
  const { estado, error, guardarYa } = useBorrador();
  return (
    <div role="status" className="space-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm">
      <span className="flex items-center gap-2 font-medium text-slate-700">
        <span
          aria-hidden
          className={cx("size-2.5 rounded-full", estado === "guardado" && "bg-emerald-500", estado === "error" && "bg-rose-500", (estado === "pendiente" || estado === "guardando") && "animate-pulse bg-amber-500", estado === "limpio" && "bg-slate-300")}
        />
        {TEXTO_ESTADO[estado]}
      </span>
      {estado === "error" && (
        <>
          <p className="text-xs text-rose-700">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => void guardarYa()}>
            Reintentar
          </Button>
        </>
      )}
    </div>
  );
}

function Indice({ abierta, onNavegar }: { abierta: boolean; onNavegar(): void }) {
  const { c } = useBorrador();
  const { esAdmin } = useAuth();
  const est = estados(c);
  const n = hojasCompletas(c);
  return (
    <nav aria-label="Índice de hojas" className="space-y-6">
      <div>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-brand-900">Tu avance</span>
          <span className="text-slate-500">{n} de 5</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(n / 5) * 100}%` }} />
        </div>
      </div>
      {GRUPOS.map((g) => (
        <div key={g}>
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">{g}</p>
          <ul className="space-y-1">
            {PASOS.map((p, i) => {
              if (p.grupo !== g) return null;
              const cerrado = i > IDX_PROYECTOS && !abierta && !esAdmin;
              const hecho = p.hoja ? est[p.hoja] : false;
              const marca = (
                <span className={cx("grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", hecho ? "bg-emerald-600 text-white" : "bg-brand-100 text-brand-800")}>{hecho ? "✓" : (p.n ?? "·")}</span>
              );
              return (
                <li key={p.ruta}>
                  {cerrado ? (
                    <span aria-disabled="true" title="Completa una ficha de proyecto para llegar aquí" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400">
                      {marca}
                      {p.titulo}
                    </span>
                  ) : (
                    <NavLink
                      to={`/portafolio/${p.ruta}`}
                      onClick={onNavegar}
                      className={({ isActive }) => cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-brand-900 text-white" : "text-slate-700 hover:bg-brand-50")}
                    >
                      {marca}
                      {p.titulo}
                    </NavLink>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <Guardado />
    </nav>
  );
}

function Contenido() {
  const { c } = useBorrador();
  const { esAdmin } = useAuth();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const abierta = evaluarProyectos(c.proyectos).completas > 0;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  const actual = PASOS.findIndex((p) => loc.pathname.endsWith(`/${p.ruta}`));
  const ant = actual > 0 ? PASOS[actual - 1] : null;
  const sig = actual >= 0 && actual < PASOS.length - 1 ? PASOS[actual + 1] : null;
  const sigBloqueado = actual === IDX_PROYECTOS && !abierta && !esAdmin;

  return (
    <Contenedor className="py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 lg:hidden">
            <Button variant="secondary" className="w-full" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              {menu ? "Cerrar el índice" : `Índice de hojas · ${PASOS[actual]?.titulo ?? ""}`}
            </Button>
          </div>
          <div className={cx("rounded-2xl border border-slate-200 bg-white p-5 shadow-card", !menu && "hidden lg:block")}>
            <Link to="/" className="mb-5 block text-sm font-medium text-brand-600 hover:underline">
              ← Herramientas del CDP
            </Link>
            <Indice abierta={abierta} onNavegar={() => setMenu(false)} />
          </div>
        </aside>

        <div className="min-w-0">
          <Card className="sm:p-10">
            <Routes>
              <Route index element={<Navigate to="/portafolio/que-es" replace />} />
              {PASOS.map((p, i) => (
                <Route key={p.ruta} path={p.ruta} element={i > IDX_PROYECTOS && !abierta && !esAdmin ? <Navigate to="/portafolio/proyectos" replace /> : <p.el />} />
              ))}
              <Route path="*" element={<Navigate to="/portafolio/que-es" replace />} />
            </Routes>
            {actual >= 0 && (
              <div className="mt-12 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
                {ant ? (
                  <Link to={`/portafolio/${ant.ruta}`} className={botonClase("secondary")}>
                    ← {ant.titulo}
                  </Link>
                ) : (
                  <span />
                )}
                {sig &&
                  (sigBloqueado ? (
                    <button disabled title="Completa al menos una ficha para continuar" className={botonClase("primary")}>
                      {sig.titulo} →
                    </button>
                  ) : (
                    <Link to={`/portafolio/${sig.ruta}`} className={botonClase("primary")}>
                      {sig.titulo} →
                    </Link>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Contenedor>
  );
}

export default function PortafolioPage() {
  return (
    <div className="bg-gradient-to-b from-brand-50 to-transparent">
      <BorradorProvider>
        <Contenido />
      </BorradorProvider>
    </div>
  );
}
