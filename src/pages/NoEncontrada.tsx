import { Link } from "react-router-dom";
import { botonClase, Contenedor } from "@/components/ui";

export default function NoEncontrada() {
  return (
    <Contenedor className="py-28 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600">Error 404</p>
      <h1 className="mt-3 text-4xl">Esta página no existe</h1>
      <p className="mx-auto mt-4 max-w-md text-slate-600">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <Link to="/" className={botonClase("primary", "lg", "mt-8")}>
        Volver al inicio
      </Link>
    </Contenedor>
  );
}
