import { Link, useNavigate } from "react-router-dom";
import { Alert, botonClase, Card, Eyebrow } from "@/components/ui";
import { CRITERIOS, TAXONOMIA, TIPOS, type TipoId } from "./contenido";
import { usePitch } from "./PitchContext";

const MOVIMIENTOS = [
  ["GANCHO", "Abre con tensión, no con tu nombre", "Los primeros diez segundos deciden si te escuchan o si te oyen. Empieza por el problema, un dato que incomode o una pregunta concreta. Las presentaciones se ganan el derecho a existir después del gancho, no antes.", "«El 62 % de los egresados cambia de sector en sus primeros tres años. Casi ninguno sabe explicar por qué ese cambio los hace mejores.»"],
  ["CONTEXTO", "Sitúa a quien escucha", "Quién eres o qué es el proyecto, en una frase funcional. Aquí se dice lo mínimo necesario para que el resto tenga sentido: rol, campo, alcance. Si te extiendes, gastas el reloj en lo que menos te diferencia.", "«Soy ingeniera industrial y llevo cuatro años optimizando cadenas de abastecimiento en retail.»"],
  ["NÚCLEO", "La propuesta de valor, con evidencia", "El corazón del pitch: qué haces, para quién, y por qué funciona. Es el único movimiento donde la especificidad manda. Un número real, un resultado medido o un ejemplo concreto vale más que tres adjetivos.", "«Rediseñé la ruta de despacho de 40 tiendas y bajamos el tiempo de entrega de 72 a 31 horas.»"],
  ["DIFERENCIA", "Por qué tú y no la alternativa", "Quien escucha siempre está comparando, aunque no lo diga. Nombra la alternativa —otro candidato, otra solución, el statu quo— y di qué cambia contigo. Sin este movimiento, tu pitch es intercambiable.", "«La mayoría automatiza la ruta. Nosotros rediseñamos primero el proceso, y por eso el ahorro se sostiene.»"],
  ["CIERRE", "Pide algo específico", "Un pitch que termina en «bueno, eso es todo» desperdicia todo lo anterior. Cierra con la acción concreta que quieres: una reunión, una prueba piloto, una recomendación, la siguiente pregunta. Di qué sigue y quién lo hace.", "«Me gustaría 20 minutos con su equipo de operaciones para mostrarles el modelo aplicado a su red.»"],
];

const ERRORES = [
  ["Empezar por la cronología", "«Estudié X, luego trabajé en Y, después…». Gastas el momento de mayor atención en lo que menos te diferencia."],
  ["Hablar en abstracto", "«Soluciones innovadoras», «alto impacto», «apasionado». Palabras que cualquier persona podría decir de sí misma."],
  ["Correr para que quepa", "Si necesitas acelerar, no te falta tiempo: te sobra contenido. Recortar es una decisión, no un accidente."],
  ["No pedir nada", "Terminar sin una acción concreta deja a quien escucha sin saber qué hacer con lo que acaba de oír."],
  ["Memorizar palabra por palabra", "Suena recitado y se rompe ante cualquier interrupción. Memoriza la estructura y las frases ancla, no el texto."],
  ["Ignorar a quien escucha", "El mismo pitch para un inversionista, un reclutador y un jurado académico. Los tres buscan cosas distintas."],
];

const NO_ES = [
  "Tu hoja de vida leída en voz alta o una improvisación total sin estructura previa.",
  "Un recuento cronológico de todo lo que has hecho.",
  "Una lista de funciones o características del producto.",
  "Un texto memorizado palabra por palabra, que se derrumba si te interrumpen.",
];

const FUENTES = [
  "Sabaj, O., Cabezas, P., Varas, G., González-Vergara, C., & Pina-Stranger, Á. (2020). Empirical literature on the business pitch: Classes, critiques and future trends. Journal of Technology Management & Innovation, 15(1), 55–63.",
  "Servicio Nacional de Aprendizaje (SENA). (2018). Metodología para un pitch efectivo. Dirección de Empleo y Trabajo.",
  "Vitanova, I. (2023). Emprendedores, ¿cómo lograr un buen pitch frente a sus futuros inversionistas? The Conversation.",
  "Centro de Español, Universidad de los Andes. ¿Cómo preparar un pitch? LEO — Lectura, Escritura y Oralidad.",
  "Sanchez-Ruiz, P., Wood, M. S., & Long-Ruboyianes, A. (2021). Persuasive or polarizing? The influence of entrepreneurs' use of ingratiation rhetoric on investor funding decisions. Journal of Business Venturing, 36(4).",
];

