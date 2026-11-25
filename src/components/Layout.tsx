import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { botonClase, cx } from "@/components/ui";
import logoBlanco from "@/assets/logo-talenthub-blanco.png";

/* Estructura tomada de AlumniCV: barra azul arriba, menú lateral con tarjetas y contenido sobre fondo azul pálido. */

const ICONOS: Record<string, ReactNode> = {
  inicio: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z" />,
  portafolio: <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />,
  pitch: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  cuenta: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  admin: <path d="M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6l8-3z" />,
};

function Icono({ nombre }: { nombre: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONOS[nombre]}
    </svg>
  );
}

type Enlace = { to: string; texto: string; icono: string; fin?: boolean };

const PUBLICOS: Enlace[] = [
  { to: "/", texto: "Inicio", icono: "inicio", fin: true },
  { to: "/portafolio", texto: "Portafolio", icono: "portafolio" },
  { to: "/pitch", texto: "Estudio de Pitch", icono: "pitch" },
];

const iniciales = (nombre: string, correo: string) =>
  (nombre.trim() ? nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("") : correo.slice(0, 2)).toUpperCase();

function Menu({ onNavegar }: { onNavegar?: () => void }) {
  const { session, perfil, esAdmin } = useAuth();
  const enlaces: Enlace[] = [...PUBLICOS];
  if (session) enlaces.push({ to: "/cuenta", texto: "Mi cuenta", icono: "cuenta" });
  if (esAdmin) enlaces.push({ to: "/admin", texto: "Administración", icono: "admin" });

  return (
    <nav aria-label="Principal" className="flex flex-col gap-4">
      {session && perfil && (
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand-300 bg-brand-50 font-display text-sm italic text-brand-900">
            {iniciales(perfil.nombre, perfil.correo)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-900">{perfil.nombre || "Mi cuenta"}</p>
            <p className="truncate text-[11px] uppercase tracking-wide text-gray-500">{perfil.correo}</p>
          </div>
        </div>
      )}
      <ul className="flex flex-col gap-2.5">
        {enlaces.map((e) => (
          <li key={e.to}>
            <NavLink
              to={e.to}
              end={e.fin}
              onClick={onNavegar}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-[13.6px] font-semibold transition-colors",
                  isActive ? "border-brand-700 bg-brand-100 text-brand-900" : "border-line bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50",
                )
              }
            >
              <Icono nombre={e.icono} />
              {e.texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Barra({ onMenu, menuAbierto }: { onMenu: () => void; menuAbierto: boolean }) {
  const { session, perfil, salir } = useAuth();
  const navegar = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-brand-900 shadow-[0_2px_12px_rgb(0_0_0/0.25)]">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        <button
          className="inline-flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          onClick={onMenu}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuAbierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
      </button>
        <Link to="/" aria-label="TalentHub UniSabana, inicio" className="flex items-center gap-4">
          <img src={logoBlanco} alt="TalentHub UniSabana" className="h-10 w-auto" />
          <span aria-hidden className="hidden h-8 w-px bg-white/25 sm:block" />
          <span className="hidden font-display text-xl italic text-white sm:block">Herramientas de empleabilidad</span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <>
              <span className="hidden max-w-60 truncate text-sm font-medium text-white md:block">{perfil?.correo}</span>
              <button
                onClick={async () => {
                  await salir();
                  navegar("/");
                }}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13.6px] font-medium text-white transition-colors hover:bg-white/20"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/ingresar" className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13.6px] font-medium text-white transition-colors hover:bg-white/20 sm:block">
                Ingresar
              </Link>
              <Link to="/registro" className={botonClase("onDark", "sm", "hidden sm:inline-flex")}>
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Pie() {
  return (
    <footer className="border-t border-line px-4 py-5 text-xs text-gray-500 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p>© {new Date().getFullYear()} Universidad de La Sabana · TalentHub UniSabana</p>
        <p className="flex flex-wrap gap-x-5 gap-y-1">
          <span>El audio nunca se almacena.</span>
          <a className="text-brand-700 hover:underline" target="_blank" rel="noopener noreferrer" href="https://www.unisabana.edu.co/politica-de-proteccion-de-datos">
            Política de datos personales
          </a>
        </p>
      </div>
    </footer>
  );
}

export function Layout() {
  const { session } = useAuth();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      <Barra onMenu={() => setMenu((m) => !m)} menuAbierto={menu} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main id="contenido" className="flex-1">
          <Outlet />
        </main>
        <Pie />
      </div>

      {/* Menú lateral opcional: se abre con el botón de la barra y se cierra solo al navegar. */}
      {menu && (
        <>
          <div aria-hidden onClick={() => setMenu(false)} className="fixed inset-x-0 bottom-0 top-16 z-20 bg-brand-950/40" />
          <div className="fixed bottom-0 left-0 top-16 z-30 w-72 max-w-[85vw] overflow-y-auto border-r border-line bg-white px-4 py-6 shadow-lift">
            <Menu onNavegar={() => setMenu(false)} />
            {!session && (
              <div className="mt-6 flex flex-col gap-2.5 border-t border-line pt-5">
                <Link to="/ingresar" className={botonClase("secondary", "md", "w-full")}>
                  Ingresar
                </Link>
                <Link to="/registro" className={botonClase("primary", "md", "w-full")}>
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
