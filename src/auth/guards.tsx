import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Cargando } from "@/components/ui";

export function RequireAuth() {
  const { cargando, session } = useAuth();
  const loc = useLocation();
  if (cargando) return <Cargando />;
  if (!session) return <Navigate to="/ingresar" replace state={{ desde: loc.pathname }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { cargando, perfil, session } = useAuth();
  if (cargando || (session && !perfil)) return <Cargando />;
  if (perfil?.rol !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}
