import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { botonClase, Contenedor, Eyebrow } from "@/components/ui";

const HERRAMIENTAS = [
  {
    to: "/portafolio",
    etiqueta: "Evidencia",
    titulo: "Construye tu portafolio profesional",
    texto:
      "Tu hoja de vida resume lo que has hecho; tu portafolio lo demuestra. Te guiamos por las cinco secciones, con ejemplos y evidencia adaptados a tu programa, y lo descargas en PDF.",
    puntos: ["Cinco secciones guiadas", "Ejemplos según tu programa", "Revisión con IA antes de publicar", "Se guarda en tu cuenta"],
    cta: "Abrir el portafolio",
    icono: <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />,
  },
  {
    to: "/pitch",
    etiqueta: "Presencia",
    titulo: "Estudio de Pitch",
    texto:
      "Practica tu pitch en voz alta contra el reloj y recibe un reporte con lo que se puede medir: duración, ritmo, fluidez, estructura, concreción, cierre y presencia visual.",
    puntos: ["Reporte inmediato", "Muletillas y ritmo", "Práctica con cámara opcional", "El audio nunca se almacena"],
    cta: "Practicar mi pitch",
    icono: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
  },
];

const PASOS = [
  { n: "1", t: "Crea tu cuenta", d: "Con tu correo @unisabana.edu.co. Un solo acceso sirve para todas las herramientas." },
  { n: "2", t: "Trabaja a tu ritmo", d: "Escribe tu portafolio por secciones o ensaya tu pitch cuantas veces quieras." },
  { n: "3", t: "Mejora con datos", d: "Compara tus rondas, revisa las observaciones y llega a la asesoría con algo concreto." },
];

export default function Inicio() {
  const { session, perfil } = useAuth();
  const nombre = perfil?.nombre?.split(" ")[0];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_85%_-10%,var(--color-brand-600),transparent_60%),radial-gradient(40rem_24rem_at_0%_110%,var(--color-brand-700),transparent_60%)]" />
        <svg aria-hidden className="absolute right-0 top-10 -z-10 hidden w-[34rem] opacity-25 lg:block" viewBox="0 0 400 200" fill="none">
          <path d="M20 60h250" stroke="var(--color-brand-300)" strokeWidth="6" strokeLinecap="round" />
          <path d="M60 36l260-12" stroke="var(--color-brand-400)" strokeWidth="6" strokeLinecap="round" />
          <path d="M100 12L360 4" stroke="var(--color-brand-200)" strokeWidth="6" strokeLinecap="round" />
        </svg>

        <Contenedor className="pb-36 pt-20 sm:pt-28">
          <Eyebrow className="!text-brand-300">Centro de Desarrollo Profesional · Alumni</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl leading-[1.1] text-white sm:text-6xl">
            {session && nombre ? (
              <>Hola, {nombre}. Sigue construyendo tu perfil profesional.</>
            ) : (
              <>Prepárate con las herramientas del Centro de Desarrollo Profesional.</>
            )}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-100">
            Dos herramientas de acceso abierto para la comunidad de La Sabana: una para construir la evidencia de lo que has hecho, otra para aprender a contarlo en voz alta.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {session ? (
              <Link to="/portafolio" className={botonClase("onDark", "lg")}>
                Continuar mi portafolio
              </Link>
            ) : (
              <>
                <Link to="/registro" className={botonClase("onDark", "lg")}>
                  Crear mi cuenta
                </Link>
                <Link to="/ingresar" className={botonClase("ghost", "lg", "border border-white/30 text-white hover:bg-white/10 hover:text-white")}>
                  Ya tengo cuenta
                </Link>
              </>
            )}
          </div>
        </Contenedor>
      </section>

      <Contenedor className="-mt-24 grid gap-6 lg:grid-cols-2">
        {HERRAMIENTAS.map((h) => (
          <article key={h.to} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lift sm:p-10">
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-900 text-white">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {h.icono}
                </svg>
              </span>
              <Eyebrow>{h.etiqueta}</Eyebrow>
            </div>
            <h2 className="mt-6 text-2xl sm:text-3xl">{h.titulo}</h2>
            <p className="mt-4 text-slate-600">{h.texto}</p>
            <ul className="mt-6 grid gap-x-6 gap-y-3 text-sm text-slate-700 sm:grid-cols-2">
              {h.puntos.map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-brand-600" fill="currentColor" aria-hidden>
                    <path d="M7.6 13.4 4.2 10l-1.2 1.2 4.6 4.6L17 6.4 15.8 5.2z" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-2">
              <Link to={h.to} className={botonClase("primary", "lg")}>
                {h.cta}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </article>
        ))}
      </Contenedor>

      <Contenedor className="mt-28">
        <div className="max-w-2xl">
          <Eyebrow>Cómo funciona</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">Tres pasos, una sola cuenta</h2>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {PASOS.map((p) => (
            <li key={p.n} className="rounded-2xl border border-slate-200 bg-white p-7">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-800">{p.n}</span>
              <h3 className="mt-5 text-lg">{p.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{p.d}</p>
            </li>
          ))}
        </ol>
      </Contenedor>

      <Contenedor className="mt-20">
        <div className="rounded-2xl bg-brand-50 px-8 py-10 sm:px-12">
          <h2 className="text-2xl">Tu información es tuya</h2>
          <p className="mt-3 max-w-3xl text-slate-700">
            La grabación de audio nunca se envía ni se almacena. Lo que escribes en tu portafolio solo lo lee quien lo escribe; el Centro ve únicamente cifras de avance. Las observaciones con inteligencia artificial se generan solo cuando tú las pides.
          </p>
        </div>
      </Contenedor>
    </>
  );
}
