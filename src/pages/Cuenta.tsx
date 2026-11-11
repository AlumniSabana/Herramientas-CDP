import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Alert, Button, Card, Contenedor, Input, Select } from "@/components/ui";
import { DOMINIO, FACULTADES, URL_POLITICA } from "@/lib/catalogo";
import { mensajeDeError, supabaseConfigurado } from "@/lib/supabase";

/* ───────── Marco común: panel institucional + formulario ───────── */
function Marco({ titulo, subtitulo, children, pie }: { titulo: string; subtitulo?: string; children: ReactNode; pie?: ReactNode }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (session) return <Navigate to={(loc.state as { desde?: string } | null)?.desde ?? "/"} replace />;

  return (
    <Contenedor className="grid gap-10 py-12 lg:grid-cols-[1fr_1.15fr] lg:py-20">
      <aside className="relative hidden overflow-hidden rounded-3xl bg-brand-900 p-10 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute inset-0 bg-[radial-gradient(30rem_24rem_at_100%_0%,var(--color-brand-600),transparent_65%)]" />
        <svg aria-hidden className="absolute left-8 top-10 w-64 opacity-30" viewBox="0 0 300 80" fill="none">
          <path d="M10 50h190" stroke="var(--color-brand-300)" strokeWidth="5" strokeLinecap="round" />
          <path d="M40 30l200-9" stroke="var(--color-brand-400)" strokeWidth="5" strokeLinecap="round" />
          <path d="M70 10l200-6" stroke="var(--color-brand-200)" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div className="relative">
          <h2 className="text-3xl leading-tight text-white">Una cuenta para todas las herramientas del Centro.</h2>
          <p className="mt-4 text-brand-100">Guarda tu portafolio, tu historial de práctica y vuelve a ellos desde cualquier equipo.</p>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-3xl sm:text-4xl">{titulo}</h1>
        {subtitulo && <p className="mt-3 text-slate-600">{subtitulo}</p>}
        {!supabaseConfigurado && (
          <Alert tono="warn" className="mt-6">
            Falta configurar Supabase: copia <code>.env.example</code> a <code>.env</code> y completa la URL y la clave publicable.
          </Alert>
        )}
        <Card className="mt-8">{children}</Card>
        {pie && <p className="mt-6 text-center text-sm text-slate-600">{pie}</p>}
      </div>
    </Contenedor>
  );
}

/** Ejecuta una acción de cuenta mostrando el error en español. */
function useEnvio() {
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const enviar = async (fn: () => Promise<void>) => {
    setError("");
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };
  return { error, setError, ocupado, enviar };
}

const enlace = "font-semibold text-brand-700 underline-offset-4 hover:underline";

/* ───────── Ingresar ───────── */
export function Ingresar() {
  const { ingresar } = useAuth();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const { error, ocupado, enviar } = useEnvio();

  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(() => ingresar(correo, clave));
  };

  return (
    <Marco
      titulo="Ingresa a tu cuenta"
      subtitulo="Usa tu correo institucional."
      pie={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link to="/registro" className={enlace}>
            Créala aquí
          </Link>
        </>
      }
    >
      <form onSubmit={alEnviar} className="space-y-5">
        <Input label="Correo institucional" type="email" autoComplete="email" required placeholder={`nombre.apellido${DOMINIO}`} value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <Input label="Contraseña" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
        {error && <Alert tono="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={ocupado}>
          {ocupado ? "Ingresando…" : "Ingresar"}
        </Button>
        <p className="text-center text-sm">
          <Link to="/recuperar" className={enlace}>
            Olvidé mi contraseña
          </Link>
        </p>
      </form>
    </Marco>
  );
}

