import { Alert, Card, Eyebrow, Input, Select, botonClase, cx } from "@/components/ui";
import { AREAS_OPC, ETAPAS, OBJETIVOS_OPC, PLAT, PROGRAMAS, PROGRAMAS_OTROS } from "./datos";
import { useBorrador } from "./Borrador";
import { areaDe, contarPalabras } from "./logica";
import { Area, Aviso, Encabezado, Nota, Prosa, Tabla, Txt } from "./piezas";

/* ───────── ¿Qué es un portafolio? ───────── */
export function Intro() {
  return (
    <div className="space-y-8">
      <header>
        <Eyebrow className="mb-3">Universidad de La Sabana · Alumni Sabana</Eyebrow>
        <h2 className="max-w-[22ch] text-4xl sm:text-5xl">¿Qué es un portafolio?</h2>
        <p className="mt-6 max-w-[46ch] border-l-4 border-brand-600 pl-5 text-xl font-medium leading-snug text-brand-900">Tu hoja de vida resume lo que has hecho. Tu portafolio lo demuestra.</p>
      </header>
      <Prosa className="text-lg">
        Un portafolio profesional es una colección organizada de trabajos, proyectos, experiencias, productos y resultados que muestra de forma directa tus habilidades, tu experiencia y tus logros. No reemplaza la hoja de vida: la complementa, porque demuestra con evidencias aquello que la hoja de vida solo enuncia.
      </Prosa>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <Eyebrow className="!text-slate-500">La hoja de vida</Eyebrow>
          <h3 className="mt-1 text-xl">Resume</h3>
          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-slate-600">
            <li>Formación y titulaciones</li>
            <li>Cargos y fechas</li>
            <li>Responsabilidades y funciones</li>
            <li>Trayectoria en orden cronológico</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-brand-600 bg-brand-50 p-6">
          <Eyebrow>El portafolio</Eyebrow>
          <h3 className="mt-1 text-xl">Demuestra</h3>
          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-slate-700">
            <li>Proyectos, productos y procesos</li>
            <li>Tu rol individual y tus decisiones</li>
            <li>Competencias en acción, no adjetivos</li>
            <li>Resultados e impacto verificable</li>
          </ul>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-2xl">¿Cómo se estructura?</h3>
        <Prosa>Todo portafolio responde a cinco preguntas, en este orden. Cerca del 70 % de esta estructura es común a cualquier profesión; el resto se adapta a tu disciplina, tu audiencia y tu objetivo. Eso es justo lo que hace esta herramienta.</Prosa>
        <Tabla
          cabeza={["Sección", "Pregunta que responde", "Qué logra"]}
          filas={[
            ["1 · Identidad", "¿Quién eres?", "Que te ubiquen en menos de 30 segundos."],
            ["2 · Perfil profesional", "¿Qué puedes aportar?", "Que entiendan tus capacidades y tu enfoque."],
            ["3 · Proyectos y evidencias", "¿Cómo demuestras lo que dices?", "Que vean qué hiciste y cuál fue tu rol."],
            ["4 · Impacto", "¿Qué cambió gracias a tu trabajo?", "Que reconozcan tu aporte real."],
            ["5 · Contacto", "¿Cómo te contactan?", "Que sepan cuál es el siguiente paso."],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl">¿Cómo se reparte el espacio? 70-20-10</h3>
        <Prosa>No es una regla matemática, es un criterio de prioridad. El error más común es dedicar mucho espacio a contar quién eres y poco a mostrar lo que has hecho.</Prosa>
        <div role="img" aria-label="Distribución recomendada: 70 por ciento evidencias y proyectos, 20 por ciento perfil profesional, 10 por ciento contacto" className="flex h-24 overflow-hidden rounded-xl text-white">
          <div className="flex basis-[70%] flex-col justify-center bg-brand-900 px-4">
            <strong className="text-2xl">70 %</strong>
            <span className="text-xs sm:text-sm">Evidencias y proyectos</span>
          </div>
          <div className="flex basis-[20%] flex-col justify-center bg-brand-600 px-3">
            <strong className="text-xl">20 %</strong>
            <span className="text-xs">Perfil</span>
          </div>
          <div className="flex basis-[10%] flex-col justify-center bg-brand-300 px-2 text-brand-950">
            <strong className="text-base">10 %</strong>
            <span className="hidden text-[10px] sm:block">Contacto</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl">¿Cómo funciona esta herramienta?</h3>
        <Prosa>Cada hoja trabaja una parte: eliges tu programa, completas las cinco secciones y te llevas el texto listo para montarlo en la plataforma que prefieras. La herramienta se ajusta a las características propias de tu programa académico.</Prosa>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card className="!p-6">
            <Eyebrow>Cómo avanzar</Eyebrow>
            <h4 className="mt-1 text-lg">Once hojas</h4>
            <p className="mt-2 text-sm text-slate-600">Avanza con los botones del pie o salta directo desde el índice. Puedes volver cuando quieras.</p>
          </Card>
          <Card className="!p-6">
            <Eyebrow className="!text-slate-500">Antes de empezar</Eyebrow>
            <h4 className="mt-1 text-lg">Ten a mano</h4>
            <p className="mt-2 text-sm text-slate-600">Los trabajos, proyectos o prácticas que quieras mostrar, y los enlaces o archivos que los respaldan.</p>
          </Card>
        </div>
        <Aviso titulo="Tu portafolio se guarda solo.">
          Lo que escribas queda en tu cuenta de la Universidad, así que puedes cerrar el computador y seguir desde otro sin perder nada. Solo tú lo ves: ni siquiera el Centro de Desarrollo Profesional puede leer tu borrador.
        </Aviso>
      </section>
    </div>
  );
}

/* ───────── Tu programa ───────── */
export function Programa() {
  const { c, set, programaDeCuenta } = useBorrador();
  const a = areaDe(c);
  const libre = c.seleccion !== "" && c.seleccion.split("|")[1] === "";
  const esOtro = c.seleccion.startsWith("otro|");

  const elegir = (v: string) => {
    if (!v) return set({ seleccion: "", area: "", programa: "", facultad: "" });
    const [area, nombre = ""] = v.split("|");
    const g = PROGRAMAS.find((x) => x.programas.some((p) => p.area === area && p.nombre === nombre));
    set({ seleccion: v, area: area === "otro" ? "" : area, programa: nombre, facultad: g?.facultad ?? "" });
  };

  return (
    <div className="space-y-8">
      <Encabezado paso="Paso 1 de 6" titulo="¡Explora si los portafolios son típicos en tu programa académico!" />
      <Prosa>
        Lo que cuenta como evidencia no es igual en Derecho que en Ingeniería o en Enfermería. Elige tu programa y el resto de las hojas se ajusta: los tipos de evidencia sugeridos, los ejemplos de proyecto, las advertencias de confidencialidad, la plataforma recomendada y la lista de verificación final.
      </Prosa>
      <div className="grid gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:grid-cols-2 sm:p-8">
        <Select
          className="sm:col-span-2"
          label="Tu programa académico"
          disabled={programaDeCuenta}
          value={c.seleccion}
          onChange={(e) => elegir(e.target.value)}
          ayuda={programaDeCuenta ? "Tomado de tu cuenta." : "La herramienta se ajustará a las características de los portafolios de tu programa."}
        >
          <option value="">Selecciona tu programa…</option>
          {PROGRAMAS.map((g) => (
            <optgroup key={g.facultad} label={g.facultad}>
              {g.programas.map((p) => (
                <option key={p.etiqueta} value={`${p.area}|${p.nombre}`}>
                  {p.etiqueta}
                </option>
              ))}
            </optgroup>
          ))}
          <optgroup label="Otros">
            {PROGRAMAS_OTROS.map((p) => (
              <option key={p.area} value={`${p.area}|`}>
                {p.etiqueta}
              </option>
            ))}
            {programaDeCuenta && esOtro && <option value="otro|">{c.programa || "Otro programa"}</option>}
          </optgroup>
        </Select>
        {c.facultad && <Input label="Facultad o escuela" readOnly value={c.facultad} ayuda={programaDeCuenta ? "Tomada de tu cuenta." : "Se completa según el programa que elegiste."} />}
        {libre && <Input label="Nombre de tu programa" readOnly={programaDeCuenta} placeholder="Escríbelo tal como quieres que aparezca" value={c.programa} onChange={(e) => set({ programa: e.target.value })} />}
        {esOtro && (
          <Select label="Área más cercana" value={c.area} onChange={(e) => set({ area: e.target.value })}>
            <option value="">Elige un área…</option>
            {AREAS_OPC.map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </Select>
        )}
        <Select label="Tu etapa" value={c.etapa} onChange={(e) => set({ etapa: e.target.value })}>
          {ETAPAS.map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </Select>
        <Select label="Objetivo del portafolio" value={c.objetivo} onChange={(e) => set({ objetivo: e.target.value })}>
          {OBJETIVOS_OPC.map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </Select>
        <Txt k="audiencia" label="¿Quién lo va a leer?" placeholder="Ej.: reclutadores de agencias de comunicación" className="sm:col-span-2" />
      </div>
      <Nota titulo={a ? c.programa || a.label : "Aún sin seleccionar"}>{a ? a.intro : "Elige tu programa para que la herramienta se ajuste a las características de los portafolios de tu disciplina."}</Nota>
    </div>
  );
}

const SIN_PROGRAMA = "Vuelve a la hoja «Tu programa» y elige tu programa para ver";

/* ───────── 1 · Identidad ───────── */
export function Identidad() {
  const { c } = useBorrador();
  const n = contarPalabras(c.valor);
  return (
    <div className="space-y-8">
      <Encabezado paso="Paso 2 de 6 · Sección 1" titulo="Identidad" pregunta="¿Quién eres?" />
      <Prosa>Máximo tres o cuatro líneas. Quien abre tu portafolio debe entender quién eres y hacia dónde vas de inmediato. La fotografía profesional es opcional y no todos los portafolios la necesitan.</Prosa>
      <Aviso titulo="La propuesta de valor">
        tiene entre 10 y 12 palabras. No es tu cargo: expresa qué haces, sobre qué necesidad trabajas o qué valor generas. Estructura útil: <em>Profesional en [campo] que [acción o capacidad] para [público, problema o resultado].</em> Evita "apasionado", "innovador" o "destacado" si no tienes cómo demostrarlo.
      </Aviso>
      <div className="grid gap-6 sm:grid-cols-2">
        <Txt k="nombre" label="Nombre completo" placeholder="Como quieres que te nombren profesionalmente" />
        <Txt k="campo" label="Campo de desempeño" placeholder="Ej.: comunicación estratégica, ingeniería de procesos" />
        <div className="sm:col-span-2">
          <Area
            k="valor"
            label="Propuesta de valor"
            rows={2}
            placeholder="Profesional en [campo] que [acción o capacidad] para [público, problema o resultado]."
            extra={<p className={cx("mt-1.5 text-xs", n >= 10 && n <= 12 ? "font-medium text-emerald-700" : "text-slate-500")}>{n} palabras · recomendado entre 10 y 12.</p>}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────── 2 · Perfil profesional ───────── */
export function Perfil() {
  const { c } = useBorrador();
  const a = areaDe(c);
  return (
    <div className="space-y-8">
      <Encabezado paso="Paso 3 de 6 · Sección 2" titulo="Perfil profesional" pregunta="¿Qué puedes aportar?" />
      <Prosa>Entre cuatro y seis líneas, orientadas al valor, no una autobiografía. El orden que mejor funciona: quién eres y cuál es tu enfoque, qué sabes hacer, qué herramientas usas, qué logro o certificación te fortalece y qué te diferencia en tu forma de trabajar.</Prosa>
      <Nota titulo={a ? "Qué destacar en tu perfil" : "Sugerencia para tu programa"}>{a ? a.perfil : `${SIN_PROGRAMA} qué conviene destacar aquí.`}</Nota>
      <div className="space-y-6">
        <Area k="perfil" label="Perfil profesional" rows={5} placeholder="Escribe en primera persona, con verbos de acción y sin frases vacías." />
        <div className="grid gap-6 sm:grid-cols-2">
          <Area k="capacidades" label="Capacidades principales" placeholder="Una por línea. Formúlalas como capacidades demostradas, no como adjetivos." />
          <Area k="herramientas" label="Herramientas o metodologías" ayuda="Incluye niveles de dominio solo si puedes sustentarlos." placeholder="Una por línea. Máximo 6 a 8." />
        </div>
        <Txt k="formacion" label="Formación, curso o certificación relevante" placeholder="Solo lo que puedas respaldar con evidencia" />
      </div>
    </div>
  );
}

/* ───────── 4 · Impacto ───────── */
export function Impacto() {
  const { c } = useBorrador();
  const a = areaDe(c);
  return (
    <div className="space-y-8">
      <Encabezado paso="Paso 5 de 6 · Sección 4" titulo="Impacto" pregunta="¿Qué cambió gracias a tu trabajo?" />
      <Prosa>El impacto suele funcionar mejor dentro de cada proyecto. Usa esta hoja solo si tienes logros transversales que no pertenecen a un único trabajo: reconocimientos, publicaciones, certificaciones o resultados acumulados.</Prosa>
      <Nota titulo={a ? "Cómo se mide el impacto en tu área" : "Cómo se mide en tu programa"}>{a ? a.impacto : `${SIN_PROGRAMA} qué tipo de resultado es el pertinente.`}</Nota>
      <Aviso titulo="Si no tienes cifras, no las inventes.">
        Pregúntate: ¿qué cambió después de mi intervención? ¿cuántas personas o áreas participaron? ¿qué producto quedó implementado? ¿qué retroalimentación recibí? ¿mi trabajo fue aprobado, publicado, utilizado o presentado? Un resultado cualitativo verificable vale más que un porcentaje inventado.
      </Aviso>
      <div className="space-y-6">
        <Area k="logros" label="Logros, reconocimientos o publicaciones" placeholder="Uno por línea. Solo lo que puedas sustentar." />
        <Area k="testimonio" label="Testimonio o recomendación (autorizado)" rows={2} placeholder="Breve, con nombre y cargo de quien lo emite, y con su autorización." />
      </div>
    </div>
  );
}

/* ───────── 5 · Contacto ───────── */
export function Contacto() {
  const { c } = useBorrador();
  const a = areaDe(c);
  return (
    <div className="space-y-8">
      <Encabezado paso="Paso 6 de 6 · Sección 5" titulo="Contacto" pregunta="¿Cómo te contactan y qué esperas que hagan?" />
      <Prosa>Máximo tres o cuatro líneas, con canales pertinentes y un llamado a la acción que corresponda a tu objetivo. Usa datos profesionales y evita información personal innecesaria.</Prosa>
      <Nota titulo={a ? "Canales que se esperan en tu área" : "Canales para tu programa"}>{a ? a.contacto : `${SIN_PROGRAMA} qué canales conviene incluir.`}</Nota>
      <div className="grid gap-6 sm:grid-cols-2">
        <Txt k="correo" type="email" label="Correo profesional" placeholder="nombre@correo.com" />
        <Txt k="linkedin" label="LinkedIn" placeholder="linkedin.com/in/tu-perfil" />
        <Txt k="otro" label="Otro canal pertinente" placeholder="GitHub, Behance, sitio web, perfil académico" />
        <Txt k="cta" label="Llamado a la acción" placeholder="Conversemos sobre oportunidades en…" />
      </div>
    </div>
  );
}

/* ───────── ¿Dónde publicarlo? ───────── */
export function Plataformas() {
  const { c } = useBorrador();
  const a = areaDe(c);
  const claves = a ? a.plat : Object.keys(PLAT);
  return (
    <div className="space-y-8">
      <Encabezado paso="Formato" titulo="¿Dónde publicarlo?" />
      <Prosa>Elige según el tipo de evidencia que vas a mostrar y el tiempo que puedas dedicarle. Ninguna plataforma reemplaza el contenido: verifica siempre las funciones y condiciones vigentes al momento de crear tu cuenta.</Prosa>
      <Nota titulo={a ? `Recomendación para ${c.programa || a.label}` : "Recomendación"}>
        {a ? "Estas tres se ajustan al tipo de evidencia de tu programa. La primera es la que mejor encaja." : "Elige tu programa para ver cuál se ajusta mejor a tus evidencias."}
      </Nota>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {claves.map((k, i) => {
          const p = PLAT[k];
          const rec = a && i === 0;
          return (
            <div key={k} className={cx("flex flex-col rounded-2xl border bg-white p-6", rec ? "border-2 border-brand-600 shadow-card" : "border-slate-200")}>
              {rec && <span className="mb-3 w-fit rounded-full bg-brand-900 px-2.5 py-0.5 text-xs font-semibold text-white">Recomendada para tu área</span>}
              <h3 className="text-lg">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 hover:underline">
                  {p.n} <span aria-hidden>↗</span>
                  <span className="sr-only">(se abre en una pestaña nueva)</span>
                </a>
              </h3>
              <dl className="mt-4 space-y-2 text-sm">
                {(
                  [
                    ["Para", p.para],
                    ["Ventaja", p.ven],
                    ["Límite", p.lim],
                    ["Edición", p.ed],
                    ["Prepara", p.prep],
                  ] as const
                ).map(([t, v]) => (
                  <div key={t}>
                    <dt className="font-semibold text-brand-900">{t}</dt>
                    <dd className="text-slate-600">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── Hablar con un asesor ───────── */
export function Asesor() {
  return (
    <div className="space-y-8">
      <Encabezado paso="Acompañamiento" titulo="Hablar con un asesor" />
      <Prosa>
        Si necesitas revisión especializada de tu portafolio, orientación sobre una decisión de carrera o tienes dudas que esta herramienta no resuelve, escríbenos a{" "}
        <a className="font-medium text-brand-600 underline" href="mailto:desarrolloprofesional@unisabana.edu.co">
          desarrolloprofesional@unisabana.edu.co
        </a>
        . Incluye una descripción breve de tu necesidad y, si corresponde, adjunta la versión de tu portafolio que quieres revisar.
      </Prosa>
      <a href="mailto:desarrolloprofesional@unisabana.edu.co" className={botonClase("primary", "lg")}>
        Escribir al Centro
      </a>
      <Alert tono="warn" className="max-w-prose">
        <b>Sobre el uso de inteligencia artificial:</b> puede ayudarte a redactar borradores y estructuras, pero no debe inventar experiencia. Todo texto generado debe reflejar tu voz y tu trayectoria reales, las evidencias las aportas tú, y el resultado siempre requiere tu revisión antes de publicarlo.
      </Alert>
    </div>
  );
}