function Encabezado({ eyebrow, titulo, children }: { eyebrow: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 max-w-3xl">
      <Eyebrow className="mb-2">{eyebrow}</Eyebrow>
      <h2 className="text-3xl">{titulo}</h2>
      <p className="mt-3 text-slate-600">{children}</p>
    </div>
  );
}

export default function Aprende() {
  const { elegirTipo } = usePitch();
  const navegar = useNavigate();
  const irAEscenario = (t: TipoId) => {
    elegirTipo(t, true);
    navegar("/pitch/prepara");
  };

  return (
    <div className="space-y-20">
      <section>
        <Encabezado eyebrow="Fundamento" titulo="¿Qué es un pitch y qué no es?">
          Un pitch es una explicación breve, estructurada y hablada de una idea, un proyecto o de ti mismo, diseñada para que quien escucha entienda el valor y decida dar un paso siguiente.
        </Encabezado>
        <Alert tono="info" className="mb-10">
          <strong>Puedes practicar sin cuenta, y entonces no se guarda absolutamente nada:</strong> ni el audio, ni la transcripción, ni el reporte quedan en este navegador ni en ningún servidor. Todo existe solo mientras la pestaña está abierta y desaparece al cerrarla. Si quieres conservar tu historial y ver tu progreso entre rondas, crea una cuenta con tu correo institucional.
        </Alert>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <Card className="space-y-5">
            <p className="text-xl font-semibold leading-snug text-brand-900">
              No estás resumiendo información. Estás construyendo, en voz alta y contra el reloj, una razón para que alguien te dedique más tiempo.
            </p>
            <p>Esa es la diferencia que casi nadie hace. Un resumen busca ser completo; un pitch busca ser <strong>memorable y accionable</strong>. Por eso un buen pitch sacrifica detalle a propósito: deja fuera el 80 % de lo que sabes para que el 20 % que importa llegue intacto.</p>
            <p>Tres cosas lo definen. Es <strong>breve</strong>, porque la atención de quien escucha es el recurso escaso. Es <strong>estructurado</strong>, porque una secuencia clara reduce el esfuerzo de comprensión. Y es <strong>hablado</strong>, lo que significa que se entrena con la voz, no leyéndolo: el ritmo, las pausas y la seguridad son parte del mensaje.</p>
            <p>El objetivo nunca es cerrar en el pitch. El objetivo es ganar la siguiente conversación: la entrevista técnica, la reunión con el inversionista, la pregunta del jurado que te deja lucirte.</p>
          </Card>
          <Card className="bg-brand-50">
            <h3 className="text-lg">Un pitch no es…</h3>
            <ul className="mt-4 space-y-4">
              {NO_ES.map((t) => (
                <li key={t} className="flex gap-3 text-sm text-slate-700">
                  <span aria-hidden className="font-bold text-rose-700">×</span>
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section>
        <Encabezado eyebrow="Anatomía" titulo="Los cinco movimientos">
          Casi todo pitch efectivo, sin importar el escenario, recorre estos cinco movimientos. Cambia el contenido y el peso de cada uno, pero rara vez el orden.
        </Encabezado>
        <div className="space-y-5">
          {MOVIMIENTOS.map(([idx, titulo, texto, frase]) => (
            <Card key={idx} className="grid gap-4 sm:grid-cols-[9rem_1fr] sm:gap-8">
              <p className="text-sm font-bold tracking-[0.16em] text-brand-600">{idx}</p>
              <div>
                <h3 className="text-lg">{titulo}</h3>
                <p className="mt-2 text-slate-600">{texto}</p>
                <p className="mt-4 border-l-4 border-brand-300 pl-4 text-sm italic text-brand-800">{frase}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Encabezado eyebrow="Escenarios de práctica" titulo="Seis escenarios para ensayar">
          El mismo esqueleto, distinta carga. Lo que cambia es qué movimiento se lleva el mayor tiempo y qué espera oír quien está al frente. Cada uno viene con su guion cronometrado en la etapa Prepara.
        </Encabezado>
        <div className="grid gap-6 md:grid-cols-2">
          {(Object.entries(TIPOS) as [TipoId, (typeof TIPOS)[TipoId]][]).map(([k, t]) => (
            <Card key={k} className="flex flex-col">
              <h3 className="text-xl">{t.nombre}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-brand-600">{t.familia}</p>
              <p className="mt-3 text-slate-600">{t.desc}</p>
              <dl className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
                {[["Audiencia", t.audiencia], ["Qué buscan", t.buscan], ["Riesgo", t.riesgo]].map(([a, b]) => (
                  <div key={a} className="grid gap-1 sm:grid-cols-[6.5rem_1fr]">
                    <dt className="font-semibold text-brand-900">{a}</dt>
                    <dd className="text-slate-600">{b}</dd>
                  </div>
                ))}
              </dl>
              <button onClick={() => irAEscenario(k)} className={botonClase("secondary", "sm", "mt-6 self-start")}>
                Ensayar este escenario →
              </button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Encabezado eyebrow="Taxonomía" titulo="Los ocho tipos que reconoce la literatura">
          Sabaj y colegas (2020) clasifican el pitch según cuatro criterios: <strong>duración</strong>, <strong>audiencia</strong>, <strong>objetivo</strong> y <strong>formato</strong>. De ahí salen ocho tipos que conviene distinguir, porque confundirlos es la causa más común de un pitch que no encaja con la sala.
        </Encabezado>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-brand-50 text-xs uppercase tracking-wider text-brand-800">
              <tr>
                {["Tipo", "Qué es", "Objetivo", "Duración", "Audiencia", "Rasgo distintivo"].map((h) => (
                  <th key={h} className="px-5 py-4 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {TAXONOMIA.map((t) => (
                <tr key={t.tipo}>
                  <td className="px-5 py-4 font-semibold text-brand-900">
                    {t.practica ? (
                      <button onClick={() => irAEscenario(t.practica!)} className="text-left underline decoration-brand-300 underline-offset-4 hover:text-brand-600">
                        {t.tipo}
                      </button>
                    ) : (
                      t.tipo
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{t.que}</td>
                  <td className="px-5 py-4 text-slate-600">{t.objetivo}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-600">{t.dur}</td>
                  <td className="px-5 py-4 text-slate-600">{t.audiencia}</td>
                  <td className="px-5 py-4 text-slate-600">{t.rasgo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Alert className="mt-6">
          El <strong>pitch deck</strong> y el <strong>video pitch</strong> no son escenarios de práctica oral: el primero es el soporte visual que acompaña al discurso y el segundo es el medio por el que se entrega. Por eso esta herramienta no los cronometra, aunque el guion que armes aquí sirve de base para ambos.
        </Alert>
      </section>

      <section>
        <Encabezado eyebrow="Evaluación" titulo="Con qué criterios se juzga un pitch">
          Trece criterios tomados de la metodología del SENA (2018) y de la literatura consultada. Los primeros siete miran <strong>qué dices</strong>; los últimos seis, <strong>cómo lo dices</strong>. Cuando pidas observaciones con inteligencia artificial en la etapa Reporte, el análisis se hace contra estos mismos criterios.
        </Encabezado>
        <div className="grid gap-5 md:grid-cols-2">
          {CRITERIOS.map((c, i) => (
            <Card key={c.n} className={c.g === "forma" ? "border-brand-200 bg-brand-50/60" : ""}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base">{String(i + 1).padStart(2, "0")}. {c.n}</h3>
                <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800">{c.g === "contenido" ? "Qué dices" : "Cómo lo dices"}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{c.d}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 rounded-2xl bg-slate-100 p-6 sm:p-8">
          <h3 className="text-sm uppercase tracking-wider">Fuentes</h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
            {FUENTES.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      </section>

      <section>
        <Encabezado eyebrow="Diagnóstico" titulo="Los errores que más cuestan">
          Aparecen una y otra vez en las asesorías del CDP. Reconocerlos es la mitad del arreglo.
        </Encabezado>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ERRORES.map(([t, d]) => (
            <Card key={t}>
              <h3 className="text-base">{t}</h3>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card className="space-y-4 border-brand-200 bg-brand-50 text-sm leading-relaxed text-slate-700">
          <h2 className="text-xl">Tu información</h2>
          <p><strong>Cómo se maneja tu voz.</strong> La grabación, la medición del ritmo y todo el cálculo de las dimensiones ocurren dentro de tu navegador. <strong>El audio nunca viaja a ningún servidor, no se almacena en ninguna parte y desaparece al cerrar la pestaña</strong>, tengas cuenta o no. Esta página tampoco usa cookies de seguimiento.</p>
          <p><strong>Con una excepción que debes conocer:</strong> la transcripción automática usa el servicio de reconocimiento de voz del navegador. En Chrome y en Edge eso significa que el audio de tu voz se envía a los servidores del proveedor del navegador (Google o Microsoft respectivamente) para convertirlo en texto, igual que ocurre cuando dictas un mensaje en el teléfono. No lo controla esta página.</p>
          <p>Si prefieres que tu voz no salga de tu equipo, usa el botón <strong>«Practicar sin micrófono»</strong>: te cronometramos igual, tú escribes lo que dijiste, y el análisis de estructura, muletillas, concreción y cierre funciona exactamente igual.</p>
          <p><strong>Cómo se maneja tu cámara.</strong> Si eliges «Practicar con cámara», el análisis de encuadre, orientación, postura, movimiento y gestualidad ocurre <strong>entero dentro de tu navegador</strong>: los fotogramas se leen en memoria y se descartan de inmediato. <strong>La cámara no se graba, no se almacena, no se toman capturas y ningún video ni imagen sale de tu dispositivo, ni siquiera hacia la Universidad.</strong> Lo único que puede guardarse —y solo si tienes cuenta— son cinco cifras y dos etiquetas. A diferencia de la transcripción, aquí no interviene ningún servicio externo: el analizador se descarga a tu equipo y trabaja allí. Puedes apagar la cámara en cualquier momento terminando la ronda.</p>
          <p><strong>Sin cuenta no se guarda nada.</strong> Puedes practicar sin registrarte, y entonces ni tu transcripción ni tu reporte quedan almacenados en ninguna parte: <strong>ni en este navegador, ni en ningún servidor</strong>. Existen solo mientras la pestaña está abierta y desaparecen al cerrarla o recargarla.</p>
          <p><strong>Si creas una cuenta</strong>, con tu correo institucional @unisabana.edu.co, se almacenan en el servidor de la Universidad tu correo, tu facultad, tu programa, la recurrencia de tus accesos, el texto de tus transcripciones y las cifras de tus reportes, para que puedas ver tu progreso entre sesiones y para que el CDP entienda qué programas usan el servicio. La grabación de audio sigue sin guardarse. Puedes eliminar todo tu historial en cualquier momento desde la sección Reporte.</p>
          <p><strong>Sobre las observaciones con inteligencia artificial.</strong> En el reporte hay un botón que redacta observaciones sobre tu entrega. Las escribe un modelo de inteligencia artificial, no una plantilla: para eso se envían tus cifras, tu transcripción, tu programa académico y el resumen de tus rondas anteriores al proveedor contratado por la Universidad. <strong>El audio no se envía nunca.</strong> Solo ocurre si presionas el botón, y requiere cuenta. Las observaciones son orientación de práctica, no una evaluación académica ni un concepto oficial del CDP.</p>
        </Card>
        <div className="mt-10 text-center">
          <Link to="/pitch/prepara" className={botonClase("primary", "lg")}>Armar mi guion →</Link>
        </div>
      </section>
    </div>
  );
}
