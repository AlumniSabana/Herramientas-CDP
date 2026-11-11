// Contenido por programa, plataformas y listas de verificación. Portado tal cual de la
// herramienta anterior (legacy/src/portafolio/app.js): los textos son del CDP, no los toques sin él.

export type Plataforma = { url: string; n: string; para: string; ven: string; lim: string; ed: string; prep: string };

export type Area = {
  label: string;
  intro: string;
  estudiante: string[];
  graduado: string[];
  perfil: string;
  impacto: string;
  contacto: string;
  aviso: string;
  plat: string[];
  check: string[];
  ph: string;
};

export const PLAT: Record<string, Plataforma> = {
  wix:     { url: "https://www.wix.com/studio", n: "Wix Studio",       para: "Portafolios web completos con varias secciones y proyectos.", ven: "Control amplio del diseño y del sitio.", lim: "Requiere más tiempo de montaje.", ed: "Media a alta.", prep: "Textos, imágenes de proyectos y enlaces." },
  carrd:   { url: "https://carrd.co", n: "Carrd",            para: "Portafolio de una sola página, directo al punto.",            ven: "Se publica muy rápido.",                lim: "Poco espacio para proyectos extensos.", ed: "Baja.", prep: "Propuesta de valor, 2 o 3 proyectos y contacto." },
  notion:  { url: "https://www.notion.com", n: "Notion",           para: "Portafolios con mucho texto, documentación y procesos.",      ven: "Fácil de actualizar y organizar por bloques.", lim: "Identidad visual limitada.", ed: "Baja.", prep: "Fichas de proyecto y enlaces a evidencias." },
  canva:   { url: "https://www.canva.com", n: "Canva",            para: "Portafolio en documento o presentación descargable.",         ven: "Plantillas listas y exportación a PDF.", lim: "Menos apropiado para material interactivo.", ed: "Baja a media.", prep: "Textos definitivos e imágenes en buena resolución." },
  behance: { url: "https://www.behance.net", n: "Behance",          para: "Perfiles creativos y visuales con proyectos por caso.",       ven: "Comunidad y visibilidad en el sector.", lim: "Estructura fija, poca personalización.", ed: "Baja.", prep: "Imágenes de alta calidad y descripción de cada caso." },
  adobe:   { url: "https://portfolio.adobe.com", n: "Adobe Portfolio",  para: "Portafolios visuales con sitio propio.",                      ven: "Presentación cuidada del material gráfico.", lim: "Asociado al ecosistema Adobe.", ed: "Media.", prep: "Series de imágenes y textos de cada proyecto." },
  github:  { url: "https://github.com", n: "GitHub",           para: "Perfiles técnicos: código, documentación y software.",        ven: "La evidencia es el trabajo mismo.", lim: "Poco legible para audiencias no técnicas.", ed: "Media.", prep: "Repositorios ordenados y un README por proyecto." }
};

