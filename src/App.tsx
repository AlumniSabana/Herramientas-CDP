import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Cargando } from "@/components/ui";
import { RequireAdmin, RequireAuth } from "@/auth/guards";
import Inicio from "@/pages/Inicio";
import { Ingresar, Recuperar, Registro } from "@/pages/Cuenta";
import NoEncontrada from "@/pages/NoEncontrada";

// Cada herramienta se carga cuando se abre: el analizador de cámara y el generador de PDF pesan.
const PitchPage = lazy(() => import("@/features/pitch/PitchPage"));
const PortafolioPage = lazy(() => import("@/features/portafolio/PortafolioPage"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminPersonas = lazy(() => import("@/pages/admin/AdminPersonas"));
const AdminPitch = lazy(() => import("@/features/pitch/AdminPitch"));
const AdminPortafolios = lazy(() => import("@/features/portafolio/AdminPortafolios"));

export default function App() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="ingresar" element={<Ingresar />} />
          <Route path="registro" element={<Registro />} />
          <Route path="recuperar" element={<Recuperar />} />

          {/* El pitch se puede practicar sin cuenta; con cuenta, además, se guarda el historial. */}
          <Route path="pitch/*" element={<PitchPage />} />

          <Route element={<RequireAuth />}>
            <Route path="portafolio/*" element={<PortafolioPage />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminPersonas />} />
              <Route path="pitch" element={<AdminPitch />} />
              <Route path="portafolios" element={<AdminPortafolios />} />
            </Route>
          </Route>

          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
