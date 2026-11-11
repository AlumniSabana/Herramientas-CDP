import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Cargando, Input, Vacio } from "@/components/ui";
import { mensajeDeError, supabase } from "@/lib/supabase";

type Persona = {
  id: string;
  correo: string;
  nombre: string;
  facultad: string;
  programa: string;
  rol: "usuario" | "admin";
  creado_en: string;
  ultimo_acceso: string | null;
};

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default function AdminPersonas() {
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    // Solo quien ya inició sesión alguna vez cuenta como persona atendida.
    supabase
      .from("perfiles_admin")
      .select("*")
      .not("ultimo_acceso", "is", null)
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => (error ? setError(mensajeDeError(error)) : setPersonas(data as Persona[])));
  }, []);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (personas ?? []).filter((p) => !t || [p.correo, p.nombre, p.facultad, p.programa].some((x) => x.toLowerCase().includes(t)));
  }, [personas, q]);

  if (error) return <Alert tono="error">{error}</Alert>;
  if (!personas) return <Cargando />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-slate-600">
          <strong className="text-brand-900">{personas.length}</strong> personas han ingresado.
        </p>
        <Input label="Buscar" placeholder="Nombre, correo o programa" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-80" />
      </div>

      {lista.length === 0 ? (
        <Vacio titulo="Sin resultados">Ninguna persona coincide con la búsqueda.</Vacio>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-brand-50 text-xs uppercase tracking-wider text-brand-800">
              <tr>
                {["Persona", "Facultad", "Programa", "Registro", "Último acceso"].map((h) => (
                  <th key={h} className="px-5 py-3.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-brand-900">
                      {p.nombre || "—"} {p.rol === "admin" && <Badge>Admin</Badge>}
                    </p>
                    <p className="text-slate-500">{p.correo}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{p.facultad || "—"}</td>
                  <td className="px-5 py-4 text-slate-700">{p.programa || "—"}</td>
                  <td className="px-5 py-4 text-slate-600">{fecha(p.creado_en)}</td>
                  <td className="px-5 py-4 text-slate-600">{fecha(p.ultimo_acceso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