/* Adaptación por área del conocimiento */
export const AREAS: Record<string, Area> = {
  eco: {
    label: "Ciencias Económicas, Administrativas y Negocios",
    intro: "En negocios el portafolio se lee buscando decisiones y resultados. Prioriza los proyectos donde puedas explicar qué analizaste, qué decidiste y qué pasó después, con cifras cuando existan.",
    estudiante: ["Casos de estudio", "Simulaciones de negocio", "Planes de mercadeo", "Prácticas empresariales", "Competencias de casos", "Retos académicos", "Emprendimientos", "Análisis de mercado"],
    graduado: ["Estudios de caso", "Campañas ejecutadas", "Apertura de mercados", "Mejoras de procesos", "Proyectos de servicio", "Resultados comerciales", "Decisiones estratégicas"],
    perfil: "Destaca el tipo de decisión que sabes tomar y el sector en el que la has tomado. Las herramientas de análisis y visualización de datos pesan aquí.",
    impacto: "Prioriza resultados cuantificables cuando existan: variación de ventas, ahorro, tiempos, participación de mercado. Si no los tienes, describe la decisión que se tomó a partir de tu análisis.",
    contacto: "LinkedIn es el canal principal. Añade un sitio o documento con tus casos.",
    aviso: "Si trabajaste con datos reales de una empresa, sustituye las cifras por rangos o porcentajes de variación y pide autorización antes de publicar.",
    plat: ["notion", "wix", "canva"],
    check: ["Los resultados comerciales que reporto son verificables o están expresados como rangos.", "Tengo autorización para usar los datos de la empresa que menciono."],
    ph: "Ej.: Plan de entrada a un mercado regional para una marca de consumo masivo"
  },
  gas: {
    label: "Gastronomía",
    intro: "Tu portafolio es visual y sensorial, pero no puede quedarse en fotos bonitas: cada plato necesita el proceso y la decisión detrás.",
    estudiante: ["Platos y menús", "Procesos de creación", "Registros visuales", "Prácticas en cocina", "Experiencias de servicio", "Costeo de recetas"],
    graduado: ["Menús desarrollados", "Conceptos de restaurante", "Experiencias de servicio", "Estandarización de procesos", "Aportes de la gastronomía a otros campos", "Resultados de operación"],
    perfil: "Define tu cocina: técnica, producto, territorio o concepto. Nombra las estaciones y procesos que dominas.",
    impacto: "Habla de rotación de menú, costo por plato, satisfacción del comensal, aceptación del concepto o reconocimiento recibido.",
    contacto: "Instagram profesional o sitio visual, junto con el correo. LinkedIn si buscas operación o gestión.",
    aviso: "Cuida los derechos sobre las fotografías y las recetas desarrolladas dentro de un establecimiento: pide autorización antes de publicarlas.",
    plat: ["behance", "canva", "adobe"],
    check: ["Las fotografías que publico son mías o cuento con autorización.", "Cada plato incluye el proceso o la decisión creativa, no solo la imagen."],
    ph: "Ej.: Menú de temporada con producto local para un restaurante de 40 puestos"
  },
  com: {
    label: "Comunicación",
    intro: "Aquí la pieza es la evidencia. Muestra el producto terminado, pero acompáñalo del objetivo de comunicación y del público al que iba dirigido.",
    estudiante: ["Notas y reportajes", "Videos y podcasts", "Guiones", "Piezas gráficas", "Contenidos digitales", "Proyectos multimedia", "Prácticas en medios o agencias"],
    graduado: ["Campañas ejecutadas", "Estrategias de comunicación", "Producciones audiovisuales", "Gestión de medios", "Contenidos con resultados de alcance", "Proyectos de comunicación organizacional"],
    perfil: "Especifica en qué formatos trabajas y para qué tipo de audiencia. Nombra el software de edición y las plataformas que manejas.",
    impacto: "Alcance, engagement, publicación en un medio, cobertura obtenida o cambio en la percepción del público. Si el dato no es público, describe el resultado sin cifra.",
    contacto: "Enlace directo al portafolio visual y a tus piezas publicadas. LinkedIn y correo profesional.",
    aviso: "Verifica los derechos sobre música, imágenes y material de archivo antes de publicar tus piezas, y acredita al equipo cuando el trabajo fue colectivo.",
    plat: ["behance", "adobe", "wix"],
    check: ["Cada pieza indica cuál fue mi rol dentro del equipo.", "Tengo los derechos o las autorizaciones del material que publico."],
    ph: "Ej.: Campaña de comunicación interna para una organización de 300 empleados"
  },
  der: {
    label: "Derecho, Ciencia Política y Relaciones Internacionales",
    intro: "Tu portafolio demuestra criterio jurídico y calidad argumentativa. La confidencialidad no es opcional: define qué puedes mostrar antes de escribir.",
    estudiante: ["Escritos de investigación", "Análisis de casos", "Moot courts", "Consultorios jurídicos", "Simulaciones", "Ponencias", "Contenidos educativos"],
    graduado: ["Documentos de política", "Conceptos y análisis jurídicos", "Litigios y procesos (anonimizados)", "Proyectos de comunicación estratégica", "Publicaciones", "Participación en instancias o mesas técnicas"],
    perfil: "Precisa tus áreas del derecho o de la política y el tipo de documento que produces. La claridad argumentativa es tu principal carta.",
    impacto: "Decisión obtenida, concepto acogido, norma o política influida, publicación del texto, o el alcance del caso. Nunca reveles detalles reservados.",
    contacto: "Correo profesional y LinkedIn. Añade repositorio académico si publicas.",
    aviso: "Anonimiza todos los casos, omite nombres de partes y no presentes información sometida a reserva. Ante la duda, describe el problema jurídico sin el caso concreto.",
    plat: ["notion", "canva", "carrd"],
    check: ["Todos los casos están anonimizados y sin datos de las partes.", "No incluí información sometida a reserva ni documentos internos."],
    ph: "Ej.: Concepto jurídico sobre contratación estatal para una entidad territorial"
  },
  edu: {
    label: "Educación",
    intro: "Tu portafolio no debe limitarse a mostrar productos: lo que más pesa es evidenciar cómo analizas tu práctica y cómo la mejoras.",
    estudiante: ["Práctica pedagógica", "Planeación de clase", "Intervenciones de aula", "Material didáctico", "Tecnología educativa", "Reflexión sobre la práctica"],
    graduado: ["Diseño curricular", "Proyectos de aula sostenidos", "Gestión educativa", "Formación de docentes", "Innovación pedagógica", "Testimonios autorizados de la comunidad educativa"],
    perfil: "Nombra el nivel educativo, las áreas que enseñas y tu enfoque pedagógico. Las metodologías que aplicas son tan importantes como las herramientas.",
    impacto: "Aprendizajes logrados, cambio observado en los estudiantes, adopción de tu material por otros docentes, o mejora sostenida en tu práctica.",
    contacto: "Correo profesional y LinkedIn. Un repositorio de material propio suma mucho.",
    aviso: "No publiques imágenes, nombres ni trabajos de menores de edad sin autorización expresa de sus acudientes y de la institución.",
    plat: ["notion", "canva", "wix"],
    check: ["Evidencio no solo qué hice, sino cómo analicé y mejoré mi práctica.", "Cuento con autorización para toda imagen o trabajo de estudiantes."],
    ph: "Ej.: Secuencia didáctica de lectura inicial para transición"
  },
  vid: {
    label: "Ciencias de la Vida y el Bienestar",
    intro: "Tu portafolio documenta competencias de cuidado y de intervención, no historias de pacientes. Muestra cómo valoras, cómo decides y cómo educas, siempre sin datos identificables.",
    estudiante: ["Prácticas clínicas y rotaciones", "Planes de cuidado o de intervención", "Estudios de caso anonimizados", "Proyectos de educación en salud", "Infografías y material para pacientes", "Proyectos comunitarios", "Reflexión sobre la práctica"],
    graduado: ["Programas de educación en salud", "Proyectos de mejora asistencial", "Protocolos y guías adoptadas", "Investigación y publicaciones", "Docencia clínica", "Certificaciones vigentes", "Intervención comunitaria"],
    perfil: "Precisa tu área de práctica, las poblaciones que atiendes y las escalas, técnicas o protocolos que manejas. Distingue lo certificado de lo practicado.",
    impacto: "Adherencia lograda, funcionalidad recuperada, población alcanzada por un programa educativo, protocolo adoptado o resultado del proyecto de mejora. Nunca resultados individuales de un paciente identificable.",
    contacto: "Correo profesional y LinkedIn. Perfil académico si publicas o participas en investigación.",
    aviso: "No incluyas información identificable de pacientes bajo ninguna circunstancia: ni nombres, ni imágenes, ni historias clínicas. Los casos van completamente anonimizados o sustituidos por una descripción del proceso.",
    plat: ["notion", "canva", "wix"],
    check: ["No hay ningún dato que permita identificar a un paciente.", "Distingo entre competencias certificadas y actividades realizadas bajo supervisión.", "El material educativo que publico es de mi autoría o está acreditado."],
    ph: "Ej.: Programa de educación en autocuidado para pacientes con condición crónica"
  },
  org: {
    label: "Comportamiento Organizacional",
    intro: "Tu portafolio muestra cómo lees una organización y qué haces con lo que encuentras. El diagnóstico solo vale si va acompañado de la intervención y su resultado.",
    estudiante: ["Diagnósticos organizacionales", "Proyectos de intervención", "Instrumentos de medición aplicados", "Talleres diseñados", "Prácticas empresariales", "Análisis de clima o cultura", "Casos académicos"],
    graduado: ["Programas de desarrollo organizacional", "Procesos de selección y evaluación", "Proyectos de cultura y clima", "Gestión del cambio", "Formación y talleres", "Indicadores de gestión humana", "Consultoría organizacional"],
    perfil: "Define el tipo de organización y los procesos de gestión humana en los que trabajas. Nombra los modelos, instrumentos y métricas que manejas.",
    impacto: "Variación en indicadores de clima, rotación, adherencia o desempeño; adopción del programa; número de personas alcanzadas; decisiones que se tomaron a partir de tu diagnóstico.",
    contacto: "LinkedIn como canal principal, junto con el correo profesional.",
    aviso: "Los resultados de clima, evaluaciones y diagnósticos son información sensible de la empresa y de sus empleados: anonimiza la organización, usa rangos en vez de cifras exactas y pide autorización antes de publicar.",
    plat: ["notion", "canva", "wix"],
    check: ["La organización y sus empleados no son identificables sin autorización.", "Cada diagnóstico va acompañado de la intervención y su resultado.", "Los instrumentos que menciono son los que estoy habilitado para aplicar."],
    ph: "Ej.: Programa de gestión del cambio para una fusión de dos áreas operativas"
  },
  hum: {
    label: "Filosofía y Ciencias Humanas",
    intro: "No todo el contenido tiene que ser visual. Aquí priman la claridad argumentativa, la síntesis y una presentación cuidada del texto.",
    estudiante: ["Ensayos y análisis", "Ponencias", "Reseñas", "Participación en semilleros", "Proyectos de divulgación", "Productos escritos o audiovisuales"],
    graduado: ["Investigaciones", "Publicaciones", "Ponencias en eventos", "Proyectos de divulgación", "Docencia y formación", "Consultoría o análisis aplicado"],
    perfil: "Define tus líneas de trabajo y los autores o tradiciones desde las que lees. La capacidad de sintetizar es parte de tu perfil.",
    impacto: "Publicación del texto, presentación en un evento, discusión que abrió, adopción en un curso o alcance de la divulgación.",
    contacto: "Correo profesional, perfil académico y enlace a tus textos publicados.",
    aviso: "Cita correctamente y respeta las licencias de los textos que reproduzcas. Publica solo lo que sea tu autoría o cuente con permiso editorial.",
    plat: ["notion", "carrd", "canva"],
    check: ["Cada texto incluye una síntesis breve que permite entrar sin leerlo completo.", "Las citas y licencias de los materiales están en orden."],
    ph: "Ej.: Ensayo sobre el concepto de reconocimiento en el debate contemporáneo"
  },
  ing: {
    label: "Ingeniería",
    intro: "Muestra el problema técnico, tu decisión de diseño y el resultado medido. Un plano sin contexto no comunica nada.",
    estudiante: ["Proyectos técnicos y diseños", "Prototipos, planos y modelos", "Simulaciones y modelamiento", "Formulaciones y ensayos de laboratorio", "Prácticas empresariales", "Proyectos de investigación", "Documentación de procesos"],
    graduado: ["Proyectos implementados", "Mejoras de proceso con resultado medido", "Diseños en operación", "Gestión de proyectos técnicos", "Documentación y pruebas", "Resultados de implementación"],
    perfil: "Precisa el tipo de sistema o proceso en el que trabajas, y el software técnico y las normas que manejas.",
    impacto: "Reducción de tiempos, costos o defectos; capacidad instalada; pruebas superadas; sistema puesto en operación.",
    contacto: "Correo profesional y LinkedIn. Añade repositorio o carpeta de documentación técnica.",
    aviso: "No afirmes que un sistema fue implementado cuando solo existe como prototipo. Y no publiques planos o especificaciones propiedad de un cliente.",
    plat: ["notion", "wix", "canva"],
    check: ["Distingo con claridad entre prototipo, piloto e implementación.", "No publiqué planos ni especificaciones de propiedad del cliente."],
    ph: "Ej.: Rediseño de la línea de empaque para reducir tiempos de cambio de referencia"
  },
  inf: {
    label: "Informática, datos e Inteligencia Artificial",
    intro: "Tu mejor evidencia es el trabajo mismo: código legible, documentado y ejecutable. El README es parte del portafolio.",
    estudiante: ["Repositorios en GitHub", "Proyectos de código", "Modelos y conjuntos de datos permitidos", "Análisis y visualización de datos", "Interfaces y experiencia de usuario", "Documentación del proceso", "Retos y hackatones"],
    graduado: ["Sistemas en producción", "Arquitectura de soluciones", "Modelos con métricas reportadas", "Contribuciones a proyectos abiertos", "Documentación técnica y pruebas", "Liderazgo técnico"],
    perfil: "Especifica lenguajes, frameworks y el tipo de problema que resuelves. Nombra las métricas con las que evalúas tu trabajo.",
    impacto: "Métricas técnicas reportadas con su línea base, usuarios atendidos, tiempo de respuesta, o adopción del sistema. Indica siempre el contexto de la métrica.",
    contacto: "GitHub primero, luego LinkedIn y correo. Un README claro vale más que una descripción larga.",
    aviso: "No publiques código propietario, credenciales ni conjuntos de datos con información personal. Y no presentes un prototipo como sistema implementado.",
    plat: ["github", "notion", "carrd"],
    check: ["Cada repositorio tiene un README que explica el problema y cómo ejecutarlo.", "No hay credenciales, datos personales ni código propietario en lo que publico.", "Las métricas que reporto indican su contexto y su línea base."],
    ph: "Ej.: Modelo de clasificación de solicitudes con reducción del tiempo de triage"
  },
  med: {
    label: "Medicina y áreas clínicas",
    intro: "Aquí el portafolio documenta competencias y formación, no casos. La confidencialidad del paciente es una condición previa a todo lo demás.",
    estudiante: ["Rotaciones cumplidas", "Actividades supervisadas", "Competencias desarrolladas", "Educación continua", "Reflexiones clínicas", "Estudios de caso anonimizados"],
    graduado: ["Certificaciones vigentes", "Investigación y publicaciones", "Proyectos de mejora asistencial", "Docencia clínica", "Participación en guías o protocolos", "Educación continua"],
    perfil: "Precisa tu área, tu nivel de formación y los procedimientos o poblaciones con los que trabajas. Distingue lo certificado de lo practicado.",
    impacto: "Indicadores del proyecto de mejora, publicaciones, protocolos adoptados, formación impartida. Nunca resultados individuales de pacientes.",
    contacto: "Correo profesional y perfil académico. LinkedIn si buscas roles institucionales o de gestión.",
    aviso: "No incluyas información identificable de pacientes bajo ninguna circunstancia. No presentes una competencia como certificada si no tienes la evidencia que lo respalde.",
    plat: ["notion", "canva", "carrd"],
    check: ["No hay ningún dato que permita identificar a un paciente.", "Distingo entre competencias certificadas y actividades realizadas.", "Cuento con la evidencia de cada certificación que menciono."],
    ph: "Ej.: Proyecto de mejora en la adherencia a un protocolo de seguridad del paciente"
  },
  psi: {
    label: "Psicología",
    intro: "Muestra tu criterio profesional y tu forma de intervenir. Los casos solo entran completamente anonimizados, y muchas veces es mejor describir el proceso que el caso.",
    estudiante: ["Proyectos de intervención", "Talleres diseñados", "Instrumentos de evaluación aplicados", "Prácticas", "Investigación", "Contenidos educativos"],
    graduado: ["Servicios profesionales", "Programas de intervención", "Proyectos de psicología organizacional o social", "Investigación y publicaciones", "Formación y talleres", "Reflexión profesional"],
    perfil: "Define tu enfoque, la población con la que trabajas y el tipo de intervención que realizas. Nombra los instrumentos que estás habilitado para aplicar.",
    impacto: "Cambio observado en la población, adopción del programa, número de participantes, resultados de la evaluación o retroalimentación recibida.",
    contacto: "Correo profesional y LinkedIn. Sitio propio si ofreces servicios de forma independiente.",
    aviso: "No incluyas historias clínicas, datos identificables ni información confidencial. Los casos deben estar completamente anonimizados o sustituidos por una descripción del proceso.",
    plat: ["notion", "carrd", "wix"],
    check: ["No hay historias clínicas ni datos identificables de consultantes.", "Los instrumentos que menciono son los que estoy habilitado para aplicar."],
    ph: "Ej.: Programa de acompañamiento en riesgo psicosocial para un equipo de 60 personas"
  },
  pos: {
    label: "Posgrados e investigación",
    intro: "Tu portafolio articula trayectoria académica y aplicación. Personalízalo según tu disciplina y el propósito que declares.",
    estudiante: ["Investigaciones en curso", "Ponencias", "Participación en eventos", "Revisiones de literatura", "Proyectos aplicados", "Divulgación"],
    graduado: ["Publicaciones", "Proyectos de investigación dirigidos", "Productos de transferencia", "Contribuciones metodológicas", "Moderaciones y conferencias", "Consultoría especializada"],
    perfil: "Define tus líneas de investigación, tu método y el tipo de producto que generas. Distingue lo publicado de lo que está en curso.",
    impacto: "Publicación, citación, adopción del método, transferencia a una organización, o formación de otros investigadores.",
    contacto: "Correo institucional, perfil académico (ORCID, Google Scholar) y LinkedIn.",
    aviso: "No presentes como publicado lo que está en revisión, y respeta los embargos editoriales y los acuerdos de coautoría.",
    plat: ["notion", "wix", "carrd"],
    check: ["Distingo entre publicado, aceptado, en revisión y en curso.", "Respeto los embargos editoriales y acredito a mis coautores."],
    ph: "Ej.: Estudio sobre trayectorias de empleabilidad con metodología mixta"
  },
  tec: {
    label: "Programas técnicos laborales",
    intro: "La falta de experiencia laboral formal no impide tener portafolio: lo que importa es que exista trabajo real que puedas mostrar.",
    estudiante: ["Ejercicios prácticos", "Simulaciones", "Productos de formación", "Proyectos y retos", "Passion projects", "Certificaciones"],
    graduado: ["Trabajos ejecutados", "Prácticas laborales", "Registros de ejecución", "Certificaciones vigentes", "Proyectos propios", "Clientes atendidos (con autorización)"],
    perfil: "Nombra con precisión lo que sabes ejecutar y con qué equipos o herramientas. La especificidad técnica es tu diferencial.",
    impacto: "Trabajo entregado y aceptado, tiempos de ejecución, calidad del acabado, o retroalimentación del cliente o instructor.",
    contacto: "WhatsApp profesional y correo. Un catálogo visual de trabajos funciona muy bien.",
    aviso: "Si muestras trabajos hechos para un cliente, pide autorización antes de publicar imágenes o datos del encargo.",
    plat: ["canva", "carrd", "behance"],
    check: ["Cada trabajo muestra el resultado terminado, no solo el proceso.", "Cuento con autorización de los clientes cuyos trabajos publico."],
    ph: "Ej.: Instalación eléctrica residencial completa con certificación de la obra"
  }
};

