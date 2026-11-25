import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Alert, Button, Card, Cargando, Contenedor, Input, PageHeader, Select } from "@/components/ui";
import { FACULTADES } from "@/lib/catalogo";
import { mensajeDeError } from "@/lib/supabase";

type Aviso = { tono: "ok" | "error"; texto: string } | null;

function Datos() {
  const { perfil, guardarPerfil } = useAuth();
  const [f, setF] = useState({ nombre: perfil?.nombre ?? "", facultad: perfil?.facultad ?? "", programa: perfil?.programa ?? "" });
  const [aviso, setAviso] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState(false);

  // Una facultad guardada que ya no está en el catálogo sigue siendo elegible.
  const facultades = Object.keys(FACULTADES);
  if (f.facultad && !facultades.includes(f.facultad)) facultades.push(f.facultad);
  const programas = FACULTADES[f.facultad] ?? (f.programa ? [f.programa] : []);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setAviso(null);
    try {
      await guardarPerfil(f);
      setAviso({ tono: "ok", texto: "Datos actualizados." });
    } catch (err) {
      setAviso({ tono: "error", texto: mensajeDeError(err) });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Card>
      <h2 className="text-xl">Datos personales</h2>
      <form onSubmit={enviar} className="mt-6 space-y-5">
        <Input label="Correo institucional" value={perfil?.correo ?? ""} disabled readOnly ayuda="El correo identifica tu cuenta y no se puede cambiar." />
        <Input label="Nombre completo" required autoComplete="name" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Facultad" required value={f.facultad} onChange={(e) => setF({ ...f, facultad: e.target.value, programa: "" })}>
            <option value="">Selecciona…</option>
            {facultades.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Select label="Programa" required disabled={!f.facultad} value={f.programa} onChange={(e) => setF({ ...f, programa: e.target.value })}>
            <option value="">Selecciona…</option>
            {programas.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </div>
        {aviso && <Alert tono={aviso.tono}>{aviso.texto}</Alert>}
        <Button type="submit" disabled={ocupado || !f.nombre.trim() || !f.programa}>
          {ocupado ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </Card>
  );
}

function Clave() {
  const { cambiarClave } = useAuth();
  const [f, setF] = useState({ nueva: "", repetir: "" });
  const [aviso, setAviso] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setAviso(null);
    if (f.nueva.length < 8) return setAviso({ tono: "error", texto: "La contraseña nueva debe tener al menos 8 caracteres." });
    if (f.nueva !== f.repetir) return setAviso({ tono: "error", texto: "Las contraseñas nuevas no coinciden." });
    setOcupado(true);
    try {
      await cambiarClave(f.nueva);
      setF({ nueva: "", repetir: "" });
      setAviso({ tono: "ok", texto: "Contraseña cambiada." });
    } catch (err) {
      setAviso({ tono: "error", texto: mensajeDeError(err) });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Card>
      <h2 className="text-xl">Cambiar contraseña</h2>
      <form onSubmit={enviar} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Contraseña nueva" type="password" autoComplete="new-password" required minLength={8} ayuda="Mínimo 8 caracteres." value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} />
          <Input label="Repite la nueva" type="password" autoComplete="new-password" required value={f.repetir} onChange={(e) => setF({ ...f, repetir: e.target.value })} />
        </div>
        {aviso && <Alert tono={aviso.tono}>{aviso.texto}</Alert>}
        <Button type="submit" disabled={ocupado}>
          {ocupado ? "Cambiando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </Card>
  );
}

export default function MiCuenta() {
  const { perfil } = useAuth();
  if (!perfil) return <Cargando />;
  return (
    <Contenedor className="max-w-3xl py-12">
      <PageHeader eyebrow="Mi cuenta" titulo="Tus datos y tu contraseña" descripcion="Lo que cambies aquí se usa en todas las herramientas." />
      <div className="space-y-8">
        <Datos />
        <Clave />
      </div>
    </Contenedor>
  );
}
