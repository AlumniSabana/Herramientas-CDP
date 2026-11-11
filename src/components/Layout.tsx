import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { botonClase, Contenedor, cx } from "@/components/ui";
import logo from "@/assets/logo-talenthub.png";

const ENLACES = [
  { to: "/", texto: "Inicio", fin: true },
  { to: "/portafolio", texto: "Portafolio" },
  { to: "/pitch", texto: "Estudio de Pitch" },
];

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  cx(
    "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-brand-100 text-brand-900" : "text-slate-600 hover:bg-slate-100 hover:text-brand-900",
  );

function Cabecera() {
  const { session, perfil, esAdmin, salir } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const navegar = useNavigate();
  const cerrar = () => setAbierto(false);

  const enlaces = esAdmin ? [...ENLACES, { to: "/admin", texto: "Administración" }] : ENLACES;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <Contenedor className="flex h-[72px] items-center gap-6">
        <Link to="/" onClick={cerrar} aria-label="TalentHub UniSabana, inicio" className="shrink-0">
          <img src={logo} alt="TalentHub UniSabana" className="h-12 w-auto" />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {enlaces.map((e) => (
            <NavLink key={e.to} to={e.to} end={e.fin} className={claseEnlace}>
              {e.texto}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {session ? (
            <>
              <div className="text-right leading-tight">
                <p className="max-w-48 truncate text-sm font-semibold text-brand-900">{perfil?.nombre || perfil?.correo}</p>
                <p className="max-w-48 truncate text-xs text-slate-500">{perfil?.programa}</p>
              </div>
              <button
                onClick={async () => {
                  await salir();
                  navegar("/");
                }}
                className={botonClase("secondary", "sm")}
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/ingresar" className={botonClase("ghost", "sm")}>
                Ingresar
              </Link>
              <Link to="/registro" className={botonClase("primary", "sm")}>
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        <button
          className="ml-auto inline-flex size-10 items-center justify-center rounded-lg text-brand-900 hover:bg-slate-100 md:hidden"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          onClick={() => setAbierto((a) => !a)}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {abierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </Contenedor>

      {abierto && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <Contenedor className="flex flex-col gap-1 py-4">
            {enlaces.map((e) => (
              <NavLink key={e.to} to={e.to} end={e.fin} onClick={cerrar} className={claseEnlace}>
                {e.texto}
              </NavLink>
            ))}
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
              {session ? (
                <button
                  onClick={async () => {
                    cerrar();
                    await salir();
                    navegar("/");
                  }}
                  className={botonClase("secondary", "md", "w-full")}
                >
                  Salir ({perfil?.nombre || perfil?.correo})
                </button>
              ) : (
                <>
                  <Link to="/ingresar" onClick={cerrar} className={botonClase("secondary", "md", "flex-1")}>
                    Ingresar
                  </Link>
                  <Link to="/registro" onClick={cerrar} className={botonClase("primary", "md", "flex-1")}>
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </Contenedor>
        </div>
      )}
    </header>
  );
}

function Pie() {
  return (
    <footer className="mt-24 bg-brand-950 text-brand-200">
      <Contenedor className="grid gap-8 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-lg font-semibold text-white">Centro de Desarrollo Profesional</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-brand-300">
            Universidad de La Sabana · Alumni. Herramientas de acceso abierto para quienes quieren contar mejor lo que han hecho.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">Herramientas</p>
          <ul className="space-y-2">
            <li><Link className="hover:text-white" to="/portafolio">Construye tu portafolio</Link></li>
            <li><Link className="hover:text-white" to="/pitch">Estudio de Pitch</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">Tu información</p>
          <ul className="space-y-2">
            <li>El audio nunca se almacena.</li>
            <li>
              <a className="hover:text-white" target="_blank" rel="noopener noreferrer" href="https://www.unisabana.edu.co/politica-de-proteccion-de-datos">
                Política de datos personales
              </a>
            </li>
          </ul>
        </div>
      </Contenedor>
      <div className="border-t border-white/10 py-5 text-center text-xs text-brand-300">© {new Date().getFullYear()} Universidad de La Sabana</div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      <Cabecera />
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <Pie />
    </div>
  );
}