/* Lista de verificación común a cualquier programa */
export const CHECK_BASE: string[] = [
  "El objetivo del portafolio es claro.",
  "La propuesta de valor se entiende rápidamente.",
  "El perfil explica qué puedo aportar.",
  "Los proyectos son pertinentes para mi audiencia.",
  "Mi rol individual está claramente descrito.",
  "Cada proyecto incluye una evidencia.",
  "Los resultados son verificables.",
  "No incluí datos confidenciales ni de terceros.",
  "Los enlaces funcionan.",
  "La información de contacto está actualizada.",
  "El llamado a la acción corresponde a mi objetivo.",
  "La redacción y la presentación son consistentes."
];

export const OBJETIVOS: Record<string, string> = {
  practica: "conseguir una práctica", empleo: "buscar empleo", transicion: "cambiar de área o sector",
  independiente: "ofrecer servicios como independiente", emprendimiento: "presentar mi emprendimiento",
  academico: "posicionamiento académico"
};


/** Programas agrupados por facultad. `area` es la clave de AREAS; `nombre` vacío = se escribe a mano. */
export type ProgramaOpc = { area: string; nombre: string; etiqueta: string };
export const PROGRAMAS: { facultad: string; programas: ProgramaOpc[] }[] = [
  {
    facultad: "Escuela Internacional de Ciencias Económicas y Administrativas",
    programas: [
      { area: "eco", nombre: "Administración de Empresas", etiqueta: "Administración de Empresas" },
      { area: "eco", nombre: "Administración & Servicio", etiqueta: "Administración & Servicio" },
      { area: "eco", nombre: "Administración de Mercadeo y Logística Internacionales", etiqueta: "Administración de Mercadeo y Logística Internacionales" },
      { area: "eco", nombre: "Administración de Negocios Internacionales", etiqueta: "Administración de Negocios Internacionales" },
      { area: "eco", nombre: "Economía y Finanzas Internacionales", etiqueta: "Economía y Finanzas Internacionales" },
      { area: "eco", nombre: "Economía y Finanzas Internacionales (virtual)", etiqueta: "Economía y Finanzas Internacionales, modalidad virtual" },
      { area: "gas", nombre: "Gastronomía", etiqueta: "Gastronomía" },
    ],
  },
  {
    facultad: "Facultad de Ciencias del Comportamiento",
    programas: [
      { area: "org", nombre: "Comportamiento Organizacional", etiqueta: "Comportamiento Organizacional" },
      { area: "psi", nombre: "Psicología", etiqueta: "Psicología" },
    ],
  },
  {
    facultad: "Facultad de Comunicación",
    programas: [
      { area: "com", nombre: "Comunicación Audiovisual y Multimedios", etiqueta: "Comunicación Audiovisual y Multimedios" },
      { area: "com", nombre: "Comunicación Corporativa", etiqueta: "Comunicación Corporativa" },
      { area: "com", nombre: "Comunicación Social y Periodismo", etiqueta: "Comunicación Social y Periodismo" },
    ],
  },
  { facultad: "Facultad de Educación", programas: [{ area: "edu", nombre: "Licenciatura en Educación Infantil", etiqueta: "Licenciatura en Educación Infantil" }] },
  {
    facultad: "Facultad de Ciencias de la Vida y el Bienestar",
    programas: [
      { area: "vid", nombre: "Enfermería", etiqueta: "Enfermería" },
      { area: "vid", nombre: "Fisioterapia", etiqueta: "Fisioterapia" },
    ],
  },
  {
    facultad: "Facultad de Estudios Jurídicos, Políticos e Internacionales",
    programas: [
      { area: "der", nombre: "Ciencias Políticas", etiqueta: "Ciencias Políticas" },
      { area: "der", nombre: "Derecho", etiqueta: "Derecho" },
      { area: "der", nombre: "Relaciones Internacionales", etiqueta: "Relaciones Internacionales" },
    ],
  },
  { facultad: "Facultad de Filosofía y Ciencias Humanas", programas: [{ area: "hum", nombre: "Filosofía", etiqueta: "Filosofía" }] },
  {
    facultad: "Facultad de Ingeniería",
    programas: [
      { area: "inf", nombre: "Ciencia de Datos", etiqueta: "Ciencia de Datos" },
      { area: "ing", nombre: "Ingeniería Civil", etiqueta: "Ingeniería Civil" },
      { area: "ing", nombre: "Ingeniería de Bioproducción", etiqueta: "Ingeniería de Bioproducción" },
      { area: "ing", nombre: "Ingeniería de Diseño e Innovación", etiqueta: "Ingeniería de Diseño e Innovación" },
      { area: "ing", nombre: "Ingeniería Industrial", etiqueta: "Ingeniería Industrial" },
      { area: "inf", nombre: "Ingeniería Informática", etiqueta: "Ingeniería Informática" },
      { area: "ing", nombre: "Ingeniería Mecánica", etiqueta: "Ingeniería Mecánica" },
      { area: "ing", nombre: "Ingeniería Química", etiqueta: "Ingeniería Química" },
      { area: "inf", nombre: "Ingeniería en Inteligencia Artificial", etiqueta: "Ingeniería en Inteligencia Artificial" },
    ],
  },
  { facultad: "Facultad de Medicina", programas: [{ area: "med", nombre: "Medicina", etiqueta: "Medicina" }] },
];

