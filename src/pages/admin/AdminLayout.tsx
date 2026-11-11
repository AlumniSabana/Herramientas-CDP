import { NavLink, Outlet } from "react-router-dom";
import { Contenedor, cx, PageHeader } from "@/components/ui";

const TABS = [
  { to: "/admin", texto: "Personas", fin: true },
  { to: "/admin/portafolios", texto: "Portafolios" },
  { to: "/admin/pitch", texto: "Estudio de Pitch" },
];

export default function AdminLayout() {
  return (
    <Contenedor className="py-12">
      <PageHeader eyebrow="Administración" titulo="Consolidado del Centro" descripcion="Cifras de uso y avance de las personas que han ingresado. El texto del portafolio no es visible desde aquí." />
      <nav aria-label="Secciones de administración" className="mb-8 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.fin}
            className={({ isActive }) =>
              cx(
                "-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                isActive ? "border-brand-700 text-brand-900" : "border-transparent text-slate-500 hover:text-brand-800",
              )
            }
          >
            {t.texto}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </Contenedor>
  );
}