/* ───────── Registro (dos pasos: datos y código) ───────── */
export function Registro() {
  const { registrar, verificarRegistro, reenviarCodigo } = useAuth();
  const navegar = useNavigate();
  const [paso, setPaso] = useState<"datos" | "codigo">("datos");
  const [f, setF] = useState({ nombre: "", facultad: "", programa: "", correo: "", clave: "", acuerdo: false });
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState("");
  const { error, setError, ocupado, enviar } = useEnvio();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((a) => ({ ...a, [k]: v }));

  const alRegistrar = (e: FormEvent) => {
    e.preventDefault();
    if (!f.correo.trim().toLowerCase().endsWith(DOMINIO)) return setError(`El correo debe terminar en ${DOMINIO}.`);
    if (f.clave.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (!f.acuerdo) return setError("Para crear la cuenta debes aceptar el acuerdo de confidencialidad y tratamiento de datos.");
    void enviar(async () => {
      await registrar(f);
      setPaso("codigo");
    });
  };

  const alVerificar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(async () => {
      await verificarRegistro(f.correo, codigo);
      navegar("/", { replace: true });
    });
  };

  if (paso === "codigo") {
    return (
      <Marco titulo="Confirma tu correo" subtitulo={`Enviamos un código de verificación a ${f.correo}.`}>
        <form onSubmit={alVerificar} className="space-y-5">
          <Input label="Código de verificación" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} value={codigo} onChange={(e) => setCodigo(e.target.value)} ayuda="Revisa también la carpeta de correo no deseado." />
          {error && <Alert tono="error">{error}</Alert>}
          {aviso && <Alert tono="ok">{aviso}</Alert>}
          <Button type="submit" size="lg" className="w-full" disabled={ocupado}>
            {ocupado ? "Verificando…" : "Verificar y entrar"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={ocupado}
            onClick={() =>
              void enviar(async () => {
                await reenviarCodigo(f.correo);
                setAviso("Te enviamos un código nuevo.");
              })
            }
          >
            Reenviar código
          </Button>
        </form>
      </Marco>
    );
  }

  return (
    <Marco
      titulo="Crea tu cuenta"
      subtitulo="Con tu correo institucional. Un solo registro sirve para todas las herramientas."
      pie={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link to="/ingresar" className={enlace}>
            Ingresa
          </Link>
        </>
      }
    >
      <form onSubmit={alRegistrar} className="space-y-5">
        <Input label="Nombre completo" autoComplete="name" required value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Facultad" required value={f.facultad} onChange={(e) => setF((a) => ({ ...a, facultad: e.target.value, programa: "" }))}>
            <option value="">Selecciona…</option>
            {Object.keys(FACULTADES).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Select label="Programa" required disabled={!f.facultad} value={f.programa} onChange={(e) => set("programa", e.target.value)}>
            <option value="">Selecciona…</option>
            {(FACULTADES[f.facultad] ?? []).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </div>
        <Input label="Correo institucional" type="email" autoComplete="email" required placeholder={`nombre.apellido${DOMINIO}`} value={f.correo} onChange={(e) => set("correo", e.target.value)} />
        <Input label="Contraseña" type="password" autoComplete="new-password" required minLength={8} ayuda="Mínimo 8 caracteres." value={f.clave} onChange={(e) => set("clave", e.target.value)} />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-slate-700">
          <input type="checkbox" className="mt-1 size-4 shrink-0 accent-brand-700" checked={f.acuerdo} onChange={(e) => set("acuerdo", e.target.checked)} />
          <span className="space-y-2">
            <span className="block">
              Autorizo a la Universidad de La Sabana, a través del <strong>Centro de Desarrollo Profesional</strong>, a almacenar y tratar mis datos de uso, la recurrencia de acceso, las transcripciones de mis prácticas, las retroalimentaciones ofrecidas y las cifras de mis reportes, con el fin de mostrarme mi progreso y elaborar estadísticas agregadas del servicio.
            </span>
            <span className="block">
              Entiendo que el audio no se almacena ni se envía a servidores; que las observaciones con inteligencia artificial se generan únicamente cuando las solicito; que la información es <strong>confidencial</strong> y no se comparte con docentes, empleadores ni terceros, salvo obligación legal; y que puedo consultar, corregir o solicitar la eliminación de mis datos conforme a la{" "}
              <a href={URL_POLITICA} target="_blank" rel="noopener noreferrer" className={enlace}>
                Política de Tratamiento de Datos Personales
              </a>{" "}
              de la Universidad.
            </span>
          </span>
        </label>

        {error && <Alert tono="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={ocupado}>
          {ocupado ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </Marco>
  );
}

/* ───────── Recuperar contraseña ───────── */
export function Recuperar() {
  const { pedirRecuperacion, restablecer } = useAuth();
  const navegar = useNavigate();
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const { error, ocupado, enviar } = useEnvio();

  return (
    <Marco
      titulo="Recupera tu contraseña"
      subtitulo={paso === "correo" ? "Te enviaremos un código a tu correo institucional." : `Escribe el código que enviamos a ${correo} y tu nueva contraseña.`}
      pie={
        <Link to="/ingresar" className={enlace}>
          Volver a ingresar
        </Link>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(async () => {
            if (paso === "correo") {
              await pedirRecuperacion(correo);
              setPaso("codigo");
            } else {
              await restablecer(correo, codigo, clave);
              navegar("/", { replace: true });
            }
          });
        }}
      >
        {paso === "correo" ? (
          <Input label="Correo institucional" type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        ) : (
          <>
            <Input label="Código" inputMode="numeric" autoComplete="one-time-code" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <Input label="Nueva contraseña" type="password" autoComplete="new-password" required minLength={8} ayuda="Mínimo 8 caracteres." value={clave} onChange={(e) => setClave(e.target.value)} />
          </>
        )}
        {error && <Alert tono="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={ocupado}>
          {ocupado ? "Enviando…" : paso === "correo" ? "Enviar código" : "Cambiar contraseña"}
        </Button>
      </form>
    </Marco>
  );
}