/** Opciones sin facultad: el nombre del programa lo escribe la persona. */
export const PROGRAMAS_OTROS: ProgramaOpc[] = [
  { area: "pos", nombre: "", etiqueta: "Posgrado o investigación" },
  { area: "tec", nombre: "", etiqueta: "Programa técnico laboral" },
  { area: "otro", nombre: "", etiqueta: "Otro programa" },
];

export const AREAS_OPC: [string, string][] = [
  ["eco", "Ciencias Económicas, Administrativas y Negocios"],
  ["gas", "Gastronomía"],
  ["com", "Comunicación"],
  ["der", "Derecho, Ciencia Política y Relaciones Internacionales"],
  ["edu", "Educación"],
  ["vid", "Salud y bienestar"],
  ["hum", "Filosofía y Ciencias Humanas"],
  ["ing", "Ingeniería"],
  ["inf", "Informática, datos e Inteligencia Artificial"],
  ["med", "Medicina y áreas clínicas"],
  ["org", "Comportamiento organizacional"],
  ["psi", "Psicología"],
  ["pos", "Posgrados e investigación"],
  ["tec", "Programas técnicos laborales"],
];

export const ETAPAS: [string, string][] = [
  ["estudiante", "Estudiante"],
  ["graduado", "Graduado"],
  ["transicion", "En transición laboral"],
];

export const OBJETIVOS_OPC: [string, string][] = [
  ["practica", "Conseguir práctica"],
  ["empleo", "Buscar empleo"],
  ["transicion", "Cambiar de área o sector"],
  ["independiente", "Ofrecer servicios como independiente"],
  ["emprendimiento", "Presentar mi emprendimiento"],
  ["academico", "Posicionamiento académico o posgrado"],
];

/* Reglas de las fichas. min = palabras mínimas; «unidad» cambia el contador por un aviso
   (un enlace cuenta como una palabra, exigirle dos rechazaba la respuesta correcta). */
export type ClaveRegla = "titulo" | "contexto" | "objetivo" | "rol" | "acciones" | "resultado" | "evidencia";
export const REGLAS_FICHA: Record<ClaveRegla, { min: number; etiqueta: string; ayuda: string; unidad?: string }> = {
  titulo: { min: 3, etiqueta: "Título del proyecto", ayuda: "Un nombre que se entienda sin explicación." },
  contexto: { min: 15, etiqueta: "Contexto o reto", ayuda: "Qué situación existía antes de tu trabajo." },
  objetivo: { min: 8, etiqueta: "Objetivo", ayuda: "Qué se buscaba conseguir." },
  rol: { min: 10, etiqueta: "Mi rol", ayuda: "Lo que hiciste tú, no el equipo." },
  acciones: { min: 15, etiqueta: "Acciones y decisiones", ayuda: "Cómo lo abordaste y qué decidiste." },
  resultado: { min: 10, etiqueta: "Resultado o impacto", ayuda: "Qué cambió, o qué aprendiste si no hubo cifra." },
  evidencia: { min: 1, etiqueta: "Evidencia (enlace)", ayuda: "Una dirección que quien te lea pueda abrir.", unidad: "enlace" },
};
