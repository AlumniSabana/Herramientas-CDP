<script>
/* ══════════════════════════════════════════════════════════════
   CONSTRUYE TU PORTAFOLIO PROFESIONAL · ALUMNI SABANA
   Centro de Desarrollo Profesional · Universidad de La Sabana

   ORGANIZACIÓN
     1 · Datos de contenido (plataformas, áreas, checklist)
     2 · Utilidades
     3 · Navegación
     4 · Formularios
     5 · Proyectos
     6 · Adaptación por programa
     7 · Checklist
     8 · Vista previa y armado del portafolio
     9 · Guardado local
    10 · Arranque

   No hay dependencias externas ni llamadas de red: todo ocurre
   dentro del navegador.
   ══════════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ═══════════════ 1 · DATOS DE CONTENIDO ═══════════════ */

/* Plataformas donde publicar el portafolio.
   «url» es el sitio oficial de cada una: la tarjeta enlaza allí y se
   abre en una pestaña nueva para no perder el borrador en curso. */
var PLAT = {
  wix:     { url: "https://www.wix.com/studio", n: "Wix Studio",       para: "Portafolios web completos con varias secciones y proyectos.", ven: "Control amplio del diseño y del sitio.", lim: "Requiere más tiempo de montaje.", ed: "Media a alta.", prep: "Textos, imágenes de proyectos y enlaces." },
  carrd:   { url: "https://carrd.co", n: "Carrd",            para: "Portafolio de una sola página, directo al punto.",            ven: "Se publica muy rápido.",                lim: "Poco espacio para proyectos extensos.", ed: "Baja.", prep: "Propuesta de valor, 2 o 3 proyectos y contacto." },
  notion:  { url: "https://www.notion.com", n: "Notion",           para: "Portafolios con mucho texto, documentación y procesos.",      ven: "Fácil de actualizar y organizar por bloques.", lim: "Identidad visual limitada.", ed: "Baja.", prep: "Fichas de proyecto y enlaces a evidencias." },
  canva:   { url: "https://www.canva.com", n: "Canva",            para: "Portafolio en documento o presentación descargable.",         ven: "Plantillas listas y exportación a PDF.", lim: "Menos apropiado para material interactivo.", ed: "Baja a media.", prep: "Textos definitivos e imágenes en buena resolución." },
  behance: { url: "https://www.behance.net", n: "Behance",          para: "Perfiles creativos y visuales con proyectos por caso.",       ven: "Comunidad y visibilidad en el sector.", lim: "Estructura fija, poca personalización.", ed: "Baja.", prep: "Imágenes de alta calidad y descripción de cada caso." },
  adobe:   { url: "https://portfolio.adobe.com", n: "Adobe Portfolio",  para: "Portafolios visuales con sitio propio.",                      ven: "Presentación cuidada del material gráfico.", lim: "Asociado al ecosistema Adobe.", ed: "Media.", prep: "Series de imágenes y textos de cada proyecto." },
  github:  { url: "https://github.com", n: "GitHub",           para: "Perfiles técnicos: código, documentación y software.",        ven: "La evidencia es el trabajo mismo.", lim: "Poco legible para audiencias no técnicas.", ed: "Media.", prep: "Repositorios ordenados y un README por proyecto." }
};

/* Adaptación por área del conocimiento */
var AREAS = {
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
var CHECK_BASE = [
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

var OBJETIVOS = {
  practica: "conseguir una práctica", empleo: "buscar empleo", transicion: "cambiar de área o sector",
  independiente: "ofrecer servicios como independiente", emprendimiento: "presentar mi emprendimiento",
  academico: "posicionamiento académico"
};

/* Campos simples que se guardan y se restauran */
var CAMPOS = [
  "f-programa", "f-programa-otro", "f-area-otro", "f-etapa", "f-objetivo", "f-audiencia",
  "f-nombre", "f-campo", "f-valor",
  "f-perfil", "f-capacidades", "f-herramientas", "f-formacion",
  "f-logros", "f-testimonio",
  "f-correo", "f-linkedin", "f-otro", "f-cta"
];

/* ── Dónde se guarda el borrador ──────────────────────────────
   Cada cuenta tiene el suyo. Antes había una sola llave para todo
   el navegador, así que quien entraba después veía el borrador de
   quien había entrado antes: en un equipo compartido del campus,
   una persona leía el portafolio a medio escribir de otra.

   La llave lleva ahora el identificador de la cuenta. Quien trabaja
   sin cuenta tiene la suya propia, «anon», que tampoco se mezcla
   con la de nadie.

   El texto sigue sin salir del equipo. Aislar por cuenta no es lo
   mismo que guardarlo en el servidor: si cambias de computador, el
   borrador no te sigue, y eso está dicho en pantalla. */
var LLAVE_BASE = "alumni-portafolio:v1";

/* Borradores escritos antes de que hubiera aislamiento. No se pueden
   atribuir a nadie: se escribieron con una llave común. Se mueven al
   cajón «sin cuenta», que es el único sitio donde no le adjudican a
   una persona un texto que quizá no es suyo. Se hace una sola vez. */
function migrarBorradorAntiguo(){
  try {
    var viejo = window.localStorage.getItem(LLAVE_BASE);
    if (viejo == null) return;
    var destino = LLAVE_BASE + ":anon";
    if (window.localStorage.getItem(destino) == null) {
      window.localStorage.setItem(destino, viejo);
    }
    window.localStorage.removeItem(LLAVE_BASE);
  } catch (e) { /* sin permisos: no pasa nada */ }
}

function llaveDelBorrador(){
  var id = "";
  try {
    if (typeof Cuenta !== "undefined" && Cuenta && Cuenta.sesion) {
      id = Cuenta.sesion.id || Cuenta.sesion.correo || "";
    }
  } catch (e) { /* auth.js puede no estar cargado */ }
  return LLAVE_BASE + ":" + (id ? String(id) : "anon");
}

/* ═══════════════ 2 · UTILIDADES ═══════════════ */
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

var toastEl = $("#toast"), toastTimer;
function toast(m) {
  toastEl.textContent = m;
  toastEl.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove("on"); }, 2400);
}

/* Confirmación breve en el propio botón, además del aviso flotante */
function marcarHecho(btn, etiqueta) {
  if (!btn) return;
  var original = btn.dataset.original || btn.textContent;
  btn.dataset.original = original;
  btn.textContent = etiqueta;
  btn.classList.add("hecho");
  clearTimeout(btn._t);
  btn._t = setTimeout(function () {
    btn.textContent = btn.dataset.original;
    btn.classList.remove("hecho");
  }, 1800);
}

function copy(texto, mensaje, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(
      function () { toast(mensaje); marcarHecho(btn, "Copiado ✓"); },
      function () { toast("No se pudo copiar. Selecciona el texto manualmente."); }
    );
  } else {
    toast("No se pudo copiar. Selecciona el texto manualmente.");
  }
}

/* Descarga en PDF. El texto viaja en Markdown, la fuente única de
   todas las salidas, y PDF.generar lo compone con la identidad de la
   Universidad. Si el motor no cargara, se avisa en lugar de fallar
   en silencio. */
function descargarPDF(archivo, texto, titulo, btn) {
  var ok = false;
  try {
    ok = PDF.generar(texto, {
      archivo: archivo,
      titulo: titulo,
      logo: typeof LOGO_PDF === "string" ? LOGO_PDF : null
    });
  } catch (e) { ok = false; }

  if (!ok) { toast("No se pudo generar el PDF en este navegador."); return; }
  toast("Descargado: " + archivo);
  marcarHecho(btn, "Descargado ✓");
}

function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
function lines(s) { return s.split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
function ph(v, marcador) { return v ? v : "[" + marcador + "]"; }
function contarPalabras(s) { return s.split(/\s+/).filter(Boolean).length; }

/* ══════════════════════════════════════════════════════════
   VUELTA A LA PÁGINA DE ENTRADA
   ----------------------------------------------------------
   ESTO ES LO ÚNICO QUE HAY QUE EDITAR AL PUBLICAR.

   Por defecto apunta al nombre de archivo, que funciona si los
   HTML están en la misma carpeta. Cuando el CDP publique la
   página de entrada en su dirección definitiva, sustituye el
   valor por la URL completa:

     var INICIO = "https://alumni.unisabana.edu.co/herramientas/";

   Déjalo vacío ("") para ocultar el enlace: si esta herramienta
   se publica suelta, un botón que lleva a ninguna parte es peor
   que no tener botón.
   ══════════════════════════════════════════════════════════ */
/* Publicada en un servidor, la portada vive en la raíz del sitio:
   al subirla se renombra a «index.html» y el nombre original deja de
   existir, así que enlazar al nombre daba un 404. */
var INICIO = "/";

/* Abriendo los archivos con doble clic no hay raíz de sitio a la que
   ir («/» sería la raíz del disco), así que ahí se usa el nombre. */
var INICIO_ARCHIVO = "herramientas-alumni-sabana.html";

/* Marca de versión. Los navegadores guardan en caché las páginas ya
   visitadas: al publicar una versión nueva se puede seguir viendo la
   vieja. Al cambiar la marca cambia la dirección y el navegador se ve
   obligado a leerla otra vez. Súbela cada vez que publiques. */
var VERSION = "2026.08.20";

(function volver() {
  var a = document.getElementById("volver-inicio");
  if (!a) return;
  var destino = (window.location.protocol === "file:") ? INICIO_ARCHIVO : INICIO;
  if (!destino) { a.removeAttribute("href"); a.hidden = true; return; }
  a.setAttribute("href", destino + (destino.indexOf("?") < 0 ? "?v=" : "&v=") + VERSION);
})();

/* ═══════════════ 3 · NAVEGACIÓN ═══════════════ */
var hojas = $$(".hoja");
var navLinks = $$("nav.toc a");
var barra = $("#barra");
var toc = $("#toc");
var actual = 0;

barra.innerHTML = hojas.map(function () { return "<span></span>"; }).join("");
var celdas = Array.prototype.slice.call(barra.children);

/* Cada hoja recibe su propia paginación */
hojas.forEach(function (h, i) {
  var pager = document.createElement("div");
  pager.className = "pager";
  /* En la última hoja no hay a dónde avanzar. Antes había ahí un
     botón «Fin» desactivado que no llevaba a ninguna parte: ocupaba
     el sitio del botón de acción y solo se podía leer como avería.
     Se deja el hueco vacío para que «Anterior» y el folio no se
     descoloquen. */
  var ultima = i === hojas.length - 1;
  pager.innerHTML =
    '<button type="button" data-ir="' + (i - 1) + '"' + (i === 0 ? " disabled" : "") + '>← Anterior</button>' +
    '<span class="folio">Hoja ' + (i + 1) + ' de ' + hojas.length + '</span>' +
    (ultima
      ? '<span class="pager-hueco" aria-hidden="true"></span>'
      : '<button type="button" class="solid" data-ir="' + (i + 1) + '">' +
        (i === 0 ? "Comenzar →" : "Siguiente →") + '</button>');
  h.appendChild(pager);
});

/* Posición de la hoja de Proyectos: todo lo que viene después de
   ella queda detrás de la regla de los mínimos. */
var IDX_PROYECTOS = hojas.map(function (h) { return h.id; }).indexOf("proyectos");

function puertaAbierta() {
  if (IDX_PROYECTOS < 0) return true;
  /* La regla existe para que nadie se lleve un portafolio con las
     fichas a medias. Al CDP no le aplica: entra a revisar el
     recorrido y a mirar el consolidado, no a construir el suyo, y
     obligarle a inventarse una ficha para poder pasar de hoja sería
     absurdo. */
  if (esAdministrador()) return true;
  return evaluarProyectos().completas > 0;
}

/* Rechaza el salto y explica por qué, en vez de no hacer nada.
   Lleva a la hoja de Proyectos, resalta el aviso y lo dice en voz
   alta: un clic que no responde se lee como una avería. */
function rechazarAvance() {
  if (actual !== IDX_PROYECTOS) irA(IDX_PROYECTOS, true, true);

  var aviso = $("#proy-puerta");
  if (aviso) {
    aviso.classList.remove("destaca");
    void aviso.offsetWidth;            /* reinicia la animación */
    aviso.classList.add("destaca");
    aviso.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  toast("Completa una ficha de proyecto para continuar");
}

/* forzar salta la regla: lo usan el arranque y la restauración del
   borrador, que devuelven a quien vuelve a la hoja donde lo dejó. */
function irA(i, conHash, forzar) {
  if (i < 0 || i >= hojas.length) return;

  if (!forzar && IDX_PROYECTOS > -1 && i > IDX_PROYECTOS && !puertaAbierta()) {
    rechazarAvance();
    return;
  }

  actual = i;

  hojas.forEach(function (h, k) { h.classList.toggle("on", k === i); });
  celdas.forEach(function (c, k) {
    c.classList.toggle("pasada", k < i);
    c.classList.toggle("actual", k === i);
  });

  var id = hojas[i].id;
  navLinks.forEach(function (l) {
    var activo = l.getAttribute("href") === "#" + id;
    l.classList.toggle("on", activo);
    if (activo) { l.setAttribute("aria-current", "page"); } else { l.removeAttribute("aria-current"); }
  });

  if (conHash !== false && window.location.hash !== "#" + id) {
    try { history.replaceState(null, "", "#" + id); } catch (e) { /* file:// sin history */ }
  }
  abrirGrupoDeHoja(id);
  cerrarMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* Índice plegable por grupos. Solo uno abierto a la vez: con once
   hojas, tenerlos todos desplegados era justamente lo que hacía
   pesado el índice. */
function abrirGrupo(id) {
  $$(".navgrupo").forEach(function (g) {
    var abierto = g.id === id;
    g.classList.toggle("abierto", abierto);
    var btn = $('nav.toc .navlabel[aria-controls="' + g.id + '"]');
    if (btn) btn.setAttribute("aria-expanded", abierto ? "true" : "false");
  });
}

/* Deja abierto el grupo al que pertenece la hoja que se está viendo */
function abrirGrupoDeHoja(id) {
  var link = $('nav.toc a[href="#' + id + '"]');
  var grupo = link ? link.closest(".navgrupo") : null;
  if (grupo) abrirGrupo(grupo.id);
}

$$("nav.toc .navlabel").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var destino = this.getAttribute("aria-controls");
    var yaAbierto = this.getAttribute("aria-expanded") === "true";
    abrirGrupo(yaAbierto ? "" : destino);
  });
});

/* Menú plegable en pantallas pequeñas */
function cerrarMenu() {
  toc.classList.remove("abierto");
  $("#btn-menu").setAttribute("aria-expanded", "false");
}
$("#btn-menu").addEventListener("click", function () {
  var abierto = toc.classList.toggle("abierto");
  this.setAttribute("aria-expanded", abierto ? "true" : "false");
  this.setAttribute("aria-label", abierto ? "Cerrar el índice de hojas" : "Abrir el índice de hojas");
});

/* Un único delegado de clic para paginación, índice y borrado de fichas */
document.addEventListener("click", function (e) {
  var t = e.target;
  if (!t || !t.closest) return;

  var b = t.closest("[data-ir]");
  if (b) { e.preventDefault(); irA(parseInt(b.dataset.ir, 10)); return; }

  var a = t.closest("nav.toc a");
  if (a && a.id === "volver-inicio") return;   /* sale del documento */
  if (a) {
    e.preventDefault();
    var idx = hojas.map(function (h) { return "#" + h.id; }).indexOf(a.getAttribute("href"));
    if (idx > -1) irA(idx);
    return;
  }

  if (t.classList && t.classList.contains("trad-btn")) { traducirFicha(t.closest("fieldset"), t); return; }

  if (t.classList && t.classList.contains("trad-copiar-es")) {
    copy(fichaMarkdown(t.closest("fieldset")).replace(/\*\*/g, "").replace(/^### /m, ""),
         "Ficha copiada en español", t);
    return;
  }

  if (t.classList && t.classList.contains("trad-copiar")) {
    var caja = t.closest(".trad").querySelector(".trad-texto");
    copy(caja.textContent, "Versión en inglés copiada", t);
    return;
  }

  if (t.classList && t.classList.contains("del-proy")) {
    var fs = t.closest("fieldset");
    if (fs) { fs.remove(); renumerarProyectos(); render(); guardar(); }
  }
});

window.addEventListener("hashchange", function () {
  var idx = hojas.map(function (h) { return "#" + h.id; }).indexOf(window.location.hash);
  if (idx > -1 && idx !== actual) irA(idx, false);
});

/* ═══════════════ 4 · FORMULARIOS ═══════════════ */
function areaKey() {
  var v = val("f-programa");
  if (!v) return "";
  var k = v.split("|")[0];
  return k === "otro" ? val("f-area-otro") : k;
}

function programaNombre() {
  var v = val("f-programa");
  if (!v) return "";
  return v.split("|")[1] || val("f-programa-otro");
}

/* La facultad no se pregunta: es la etiqueta del <optgroup> al que
   pertenece el programa elegido. El grupo «Otros» no es una facultad,
   así que ahí no se muestra nada. */
function facultadDelPrograma() {
  var sel = $("#f-programa");
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.parentNode || opt.parentNode.tagName !== "OPTGROUP") return "";
  var etiqueta = opt.parentNode.label || "";
  return etiqueta === "Otros" ? "" : etiqueta;
}

/* Muestra u oculta los campos según lo elegido:
     · programa de la lista  → se ve la facultad, deducida sola
     · posgrado / técnico    → se escribe el nombre del programa
     · otro programa         → nombre del programa y área más cercana */
function syncPrograma() {
  var v = val("f-programa"), k = v ? v.split("|")[0] : "";
  var libre = v !== "" && (v.split("|")[1] || "") === "";
  var fac = facultadDelPrograma() || facultadDelPerfil || "";

  $("#f-facultad").value = fac;
  $("#facultad-wrap").hidden = !fac;
  $("#otro-wrap").hidden = !libre;
  $("#area-wrap").hidden = k !== "otro";
  if (k && k !== "otro") { $("#f-area-otro").value = k; }
}

/* ═══════════ PROGRAMA TOMADO DE LA CUENTA ═══════════
   Quien creó su cuenta ya contestó su facultad y su programa en el
   registro. Volvérselo a preguntar aquí es hacerle repetir un dato
   que la Universidad ya tiene, y abre la puerta a que las dos
   respuestas no coincidan. Con sesión iniciada el campo se rellena
   solo y queda fijo; sin sesión se llena a mano, como siempre. */
var facultadDelPerfil = "";

/* Los nombres del registro y los del desplegable se escribieron por
   separado, así que casi todos coinciden pero no todos. Se compara
   sin tildes, sin mayúsculas y sin paréntesis antes de rendirse. */
function normalizar(t) {
  return String(t || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function opcionDePrograma(nombre) {
  var sel = $("#f-programa");
  var meta = normalizar(nombre);
  if (!meta) return null;
  var opciones = Array.prototype.slice.call(sel.options);
  var exacta = null, aproximada = null;
  opciones.forEach(function (o) {
    var suyo = (o.value || "").split("|")[1] || "";
    if (!suyo) return;
    var n = normalizar(suyo);
    if (n === meta) exacta = o;
    else if (!aproximada && n && (n.indexOf(meta) === 0 || meta.indexOf(n) === 0)) aproximada = o;
  });
  return exacta || aproximada;
}

/* El área temática que le corresponde a una facultad: se toma del
   primer programa de ese grupo, para no mantener una segunda tabla
   de equivalencias que se desincronizaría con la primera. */
function areaDeFacultad(facultad) {
  var sel = $("#f-programa");
  var meta = normalizar(facultad);
  var grupos = Array.prototype.slice.call(sel.getElementsByTagName("optgroup"));
  var g = null;
  grupos.forEach(function (x) { if (!g && normalizar(x.label) === meta) g = x; });
  if (!g || !g.children.length) return "";
  return (g.children[0].value || "").split("|")[0];
}

/* Deja el campo con aspecto de resuelto y sin posibilidad de
   cambiarlo. No se usa «disabled»: un control apagado en gris se
   lee como una avería, y además se saca del orden de tabulación.
   Con readonly aparente el dato se ve, se copia y se entiende. */
function fijarCampo(envoltura, sello, fijo) {
  if (!envoltura) return;
  envoltura.classList.toggle("campo-listo", !!fijo);
  var ctrl = envoltura.querySelector("select, input");
  if (ctrl) {
    if (ctrl.tagName === "SELECT") {
      /* Un select no admite readonly: se bloquea el teclado y el
         ratón, pero el valor sigue viajando y el foco funciona. */
      ctrl.setAttribute("aria-readonly", fijo ? "true" : "false");
      ctrl.onmousedown = fijo ? function (e) { e.preventDefault(); ctrl.blur(); } : null;
      ctrl.onkeydown = fijo ? function (e) {
        if (e.key !== "Tab") e.preventDefault();
      } : null;
    } else if (!ctrl.hasAttribute("data-siempre-readonly")) {
      ctrl.readOnly = !!fijo;
    }
  }
  var pista = envoltura.querySelector(".hint");
  if (!pista) return;
  if (fijo && sello) {
    if (!pista.dataset.original) pista.dataset.original = pista.textContent;
    pista.innerHTML = '<span class="sello-perfil">✓ Completo</span> ' + sello;
  } else if (!fijo && pista.dataset.original) {
    /* Al cerrar sesión el campo vuelve a estar por contestar, así que
       también vuelve su pista original. Sin esto el sello de
       «Completo» se quedaba puesto sobre un campo ya editable. */
    pista.textContent = pista.dataset.original;
  }
}

function aplicarPerfil(sesion) {
  var sel = $("#f-programa");
  if (!sel) return;
  var campoPrograma = sel.closest(".field");

  if (!sesion || !(sesion.programa || sesion.facultad)) {
    facultadDelPerfil = "";
    fijarCampo(campoPrograma, "", false);
    fijarCampo($("#facultad-wrap"), "", false);
    syncPrograma();
    return;
  }

  facultadDelPerfil = sesion.facultad || "";
  var opt = opcionDePrograma(sesion.programa);

  if (opt) {
    sel.value = opt.value;
  } else if (sesion.programa) {
    /* El programa del registro no está en la lista: se guarda como
       «otro», con el nombre escrito y el área deducida de la
       facultad. Nadie tiene que corregir nada a mano. */
    sel.value = "otro|";
    var libre = $("#f-programa-otro");
    if (libre) libre.value = sesion.programa;
    var area = areaDeFacultad(sesion.facultad);
    if (area) $("#f-area-otro").value = area;
  }

  syncPrograma();
  if (facultadDelPerfil) {
    $("#f-facultad").value = facultadDelPerfil;
    $("#facultad-wrap").hidden = false;
  }

  fijarCampo(campoPrograma, "Tomado de tu cuenta.", true);
  fijarCampo($("#facultad-wrap"), "Tomada de tu cuenta.", true);
  adapt(); render(); guardar();
}

/* ═══════════════ 5 · PROYECTOS ═══════════════ */
var proyN = 0;

/* ── Reglas de las fichas ────────────────────────────────────
   Un portafolio se cae por lo mismo siempre: fichas de dos líneas
   que no dicen qué se hizo ni qué cambió. Los mínimos no son un
   trámite, son el umbral por debajo del cual la ficha no informa a
   quien la lee. Están en un solo sitio para poder ajustarlos.

   min = palabras mínimas. Los campos sin regla son opcionales. */
var REGLAS_PROY = {
  titulo:    { min: 3,  etiqueta: "Título del proyecto",    ayuda: "Un nombre que se entienda sin explicación." },
  contexto:  { min: 15, etiqueta: "Contexto o reto",        ayuda: "Qué situación existía antes de tu trabajo." },
  objetivo:  { min: 8,  etiqueta: "Objetivo",               ayuda: "Qué se buscaba conseguir." },
  rol:       { min: 10, etiqueta: "Mi rol",                 ayuda: "Lo que hiciste tú, no el equipo." },
  acciones:  { min: 15, etiqueta: "Acciones y decisiones",  ayuda: "Cómo lo abordaste y qué decidiste." },
  resultado: { min: 10, etiqueta: "Resultado o impacto",    ayuda: "Qué cambió, o qué aprendiste si no hubo cifra." },
  /* La evidencia se mide distinto: es una dirección, no una
     redacción. Un enlace pegado cuenta como una sola palabra, así
     que exigirle dos rechazaba justamente la respuesta correcta.
     «unidad» cambia el contador por un aviso que sí tiene sentido. */
  evidencia: { min: 1,  etiqueta: "Evidencia (enlace)",     ayuda: "Una dirección que quien te lea pueda abrir.", unidad: "enlace" }
};

/* Estructura de la ficha, en datos: así el formulario y las reglas
   no pueden desincronizarse. */
var CAMPOS_PROY = [
  { clave: "titulo",       tipo: "input",    ancho: "full", ph: "Un nombre que se entienda sin explicación" },
  { clave: "contexto",     tipo: "textarea", filas: 3, ph: "Qué situación, necesidad o problema existía." },
  { clave: "objetivo",     tipo: "textarea", filas: 3, ph: "Qué se buscaba conseguir." },
  { clave: "rol",          tipo: "textarea", filas: 3, ph: "Qué hiciste tú específicamente, no el equipo." },
  { clave: "acciones",     tipo: "textarea", filas: 3, ph: "Cómo abordaste el trabajo y qué decidiste." },
  { clave: "herr",         tipo: "input",    ph: "Solo si es relevante para el proyecto", label: "Herramientas o métodos" },
  { clave: "resultado",    tipo: "textarea", filas: 3, ph: "Qué se consiguió, o qué aprendiste si no hubo resultado medible." },
  { clave: "evidencia",    tipo: "input",    ph: "Pega el enlace: repositorio, documento, publicación, video, perfil" },
  { clave: "competencias", tipo: "input",    ph: "Solo las que se infieran de lo que describiste", label: "Competencias demostradas" }
];

function campoHTML(c, i) {
  var r = REGLAS_PROY[c.clave];
  var id = "p" + i + "-" + c.clave;
  var etiqueta = r ? r.etiqueta : (c.label || c.clave);
  var control = c.tipo === "textarea"
    ? '<textarea id="' + id + '" class="p-' + c.clave + '" rows="' + (c.filas || 3) + '" placeholder="' + c.ph + '"></textarea>'
    : '<input type="text" id="' + id + '" class="p-' + c.clave + '" placeholder="' + c.ph + '">';

  var pie = r
    ? '<span class="cuenta" data-regla="' + c.clave + '">' +
        (r.unidad ? "Falta el " + r.unidad : '<b>0</b> de ' + r.min + ' palabras') + '</span>'
    : '<span class="hint opcional">Opcional</span>';

  return '<div class="field' + (c.ancho === "full" ? " field-full" : "") + '" data-campo="' + c.clave + '">' +
           '<label for="' + id + '">' + etiqueta + (r ? '' : ' <span class="sr">(opcional)</span>') + '</label>' +
           control + pie +
         '</div>';
}

function addProyecto(datos) {
  proyN++;
  var i = proyN;
  var fs = document.createElement("fieldset");
  fs.className = "proy";

  var enRejilla = CAMPOS_PROY.filter(function (c) { return c.ancho !== "full"; });

  fs.innerHTML =
    '<legend><span class="num-proy">Proyecto ' + i + '</span></legend>' +
    CAMPOS_PROY.filter(function (c) { return c.ancho === "full"; }).map(function (c) { return campoHTML(c, i); }).join("") +
    '<div class="grid2">' + enRejilla.map(function (c) { return campoHTML(c, i); }).join("") + '</div>' +

    /* Semáforo de la ficha: dice en una línea qué falta */
    '<div class="ficha-estado" role="status"></div>' +

    /* Traducción al inglés, dentro de la propia ficha */
    '<div class="trad">' +
      '<div class="actions">' +
        '<button type="button" class="trad-btn">Traducir al inglés</button>' +
        '<button type="button" class="trad-copiar-es" hidden>Copiar ficha en español</button>' +
        '<span class="trad-nota"></span>' +
      '</div>' +
      '<div class="trad-salida" hidden>' +
        '<div class="trad-cab"><span class="eyebrow">Versión en inglés</span>' +
        '<button type="button" class="trad-copiar">Copiar</button></div>' +
        '<pre class="trad-texto"></pre>' +
      '</div>' +
    '</div>' +

    '<div class="actions"><button type="button" class="del-proy">Eliminar este proyecto</button></div>';

  $("#proyectos-wrap").appendChild(fs);

  if (datos) {
    Object.keys(datos).forEach(function (clave) {
      var el = fs.querySelector(".p-" + clave);
      if (el) el.value = datos[clave] || "";
    });
  }

  renumerarProyectos();
  applyPlaceholders();
  evaluarFicha(fs);
  return fs;
}

/* ── Evaluación de una ficha ─────────────────────────────────
   Devuelve { vacia, completa, faltan: [etiquetas] }. Marca los
   campos cortos solo si tienen algo escrito: nadie merece ver
   todo en rojo antes de empezar. */
function evaluarFicha(fs) {
  var faltan = [], escrito = 0;

  Object.keys(REGLAS_PROY).forEach(function (clave) {
    var r = REGLAS_PROY[clave];
    var el = fs.querySelector(".p-" + clave);
    if (!el) return;

    var n = contarPalabras(el.value.trim());
    if (n) escrito++;

    var cuenta = fs.querySelector('.cuenta[data-regla="' + clave + '"]');
    if (cuenta) {
      /* Alcanzado el mínimo, el objetivo deja de ser información útil
         y estorba: se queda solo la cuenta. */
      cuenta.innerHTML = r.unidad
        ? (n >= r.min ? "Enlace escrito" : "Falta el " + r.unidad)
        : (n >= r.min
            ? "<b>" + n + "</b> palabras"
            : "<b>" + n + "</b> de " + r.min + " palabras");
      cuenta.classList.toggle("ok", n >= r.min);
      cuenta.classList.toggle("corto", n > 0 && n < r.min);
    }

    var campo = el.closest(".field");
    if (campo) campo.classList.toggle("corto", n > 0 && n < r.min);

    if (n < r.min) faltan.push(r.etiqueta);
  });

  var vacia = escrito === 0;
  var completa = faltan.length === 0;

  var estado = fs.querySelector(".ficha-estado");
  if (estado) {
    estado.classList.toggle("lista", completa);
    estado.classList.toggle("pendiente", !completa && !vacia);
    if (vacia) {
      estado.textContent = "Ficha sin empezar.";
    } else if (completa) {
      estado.textContent = "Ficha completa: cumple los mínimos de cada campo.";
    } else {
      estado.textContent = "Faltan por completar: " + faltan.join(", ") + ".";
    }
  }

  return { vacia: vacia, completa: completa, faltan: faltan };
}

/* La puerta: mientras ninguna ficha cumpla los mínimos, el botón
   «Siguiente» de la hoja de Proyectos queda desactivado y el aviso
   dice exactamente qué falta. El índice lateral sigue libre (es un
   índice, no una cerradura) y «Anterior» también, para que nadie
   quede atrapado. */
function puertaProyectos() {
  var hoja = document.getElementById("proyectos");
  if (!hoja) return;

  var r = evaluarProyectos();
  var admin = esAdministrador();
  var abierta = admin || r.completas > 0;

  var siguiente = hoja.querySelector('.pager button.solid[data-ir]');
  if (siguiente) {
    siguiente.disabled = !abierta;
    siguiente.title = abierta ? "" : "Completa al menos una ficha para continuar";
  }

  /* El índice dice la verdad sobre sí mismo: lo que está detrás de
     la regla se ve atenuado, con su explicación al pasar por encima. */
  navLinks.forEach(function (a, k) {
    var idx = hojas.map(function (h) { return "#" + h.id; }).indexOf(a.getAttribute("href"));
    var tras = idx > IDX_PROYECTOS;
    var cerrado = tras && !abierta;
    a.classList.toggle("bloqueado", cerrado);
    if (cerrado) a.setAttribute("aria-disabled", "true");
    else a.removeAttribute("aria-disabled");
    if (tras) a.title = cerrado ? "Completa una ficha de proyecto para llegar aquí" : "";
  });

  var aviso = document.getElementById("proy-puerta");
  if (!aviso) return;
  aviso.classList.toggle("lista", abierta);
  if (admin && r.completas === 0) {
    aviso.textContent = "Cuenta de administración: puedes recorrer las hojas sin completar fichas. " +
      "A quien construye su portafolio sí se le pide una ficha entera para continuar.";
  } else if (abierta) {
    aviso.textContent = r.completas === 1
      ? "Una ficha cumple los mínimos: ya puedes continuar."
      : r.completas + " fichas cumplen los mínimos: ya puedes continuar.";
  } else if (r.total === 0) {
    aviso.textContent = "Añade una ficha de proyecto para continuar.";
  } else if (r.primera && r.primera.vacia) {
    aviso.textContent = "Para continuar, completa una ficha entera. Ninguna tiene contenido todavía.";
  } else if (r.primera) {
    aviso.textContent = "Para continuar, completa una ficha entera. En la primera falta: " +
      r.primera.faltan.join(", ") + ".";
  }
}

/* Recorre todas las fichas y decide si se puede avanzar de hoja.
   Basta con que UNA esté completa: quien quiera dejar la segunda a
   medias puede hacerlo, aparecerá con marcadores en el PDF. */
function evaluarProyectos() {
  var fss = $$("#proyectos-wrap fieldset");
  var completas = 0, iniciadas = 0, primeraIncompleta = null;

  fss.forEach(function (fs) {
    var r = evaluarFicha(fs);
    if (r.completa) completas++;
    else if (!r.vacia) iniciadas++;
    if (!r.completa && !primeraIncompleta) primeraIncompleta = r;
  });

  return { total: fss.length, completas: completas, iniciadas: iniciadas, primera: primeraIncompleta };
}


/* Las fichas se renumeran al borrar una, para que no queden huecos */
function renumerarProyectos() {
  var fss = $$("#proyectos-wrap fieldset");
  fss.forEach(function (fs, k) {
    var n = fs.querySelector(".num-proy");
    if (n) n.textContent = "Proyecto " + (k + 1);
  });
  var c = $("#proy-cuenta");
  if (c) {
    c.textContent = fss.length === 0
      ? "Añade al menos un proyecto."
      : fss.length + (fss.length === 1 ? " ficha creada" : " fichas creadas") + " · recomendado: tres principales.";
  }
}

function applyPlaceholders() {
  var a = AREAS[areaKey()];
  if (!a) return;
  $$(".p-titulo").forEach(function (el) { el.placeholder = a.ph; });
}

/* Lee las fichas. Con incluirVacias en true devuelve todas, que es
   lo que hace falta para guardar; sin él, solo las que tienen texto. */
function leerProyectos(incluirVacias) {
  return $$("#proyectos-wrap fieldset").map(function (fs) {
    var g = function (c) { var el = fs.querySelector("." + c); return el ? el.value.trim() : ""; };
    return {
      titulo: g("p-titulo"), contexto: g("p-contexto"), objetivo: g("p-objetivo"),
      rol: g("p-rol"), acciones: g("p-acciones"), herr: g("p-herr"),
      resultado: g("p-resultado"), evidencia: g("p-evidencia"), competencias: g("p-competencias")
    };
  }).filter(function (p) {
    if (incluirVacias) return true;
    return p.titulo || p.contexto || p.objetivo || p.rol || p.acciones || p.resultado || p.evidencia;
  });
}

$("#add-proy").addEventListener("click", function () {
  var fs = addProyecto();
  var primero = fs.querySelector("input");
  if (primero) primero.focus();
  guardar();
});

/* ═══════════════ 6 · ADAPTACIÓN POR PROGRAMA ═══════════════ */
function adapt() {
  var a = AREAS[areaKey()], etapa = val("f-etapa"), nomProg = programaNombre();

  $("#adapt-intro").innerHTML = a
    ? "<b>" + (nomProg || a.label) + "</b>" + a.intro
    : "<b>Aún sin seleccionar</b>Elige tu programa para que la herramienta se ajuste a las características de los portafolios de tu disciplina.";

  $("#adapt-perfil").innerHTML = a
    ? "<b>Qué destacar en tu perfil</b>" + a.perfil
    : "<b>Sugerencia para tu programa</b>Vuelve a la hoja «Tu programa» y elige tu programa para ver qué conviene destacar aquí.";

  $("#adapt-impacto").innerHTML = a
    ? "<b>Cómo se mide el impacto en tu área</b>" + a.impacto
    : "<b>Cómo se mide en tu programa</b>Vuelve a la hoja «Tu programa» y elige tu programa para ver qué tipo de resultado es el pertinente.";

  $("#adapt-contacto").innerHTML = a
    ? "<b>Canales que se esperan en tu área</b>" + a.contacto
    : "<b>Canales para tu programa</b>Vuelve a la hoja «Tu programa» y elige tu programa para ver qué canales conviene incluir.";

  /* Tipos de evidencia, ordenados según la etapa */
  var wrap = $("#adapt-evidencias");
  if (!a) {
    wrap.innerHTML = '<div class="card"><h3>Selecciona tu programa</h3><p style="font-size:.92rem;color:var(--ink-soft)">Aquí aparecerán los tipos de evidencia propios de tu disciplina, diferenciados según tu etapa.</p></div>';
  } else {
    var esEst = etapa === "estudiante";
    var pri = esEst ? a.estudiante : a.graduado;
    var sec = esEst ? a.graduado : a.estudiante;
    wrap.innerHTML =
      '<div class="card" style="border-color: var(--azul)"><span class="eyebrow">Empieza por aquí</span><h3>' + (esEst ? "Como estudiante" : "Con trayectoria") + '</h3><ul>' + pri.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul></div>' +
      '<div class="card"><span class="eyebrow" style="color:var(--ink-faint)">' + (esEst ? "Si ya tienes experiencia laboral" : "También cuenta tu etapa formativa") + '</span><h3>Evidencia complementaria</h3><ul>' + sec.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul></div>';
  }

  var av = $("#adapt-aviso");
  if (a) { av.hidden = false; av.innerHTML = "<b>Antes de publicar en tu área:</b> " + a.aviso; }
  else { av.hidden = true; av.innerHTML = ""; }

  /* Plataformas recomendadas */
  var keys = a ? a.plat : ["wix", "carrd", "notion", "canva", "behance", "adobe", "github"];
  $("#plats").innerHTML = keys.map(function (k, idx) {
    var p = PLAT[k];
    return '<div class="card plat' + (a && idx === 0 ? " rec" : "") + '">' +
      (a && idx === 0 ? '<span class="rec-tag">Recomendada para tu área</span>' : '') +
      '<h3><a class="plat-link" href="' + p.url + '" target="_blank" rel="noopener noreferrer">' +
        p.n + '<span class="ext" aria-hidden="true">↗</span>' +
        '<span class="sr">(se abre en una pestaña nueva)</span></a></h3><dl>' +
      '<dt>Para</dt><dd>' + p.para + '</dd><dt>Ventaja</dt><dd>' + p.ven + '</dd>' +
      '<dt>Límite</dt><dd>' + p.lim + '</dd><dt>Edición</dt><dd>' + p.ed + '</dd>' +
      '<dt>Prepara</dt><dd>' + p.prep + '</dd></dl></div>';
  }).join("");

  $("#adapt-plataforma").innerHTML = a
    ? "<b>Recomendación para " + (nomProg || a.label) + "</b>Estas tres se ajustan al tipo de evidencia de tu programa. La primera es la que mejor encaja."
    : "<b>Recomendación</b>Elige tu programa para ver cuál se ajusta mejor a tus evidencias.";

  buildCheck(a);
  applyPlaceholders();
}

/* ═══════════════ 7 · CHECKLIST ═══════════════ */
/* conservar en false vacía las marcas: se usa al empezar de nuevo */
function buildCheck(a, conservar) {
  var box = $("#check"), prev = {};
  if (conservar !== false) {
    $$("#check input").forEach(function (i) { prev[i.dataset.txt] = i.checked; });
  }

  var items = CHECK_BASE.map(function (t) { return { t: t, esp: false }; });
  if (a) { a.check.forEach(function (t) { items.push({ t: t, esp: true }); }); }

  box.innerHTML = items.map(function (it) {
    return '<label' + (it.esp ? ' class="esp"' : '') + '>' +
      '<input type="checkbox" data-txt="' + it.t.replace(/"/g, "&quot;") + '"' + (prev[it.t] ? " checked" : "") + '>' +
      '<span>' + it.t + '</span></label>';
  }).join("");

  refreshCheck();
}

function refreshCheck() {
  var b = $$("#check input");
  var n = b.filter(function (x) { return x.checked; }).length;
  $("#c-count").textContent = n + " de " + b.length;
  $("#c-fill").style.width = (b.length ? n / b.length * 100 : 0) + "%";
}

document.addEventListener("change", function (e) {
  if (e.target.closest && e.target.closest("#check")) { refreshCheck(); guardar(); }
});

function checklistMd() {
  var o = ["## Lista de verificación antes de publicar", ""];
  $$("#check input").forEach(function (i) {
    o.push("- [" + (i.checked ? "x" : " ") + "] " + i.dataset.txt);
  });
  return o.join("\n");
}

/* ═══════════════ 8 · VISTA PREVIA Y ARMADO ═══════════════ */
/* Fichas de proyecto en Markdown. Lo usan por igual el portafolio
   completo y la descarga suelta de esta sección, para que el texto
   nunca diverja entre las dos salidas. */
function bloqueProyectos(o) {
  var ps = leerProyectos(false);
  o.push("## Proyectos y evidencias", "");
  if (!ps.length) {
    o.push("[Aún no has redactado ninguna ficha de proyecto. Recuerda: tres proyectos bien contados valen más que diez enumerados.]", "");
    return o;
  }
  ps.forEach(function (p) {
    o.push("### " + ph(p.titulo, "Título del proyecto"), "");
    o.push("**Contexto o reto:** " + ph(p.contexto, "Dato por completar"));
    o.push("**Objetivo:** " + ph(p.objetivo, "Dato por completar"));
    o.push("**Mi rol:** " + ph(p.rol, "Dato por completar"));
    o.push("**Acciones y decisiones:** " + ph(p.acciones, "Dato por completar"));
    if (p.herr) o.push("**Herramientas o métodos:** " + p.herr);
    o.push("**Resultado o impacto:** " + ph(p.resultado, "Resultado por confirmar"));
    o.push("**Evidencia:** " + ph(p.evidencia, "Evidencia pendiente"));
    if (p.competencias) o.push("**Competencias demostradas:** " + p.competencias);
    o.push("");
  });
  return o;
}

/* Solo las fichas de proyecto, como documento aparte. Encabeza con
   quien las firma para que el archivo se entienda por si mismo. */
function armarProyectos() {
  var o = [], firma = [
    val("f-nombre"),
    programaNombre(),
    val("f-facultad")
  ].filter(Boolean).join(" · ");

  if (firma) o.push("*" + firma + "*", "");
  bloqueProyectos(o);
  o.push("---", "");
  o.push("*Fichas redactadas con la herramienta de portafolios del Centro de Desarrollo Profesional, Universidad de La Sabana. Revisa cada marcador entre corchetes antes de publicarlas.*");
  return o.join("\n");
}

function armar() {
  var a = AREAS[areaKey()], o = [];

  /* Identidad */
  o.push("# " + ph(val("f-nombre"), "Tu nombre completo"), "");
  /* Segunda línea: programa, facultad y campo de desempeño. La
     facultad solo aparece cuando el programa viene de la lista. */
  var l2 = [
    programaNombre() || (a ? a.label : ""),
    val("f-facultad"),
    val("f-campo")
  ].filter(Boolean).join(" · ");
  o.push(l2 || "[Programa académico y campo de desempeño]", "");
  o.push("> " + ph(val("f-valor"), "Propuesta de valor: profesional en [campo] que [acción] para [público o resultado]"), "");

  /* Perfil */
  o.push("## Perfil profesional", "");
  o.push(ph(val("f-perfil"), "Perfil por escribir: quién eres, qué sabes hacer, qué herramientas usas, qué te fortalece y qué te diferencia"), "");

  var cap = lines(val("f-capacidades"));
  if (cap.length) { o.push("**Capacidades principales**", ""); cap.forEach(function (c) { o.push("- " + c); }); o.push(""); }

  var her = lines(val("f-herramientas"));
  if (her.length) { o.push("**Herramientas y metodologías**", "", her.join(" · "), ""); }

  if (val("f-formacion")) { o.push("**Formación destacada:** " + val("f-formacion"), ""); }

  /* Proyectos */
  bloqueProyectos(o);

  /* Impacto */
  var log = lines(val("f-logros")), tes = val("f-testimonio");
  if (log.length || tes) {
    o.push("## Impacto", "");
    log.forEach(function (l) { o.push("- " + l); });
    if (log.length) o.push("");
    if (tes) o.push("> " + tes, "", "*(Testimonio publicado con autorización de quien lo emite.)*", "");
  }

  /* Contacto */
  o.push("## Contacto", "");
  var canales = [val("f-correo"), val("f-linkedin"), val("f-otro")].filter(Boolean);
  o.push(canales.length ? canales.join(" · ") : "[Correo profesional] · [LinkedIn] · [Otro canal]", "");
  o.push(ph(val("f-cta"), "Llamado a la acción: qué esperas que hagan después de leer tu portafolio"), "");

  /* Pie de contexto */
  o.push("---", "");
  var ctx = [];
  if (val("f-facultad")) ctx.push("Facultad: " + val("f-facultad"));
  if (a) ctx.push("Área: " + a.label);
  ctx.push("Etapa: " + textoElegido("f-etapa"));
  ctx.push("Objetivo: " + (OBJETIVOS[val("f-objetivo")] || val("f-objetivo")));
  if (val("f-audiencia")) ctx.push("Audiencia: " + val("f-audiencia"));
  o.push("*" + ctx.join(" · ") + "*", "");
  o.push("*Estructura construida con la herramienta de portafolios del Centro de Desarrollo Profesional, Universidad de La Sabana. Revisa cada marcador entre corchetes antes de publicar.*");

  return o.join("\n");
}

/* Avance por secciones, en la hoja de resultado y en el índice */
function progreso() {
  var hechas = 0;
  var estados = {
    identidad: !!(val("f-nombre") || val("f-valor")),
    perfil:    !!(val("f-perfil") || val("f-capacidades")),
    proyectos: leerProyectos(false).length > 0,
    impacto:   !!(val("f-logros") || val("f-testimonio")),
    contacto:  !!(val("f-correo") || val("f-linkedin") || val("f-cta"))
  };
  Object.keys(estados).forEach(function (k) { if (estados[k]) hechas++; });

  $("#p-count").textContent = hechas + " de 5 secciones";
  $("#p-fill").style.width = (hechas / 5 * 100) + "%";
  $("#nav-fill").style.width = (hechas / 5 * 100) + "%";
  $("#nav-num").textContent = hechas + " de 5";

  $$("nav.toc a[data-step]").forEach(function (link) {
    link.classList.toggle("done", !!estados[link.dataset.step]);
  });
  return hechas;
}

var salida = $("#salida");

function render() {
  var vacio = !val("f-nombre") && !val("f-valor") && !val("f-perfil") &&
              !leerProyectos(false).length && !val("f-correo");

  if (vacio) {
    salida.textContent = "Completa las hojas anteriores y tu portafolio aparecerá aquí.";
    salida.classList.add("empty");
  } else {
    salida.textContent = armar();
    salida.classList.remove("empty");
  }

  var cv = $("#cont-valor");
  if (cv) cv.textContent = contarPalabras(val("f-valor"));

  /* Reglas de las fichas: cuentan palabras, marcan lo corto y
     deciden si la hoja de Proyectos deja pasar a la siguiente. */
  puertaProyectos();

  /* Descarga suelta de las fichas: solo tiene sentido si hay alguna */
  var hayProy = leerProyectos(false).length > 0;
  ["#dl-proy", "#copy-proy"].forEach(function (sel) {
    var btn = $(sel);
    if (btn) btn.disabled = !hayProy;
  });
  var avisoProy = $("#proy-aviso");
  if (avisoProy) {
    avisoProy.textContent = hayProy
      ? "Se descargan solo estas fichas; el portafolio completo está en la hoja «Tu portafolio»."
      : "Redacta al menos una ficha para poder descargarlas.";
  }

  progreso();
}

/* ═══════════════ 8b · TRADUCCIÓN AL INGLÉS ═══════════════ */
/* El traductor del navegador ejecuta el modelo en el equipo: el
   texto no sale de aquí, igual que el resto de la herramienta.
   Si el navegador no lo trae, se dice claramente en vez de dejar
   un botón que no hace nada. */

/* El traductor del navegador exige «contexto seguro»: una página
   servida por https. Abierta con doble clic desde el disco (file://)
   la API no existe, y decir solo «tu navegador no lo incluye» manda
   a la persona a cambiar de navegador cuando el problema es otro. */
function abiertaDesdeArchivo() {
  return window.location.protocol === "file:";
}

/* ══════════════════════════════════════════════════════════════
   EL PORTAFOLIO ES DE LA CUENTA
   --------------------------------------------------------------
   Con la sesión abierta, lo que se escribe se guarda en Supabase
   bajo la cuenta de quien lo escribe: sigue en el mismo punto al
   abrirlo desde otro computador, y el Centro puede saber si la
   herramienta se usa y quién se queda a medias.

   Antes había aquí una contabilidad aparte (cuántas secciones,
   cuántas fichas) que se mandaba a una tabla de métricas mientras el
   texto se quedaba en el navegador. Ya no hace falta: guardado el
   contenido de verdad, esas cifras se calculan en el consolidado a
   partir de él, y así no pueden quedar desfasadas.

   Sin cuenta no se manda nada: se trabaja contra el navegador,
   igual que siempre.
   ══════════════════════════════════════════════════════════════ */

/* ── Cambio de cuenta ─────────────────────────────────────────
   Al entrar o salir hay que cambiar de borrador, no solo de llave.
   Si no se vacía primero lo que hay en pantalla, la primera tecla
   que se pulse guardaría el texto de la cuenta anterior bajo la
   llave de la nueva, que es justo la mezcla que se quiere evitar. */
function vaciarFormulario(){
  CAMPOS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });
  var sel = $("#f-programa"); if (sel) sel.value = "";
  var et = $("#f-etapa");     if (et)  et.value = "estudiante";
  var ob = $("#f-objetivo");  if (ob)  ob.value = "practica";
  $("#proyectos-wrap").innerHTML = "";
  proyN = 0;
  $$("#check input").forEach(function (i) { i.checked = false; });
}

var llaveActual = "";

function arrancarVacio() {
  addProyecto(); addProyecto(); addProyecto();
  marcarGuardado("Se guarda solo mientras escribes", false);
}

function cambiarDeBorrador(){
  var nueva = llaveDelBorrador();
  if (nueva === llaveActual) return;      /* la sesión no cambió de dueño */
  llaveActual = nueva;

  /* Lo pendiente se cancela: si no, el temporizador escribiría lo de
     la cuenta anterior bajo la llave (y en el portafolio) de la nueva. */
  clearTimeout(guardarTimer);
  clearTimeout(nubeTimer);
  Nube.portafolioId = "";
  Nube.proyectoIds = [];
  Nube.seccionIds = {};
  Nube.enviado = null;
  Nube.fallo = "";
  migracionPendiente = false;

  vaciarFormulario();

  /* Sin cuenta se trabaja como siempre, contra el navegador. */
  if (!hayNube()) {
    if (!restaurar()) { arrancarVacio(); }
    syncPrograma();
    render();
    pintarAvisoNube();
    return;
  }

  marcarGuardado("Abriendo tu portafolio…", true);
  cargarDeNube();
}

/* La carga desde la cuenta. Es el único sitio donde el formulario se
   rellena con algo que viene de fuera de este navegador. */
function cargarDeNube() {
  Nube.cargando = true;
  api("/portafolio/contenido", "GET").then(function (r) {
    r = r || {};
    indexarNube(r);

    if (r.portafolio) {
      aplicarDatos(datosDesdeNube(r));
      Nube.enviado = instantanea();
      escribirLocal(serializar());          /* copia de respaldo al día */
      marcarGuardado("Recuperado de tu cuenta", false);
      Nube.fallo = "";
      Nube.cargando = false;
      syncPrograma();
      render();
      pintarAvisoNube();
      return;
    }

    /* La cuenta está vacía. Si en este navegador hay trabajo escrito,
       se muestra y se pregunta antes de subirlo. */
    var candidato = borradorMigrable();
    if (candidato) {
      arrancarVacio();
      Nube.cargando = false;
      migracionPendiente = true;
      migracionCandidato = candidato;
      marcarGuardado("Sin subir a tu cuenta todavía", false);
      syncPrograma();
      render();
      pintarAvisoNube("migrar");
      return;
    }

    arrancarVacio();
    Nube.cargando = false;
    marcarGuardado("Se guarda solo en tu cuenta", false);
    syncPrograma();
    render();
    pintarAvisoNube();

  }).catch(function (err) {
    /* No se pudo leer la cuenta. Se sigue con lo que haya en el
       navegador en vez de dejar a nadie con la pantalla en blanco. */
    Nube.fallo = (err && err.message) || "sin detalle";
    if (window.console) console.warn("No se pudo abrir el portafolio de la cuenta:", Nube.fallo);
    Nube.cargando = false;
    if (!restaurar()) { arrancarVacio(); }
    syncPrograma();
    render();
    pintarAvisoNube();
  });
}

/* ── El aviso de arriba ──────────────────────────────────────
   Dos estados y nada más: la pregunta de la migración y el fallo de
   sincronización. Cuando todo va bien no hay banda: que el guardado
   funcione no es noticia. */
function pintarAvisoNube(modo) {
  var caja = $("#nube-aviso");
  if (!caja) return;

  /* Una pregunta sin contestar no la tapa nada: cualquier otro
     repintado la vuelve a dibujar en vez de esconderla. */
  if (migracionPendiente) modo = "migrar";
  caja.innerHTML = "";

  if (modo === "migrar") {
    caja.className = "nube-aviso pregunta";
    caja.hidden = false;

    var p = document.createElement("p");
    p.textContent = "Encontramos información guardada en este dispositivo. " +
      "¿Quieres sincronizarla con tu cuenta?";
    caja.appendChild(p);

    /* Se dice cuánto hay, no qué dice. Quien lo escribió pudo ser
       otra persona en este mismo computador. */
    var resumen = document.createElement("p");
    resumen.className = "nube-resumen";
    resumen.textContent = resumenDelCandidato() +
      " No la mostramos hasta que digas que es tuya.";
    caja.appendChild(resumen);

    var acciones = document.createElement("div");
    acciones.className = "actions";

    var si = document.createElement("button");
    si.type = "button";
    si.className = "solid";
    si.textContent = "Sí, sincronizarla";
    si.addEventListener("click", function () {
      migracionPendiente = false;
      si.disabled = true;
      si.textContent = "Sincronizando…";
      /* Ahora sí: la persona dijo que es suya. */
      if (migracionCandidato) {
        aplicarDatos(migracionCandidato);
        syncPrograma();
        render();
      }
      migrarLocalStorageASupabase().then(function (bien) {
        if (bien) { caja.hidden = true; toast("Tu portafolio quedó guardado en tu cuenta"); }
        else { pintarAvisoNube(); }
      });
    });

    var no = document.createElement("button");
    no.type = "button";
    no.textContent = "No, empezar en blanco";
    no.addEventListener("click", function () {
      /* Hay que vaciar de verdad: si el formulario se quedara con el
         texto viejo, el primer guardado lo subiría igualmente y la
         respuesta de la persona no habría servido de nada. */
      migracionPendiente = false;
      migracionCandidato = null;
      apuntarQueDijoQueNo();
      vaciarFormulario();
      arrancarVacio();
      syncPrograma();
      render();
      caja.hidden = true;
    });

    acciones.appendChild(si);
    acciones.appendChild(no);
    caja.appendChild(acciones);
    return;
  }

  if (Nube.fallo) {
    caja.className = "nube-aviso fallo";
    caja.hidden = false;
    var f = document.createElement("p");
    /* El detalle técnico no se le enseña a quien está escribiendo su
       portafolio: no puede hacer nada con él. Queda en el «title» y
       en la consola, que es donde lo busca quien mantiene esto. */
    f.title = Nube.fallo;
    f.textContent = "Estamos teniendo dificultades para sincronizar tu información. " +
      "Tus datos permanecen disponibles temporalmente en este dispositivo.";
    caja.appendChild(f);
    return;
  }

  caja.hidden = true;
}

function hayRegistro() {
  return typeof api === "function" && typeof Cuenta !== "undefined" && !!(Cuenta && Cuenta.sesion);
}

/* ══════════════════════════════════════════════════════════════
   CONSOLIDADO PARA ADMINISTRACIÓN
   --------------------------------------------------------------
   Solo existe para las cuentas con rol de administración. No es
   una hoja del recorrido: no cuenta para el avance ni aparece en
   el paginador.
   ══════════════════════════════════════════════════════════════ */
var admFilas = [];
var admRevisiones = [];   /* las segundas opiniones de todo el mundo */

/* Una cuenta del propio Centro. Aparece en la lista, marcada, pero
   no cuenta como persona atendida: quien administra necesita verse
   a sí mismo para saber que la herramienta está guardando, y a la
   vez no quiere salir en la estadística del servicio. */
function esCuentaDelCentro(x) { return x && x.es_admin === true; }

/* Las personas atendidas: todo el mundo menos el Centro. Es lo que
   alimenta los indicadores, el desglose por programa y el Excel. */
function admPersonas() {
  return admFilas.filter(function (x) { return !esCuentaDelCentro(x); });
}

function esAdministrador() {
  return typeof Cuenta !== "undefined" && Cuenta && typeof Cuenta.esAdmin === "function" && Cuenta.esAdmin();
}

/* Muestra o esconde todo lo de administración de una vez. */
/* Las dos hojas de administración. No son parte del recorrido: no
   cuentan para el avance ni salen en el paginador. */
var HOJAS_ADMIN = ["admin", "usuarios"];

function pintarAccesoAdmin() {
  var admin = esAdministrador();
  var nav = $("#nav-admin"), grupo = $("#g-admin");
  if (!nav || !grupo) return;

  nav.hidden = !admin;
  grupo.hidden = !admin;

  HOJAS_ADMIN.forEach(function (id) {
    var hoja = document.getElementById(id);
    if (!hoja) return;
    hoja.hidden = !admin;
    if (!admin) hoja.classList.remove("on");
  });

  if (admin && !admFilas.length) cargarConsolidado();
}

function irAHojaAdmin(id) {
  if (!esAdministrador()) return;
  var hoja = document.getElementById(id);
  if (!hoja) return;

  hojas.forEach(function (h) { h.classList.remove("on"); });
  HOJAS_ADMIN.forEach(function (x) {
    var el = document.getElementById(x);
    if (el) el.classList.toggle("on", x === id);
  });

  navLinks.forEach(function (l) {
    var activo = l.getAttribute("href") === "#" + id;
    l.classList.toggle("on", activo);
    if (activo) { l.setAttribute("aria-current", "page"); } else { l.removeAttribute("aria-current"); }
  });
  abrirGrupoDeHoja(id);
  cerrarMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function irAlConsolidado() { irAHojaAdmin("admin"); }

function admAviso(txt) {
  var a = $("#adm-aviso");
  if (a) a.textContent = txt || "";
}

function cargarConsolidado() {
  if (!esAdministrador()) return;
  admAviso("");
  $("#adm-sub").textContent = "Cargando consolidado…";
  /* Las revisiones se piden en paralelo y su fallo no tumba el
     consolidado: son un extra, no la razón de esta hoja. */
  api("/admin/revisiones", "GET").then(function (r) {
    var lista = r && r.revisiones;
    admRevisiones = Array.isArray(lista) ? lista : [];
  }).catch(function () {
    admRevisiones = [];
  }).then(function () {
    if (admFilas.length) { pintarConsolidado(); pintarUsuarios(); }
  });

  api("/admin/portafolios", "GET").then(function (r) {
    admFilas = (r && Array.isArray(r.portafolios)) ? r.portafolios : [];
    pintarConsolidado();
    pintarUsuarios();
  }).catch(function (err) {
    $("#adm-sub").textContent = "No se pudo cargar el consolidado.";
    admAviso("No se pudo leer el consolidado: " + ((err && err.message) || "error desconocido") +
      ". Corre supabase/sql/portafolio-contenido.sql en el editor SQL de Supabase y, justo " +
      "después, «notify pgrst, \'reload schema\';»: si el mensaje habla de «schema cache», la " +
      "función existe pero la API todavía no la ve.");
    $("#adm-cuerpo").innerHTML = "";
    $("#adm-prog-cuerpo").innerHTML = "";
    $("#adm-kpis").innerHTML = "";
    $("#adm-revision").hidden = true;
  });
}

/* El texto visible de un desplegable, o cadena vacía si lo
   seleccionado ya no existe entre las opciones. */
function textoElegido(id) {
  var sel = document.getElementById(id);
  if (!sel || sel.selectedIndex < 0) return "";
  var opt = sel.options[sel.selectedIndex];
  return opt ? opt.text : "";
}

/* ══════════════════════════════════════════════════════════════
   LAS SEGUNDAS OPINIONES, DESDE EL CONSOLIDADO
   --------------------------------------------------------------
   El CDP atiende a estas personas. Llegar a la asesoría sabiendo
   qué le señaló la máquina ahorra media sesión, así que aquí se
   pueden leer las revisiones de cada quien.

   Lo que NO se abre es el borrador: el portafolio en sí sigue
   siendo ilegible para cualquiera que no sea su dueño, y de eso se
   encargan las políticas de la base, no este código. Está dicho en
   pantalla antes de que nadie pida una revisión.
   ══════════════════════════════════════════════════════════════ */

function revisionesPorPersona() {
  var g = {};
  admRevisiones.forEach(function (r) {
    var k = r.usuario_id;
    if (!k) return;
    if (!g[k]) g[k] = [];
    g[k].push(r);
  });
  return g;
}

function celdaRevisiones(x) {
  var suyas = revisionesPorPersona()[x.usuario_id] || [];
  if (!suyas.length) return '<span class="adm-no">—</span>';
  return '<button type="button" class="adm-ver" data-revisiones="' +
    esc(String(x.usuario_id)) + '">Ver (' + suyas.length + ")</button>";
}

var admRevAbierta = "";

function abrirRevisionesDe(usuarioId, cual, dondeId) {
  var caja = $(dondeId || "#adm-revision");
  if (!caja) return;

  var suyas = revisionesPorPersona()[usuarioId] || [];
  if (!suyas.length) { caja.hidden = true; return; }

  admRevAbierta = usuarioId;
  var elegida = cual
    ? (suyas.filter(function (r) { return String(r.id) === String(cual); })[0] || suyas[0])
    : suyas[0];

  caja.hidden = false;
  caja.innerHTML = "";

  var cab = document.createElement("div");
  cab.className = "adm-revision-cab";

  var quien = document.createElement("div");
  var h = document.createElement("h3");
  h.textContent = elegida.nombre || elegida.correo || "Sin nombre";
  var sub = document.createElement("p");
  sub.className = "adm-correo";
  sub.textContent = [elegida.correo, elegida.programa].filter(Boolean).join(" · ");
  quien.appendChild(h);
  quien.appendChild(sub);
  cab.appendChild(quien);

  var cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.textContent = "Cerrar";
  cerrar.addEventListener("click", function () {
    caja.hidden = true;
    admRevAbierta = "";
  });
  cab.appendChild(cerrar);
  caja.appendChild(cab);

  /* Con más de una revisión, la gracia está en comparar: la de hoy
     contra la de hace dos semanas es donde se ve si avanzó. */
  if (suyas.length > 1) {
    var fechas = document.createElement("div");
    fechas.className = "adm-revision-fechas";
    suyas.forEach(function (r) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = fechaCorta(r.creado_en);
      if (String(r.id) === String(elegida.id)) b.className = "activa";
      b.setAttribute("data-revision", r.id);
      b.setAttribute("data-de", usuarioId);
      fechas.appendChild(b);
    });
    caja.appendChild(fechas);
  } else {
    var sola = document.createElement("p");
    sola.className = "adm-revision-fecha";
    sola.textContent = "Pedida el " + fechaCorta(elegida.creado_en);
    caja.appendChild(sola);
  }

  var cuerpo = document.createElement("div");
  cuerpo.className = "revision-salida";
  construirRevision(cuerpo, revisionDesdeFila(elegida), false);
  caja.appendChild(cuerpo);

  caja.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* Los botones nacen y mueren con cada repintado de la tabla, así que
   se escuchan desde la hoja. */
$("#admin").addEventListener("click", function (e) {
  var b = e.target && e.target.closest ? e.target.closest("button") : null;
  if (!b) return;
  if (b.hasAttribute("data-revisiones")) {
    abrirRevisionesDe(b.getAttribute("data-revisiones"));
    return;
  }
  if (b.hasAttribute("data-revision")) {
    abrirRevisionesDe(b.getAttribute("data-de"), b.getAttribute("data-revision"));
  }
});

/* ══════════════════════════════════════════════════════════════
   REVISIÓN USUARIOS
   --------------------------------------------------------------
   El consolidado cuenta; esta hoja mira persona por persona. Trae
   lo mismo que el panel del Pitch, para que las dos herramientas se
   usen igual: la rosca del reparto con su desglose, los filtros por
   facultad y programa, y la ficha de cada quien.

   POR QUÉ LA ROSCA ES DE UN SOLO TONO Y DE CINCO SECTORES
   Una rosca sirve para ver una proporción de un vistazo, no para
   comparar valores parecidos, y deja de leerse pasados unos seis
   sectores. Con diez facultades se pintan las cuatro mayores y el
   resto se agrupa; el detalle completo está en la tabla, que es
   además el respaldo accesible de la gráfica.

   Cualquier sector puede quedar junto a cualquier otro, así que
   todos los pares cuentan: con más de tres tonos distintos esos
   pares dejan de distinguirse para quien no percibe bien el color.
   Una escala de claridad del azul institucional lo evita y dice dos
   veces lo mismo, más grande y más oscuro es más gente. La
   identidad nunca depende del color: cada sector lleva su etiqueta,
   su cifra y su porcentaje en la leyenda.
   ══════════════════════════════════════════════════════════════ */

var ROSCA_TONOS = ["#001459", "#2A5AA8", "#5E93CE", "#A3C3E6"];
var ROSCA_OTRAS = "#5C6472";
var ROSCA_MAX = 4;      /* sectores con nombre propio; el quinto agrupa */

/* Un sector es un arco entre dos radios. Se dibuja como trazo
   grueso sobre un círculo: sale más simple y más nítido que
   componer el path a mano. */
function arcoRosca(desde, hasta, color, id) {
  var R = 36, C = 2 * Math.PI * R;
  var largo = Math.max(0, hasta - desde) * C;
  var hueco = 1.6;      /* aire entre sectores, sin inventar un borde */
  var visible = Math.max(0.5, largo - hueco);
  return '<circle class="rosca-sector" data-sector="' + id + '"' +
    ' cx="50" cy="50" r="' + R + '" fill="none"' +
    ' stroke="' + color + '" stroke-width="17"' +
    ' stroke-dasharray="' + visible.toFixed(2) + " " + (C - visible).toFixed(2) + '"' +
    ' stroke-dashoffset="' + (-desde * C).toFixed(2) + '"' +
    ' transform="rotate(-90 50 50)"><title></title></circle>';
}

/* datos: [{nombre, valor, clave}] sin ordenar. «clave» es a dónde
   lleva el sector si se pulsa. Sin alElegir la rosca solo se mira. */
function pintarRosca(titulo, datos, etiquetaCentro, alElegir) {
  var zona = $("#rosca-zona");
  if (!zona) return;

  var con = datos.filter(function (d) { return d.valor > 0; })
                 .sort(function (a, b) { return b.valor - a.valor; });
  var total = con.reduce(function (a, d) { return a + d.valor; }, 0);

  zona.hidden = false;
  $("#rosca-titulo").textContent = titulo;

  if (!total) {
    $("#rosca-svg").innerHTML =
      '<circle cx="50" cy="50" r="36" fill="none" stroke="#E9EEF7" stroke-width="17"/>';
    $("#rosca-total").textContent = "0";
    $("#rosca-leyenda").innerHTML =
      '<div class="rosca-vacia">Todavía no hay a nadie registrado aquí.</div>';
    $("#rosca-alt").textContent = "Sin datos que representar.";
    return;
  }

  var trozos = con.slice(0, ROSCA_MAX).map(function (d, i) {
    return { nombre: d.nombre, valor: d.valor, color: ROSCA_TONOS[i], clave: d.clave || d.nombre };
  });
  var resto = con.slice(ROSCA_MAX);
  if (resto.length) {
    var uno = resto.length === 1;
    trozos.push({
      nombre: uno ? resto[0].nombre : "Otras " + resto.length,
      valor: resto.reduce(function (a, d) { return a + d.valor; }, 0),
      color: uno ? ROSCA_TONOS[ROSCA_MAX - 1] : ROSCA_OTRAS,
      /* El sector agrupado no lleva a ninguna parte: son varias. */
      clave: uno ? (resto[0].clave || resto[0].nombre) : null,
      agrupa: uno ? null : resto.map(function (d) { return d.nombre; })
    });
  }

  var acumulado = 0;
  $("#rosca-svg").innerHTML = trozos.map(function (t, i) {
    var desde = acumulado;
    acumulado += t.valor / total;
    return arcoRosca(desde, acumulado, t.color, i);
  }).join("");
  $("#rosca-total").textContent = total;

  var navegable = function (i) { return !!(alElegir && trozos[i].clave); };

  $("#rosca-leyenda").innerHTML = trozos.map(function (t, i) {
    var pct = Math.round(t.valor / total * 100);
    var eti = t.agrupa ? "Agrupa " + t.agrupa.length + ": " + t.agrupa.join(", ") : t.nombre;
    /* La leyenda es un botón cuando lleva a alguna parte: es un
       blanco mucho mayor que el arco y funciona con el teclado. */
    var tag = navegable(i) ? "button" : "div";
    var extra = navegable(i)
      ? ' type="button" class="rosca-item navega" data-rosca="' + i + '"'
      : ' class="rosca-item"';
    return "<" + tag + extra + ' title="' + esc(eti) + '">' +
      '<span class="rosca-punto" style="background:' + t.color + '"></span>' +
      '<span class="rosca-nom">' + esc(t.nombre) + "</span>" +
      '<span class="rosca-val">' + t.valor + "</span>" +
      '<span class="rosca-pct">' + pct + " %</span></" + tag + ">";
  }).join("");

  $$("#rosca-svg [data-sector]").forEach(function (el) {
    var i = Number(el.getAttribute("data-sector")), t = trozos[i];
    var pct = Math.round(t.valor / total * 100);
    var tit = el.querySelector("title");
    if (tit) {
      tit.textContent = t.nombre + ": " + t.valor + " de " + total + " (" + pct + " %)" +
        (navegable(i) ? ". Pulsa para ver solo esta parte."
                      : (t.agrupa ? ". Agrupa " + t.agrupa.length + ", están en la tabla." : ""));
    }
    if (!navegable(i)) return;
    el.classList.add("navega");
    el.addEventListener("click", function () { alElegir(t.clave); });
  });

  $$("#rosca-leyenda [data-rosca]").forEach(function (b) {
    b.addEventListener("click", function () {
      alElegir(trozos[Number(b.getAttribute("data-rosca"))].clave);
    });
  });

  $("#rosca-alt").textContent = titulo + ". " +
    trozos.map(function (t) { return t.nombre + ", " + t.valor; }).join("; ") +
    ". Total " + total + " " + (etiquetaCentro || "personas") +
    ". El detalle completo está en la tabla siguiente.";
}

/* ── Estado de los filtros ──────────────────────────────────── */
var usFacultad = "", usPrograma = "", usBusca = "", usElegida = "";
var usConCentro = false;   /* ¿se enseñan también las cuentas del CDP? */

function usTodas() {
  var cuenta = revisionesPorPersona();
  var base = usConCentro ? admFilas : admPersonas();
  return base.map(function (x) {
    var suyas = cuenta[x.usuario_id] || [];
    return {
      id: x.usuario_id,
      nombre: x.nombre || x.correo || "Sin nombre",
      correo: x.correo || "",
      facultad: x.facultad || "",
      programa: x.programa || "",
      etapa: x.etapa || "",
      hojas: Number(x.hojas_completas) || 0,
      fichas: Number(x.fichas_completas) || 0,
      fichasTotal: Number(x.fichas_total) || 0,
      descargado: !!x.descargado,
      actualizado: x.actualizado_en,
      revisiones: suyas.length,
      delCentro: esCuentaDelCentro(x)
    };
  });
}

function usFiltradas() {
  var q = usBusca.trim().toLowerCase();
  return usTodas().filter(function (p) {
    if (usFacultad && p.facultad !== usFacultad) return false;
    if (usPrograma && p.programa !== usPrograma) return false;
    if (q && (p.nombre + " " + p.correo).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

/* Cuenta por clave, para la rosca. */
function usAgrupar(lista, campo) {
  var g = {};
  lista.forEach(function (p) {
    var k = p[campo] || "Sin " + campo;
    g[k] = (g[k] || 0) + 1;
  });
  return Object.keys(g).map(function (k) { return { nombre: k, valor: g[k], clave: k }; });
}

function pintarRutaUsuarios() {
  var ruta = $("#us-ruta");
  if (!ruta) return;
  ruta.innerHTML = "";

  var pasos = [{ txt: "Todas las facultades", ir: function () { usFacultad = ""; usPrograma = ""; pintarUsuarios(); } }];
  if (usFacultad) pasos.push({ txt: usFacultad, ir: function () { usPrograma = ""; pintarUsuarios(); } });
  if (usPrograma) pasos.push({ txt: usPrograma, ir: null });

  pasos.forEach(function (p, i) {
    if (i) {
      var sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "›";
      ruta.appendChild(sep);
    }
    var ultimo = i === pasos.length - 1;
    if (ultimo) {
      var aqui = document.createElement("span");
      aqui.className = "aqui";
      aqui.textContent = p.txt;
      ruta.appendChild(aqui);
      return;
    }
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = p.txt;
    b.addEventListener("click", p.ir);
    ruta.appendChild(b);
  });
}

/* Los desplegables traen TODAS las facultades del catálogo, no solo
   las que ya tienen gente: si una está vacía, esa también es una
   respuesta y hay que poder verla. */
function pintarFiltrosUsuarios() {
  var selF = $("#us-facultad"), selP = $("#us-programa");
  if (!selF || !selP) return;

  var facs = {};
  if (typeof FACULTADES !== "undefined" && FACULTADES) {
    Object.keys(FACULTADES).forEach(function (f) { facs[f] = 1; });
  }
  usTodas().forEach(function (p) { if (p.facultad) facs[p.facultad] = 1; });

  var listaF = Object.keys(facs).sort();
  selF.innerHTML = '<option value="">Todas</option>' + listaF.map(function (f) {
    return '<option value="' + esc(f) + '">' + esc(f) + "</option>";
  }).join("");
  selF.value = usFacultad;

  var progs = {};
  if (usFacultad && typeof FACULTADES !== "undefined" && FACULTADES[usFacultad]) {
    (FACULTADES[usFacultad] || []).forEach(function (x) {
      progs[typeof x === "string" ? x : (x && x.nombre) || ""] = 1;
    });
  }
  usTodas().forEach(function (p) {
    if (!p.programa) return;
    if (usFacultad && p.facultad !== usFacultad) return;
    progs[p.programa] = 1;
  });
  delete progs[""];

  var listaP = Object.keys(progs).sort();
  selP.innerHTML = '<option value="">Todos</option>' + listaP.map(function (x) {
    return '<option value="' + esc(x) + '">' + esc(x) + "</option>";
  }).join("");
  selP.value = usPrograma;
  selP.disabled = !listaP.length;
}

function pintarTablaUsuarios() {
  var filas = usFiltradas().sort(function (a, b) {
    return String(b.actualizado || "").localeCompare(String(a.actualizado || ""));
  });

  $("#us-cuenta").textContent = filas.length === 1
    ? "1 persona"
    : filas.length + " personas" + (usFacultad || usPrograma || usBusca ? " con estos filtros" : "");

  $("#us-cuerpo").innerHTML = filas.length
    ? filas.map(function (p) {
        return '<tr data-persona="' + esc(p.id) + '"' +
          (p.id === usElegida ? ' class="elegida"' : "") + ">" +
          '<td><div class="adm-persona">' + esc(p.nombre) +
            (p.delCentro ? ' <span class="us-marca">Centro</span>' : "") + "</div>" +
          '<div class="adm-correo">' + esc(p.correo) + "</div></td>" +
          "<td>" + esc(p.facultad || "—") + "</td>" +
          "<td>" + esc(p.programa || "—") + "</td>" +
          "<td>" + esc(p.etapa || "—") + "</td>" +
          "<td>" + p.hojas + " de 5</td>" +
          "<td>" + p.fichas + " de " + p.fichasTotal + "</td>" +
          '<td class="' + (p.descargado ? "adm-si" : "adm-no") + '">' + (p.descargado ? "Sí" : "No") + "</td>" +
          "<td>" + (p.revisiones
            ? '<button type="button" class="adm-ver" data-revisiones="' + esc(p.id) +
              '">Ver (' + p.revisiones + ")</button>"
            : '<span class="adm-no">—</span>') + "</td>" +
          "<td>" + esc(fechaCorta(p.actualizado)) + "</td></tr>";
      }).join("")
    : '<tr><td colspan="9" style="color:var(--ink-faint)">Nadie cumple estos filtros.</td></tr>';
}

function pintarUsuarios() {
  if (!$("#us-cuerpo")) return;

  pintarRutaUsuarios();
  pintarFiltrosUsuarios();

  /* La rosca desglosa el nivel en el que estás: por facultad al
     principio, por programa dentro de una, y nada cuando ya se eligió
     un programa (un solo sector no dice nada). */
  var base = usTodas().filter(function (p) {
    if (usFacultad && p.facultad !== usFacultad) return false;
    return true;
  });

  if (usPrograma) {
    $("#rosca-zona").hidden = true;
  } else if (usFacultad) {
    pintarRosca("Personas por programa · " + usFacultad,
      usAgrupar(base, "programa"), "personas",
      function (clave) { usPrograma = clave; usElegida = ""; pintarUsuarios(); });
  } else {
    pintarRosca("Personas por facultad",
      usAgrupar(base, "facultad"), "personas",
      function (clave) { usFacultad = clave; usPrograma = ""; usElegida = ""; pintarUsuarios(); });
  }

  pintarTablaUsuarios();
}

/* Los controles se escuchan desde la hoja: la tabla se repinta
   entera con cada filtro y sus botones nacen y mueren con ella. */
$("#us-facultad").addEventListener("change", function () {
  usFacultad = this.value; usPrograma = ""; usElegida = ""; pintarUsuarios();
});
$("#us-programa").addEventListener("change", function () {
  usPrograma = this.value; usElegida = ""; pintarUsuarios();
});
$("#us-busca").addEventListener("input", function () {
  usBusca = this.value; pintarUsuarios();
});
$("#us-centro").addEventListener("change", function () {
  usConCentro = this.checked; usElegida = ""; pintarUsuarios();
});
$("#us-limpiar").addEventListener("click", function () {
  usFacultad = ""; usPrograma = ""; usBusca = ""; usElegida = "";
  $("#us-busca").value = "";
  /* La casilla del Centro no se toca: no es un filtro de búsqueda
     sino una decisión sobre qué se está mirando. */
  $("#us-revision").hidden = true;
  pintarUsuarios();
});
$("#us-actualizar").addEventListener("click", cargarConsolidado);

$("#usuarios").addEventListener("click", function (e) {
  var b = e.target && e.target.closest ? e.target.closest("button") : null;
  if (b && b.hasAttribute("data-revisiones")) {
    usElegida = b.getAttribute("data-revisiones");
    pintarTablaUsuarios();
    abrirRevisionesDe(usElegida, null, "#us-revision");
    return;
  }
  if (b && b.hasAttribute("data-revision")) {
    abrirRevisionesDe(b.getAttribute("data-de"), b.getAttribute("data-revision"), "#us-revision");
    return;
  }
  if (b) return;

  /* Pulsar la fila entera abre lo de esa persona: es un blanco
     mucho mayor que el botón. */
  var tr = e.target && e.target.closest ? e.target.closest("tr[data-persona]") : null;
  if (!tr) return;
  usElegida = tr.getAttribute("data-persona");
  pintarTablaUsuarios();
  abrirRevisionesDe(usElegida, null, "#us-revision");
});

function fechaCorta(t) {
  if (!t) return "—";
  return String(t).replace("T", " ").slice(0, 16);
}

function pintarConsolidado() {
  var gente = admPersonas();
  var n = gente.length;
  var sec = n ? gente.reduce(function (a, x) { return a + (Number(x.hojas_completas) || 0); }, 0) / n : 0;
  var fic = n ? gente.reduce(function (a, x) { return a + (Number(x.fichas_completas) || 0); }, 0) / n : 0;
  var pdf = gente.filter(function (x) { return x.descargado; }).length;
  var programas = {};
  gente.forEach(function (x) { if (x.programa) programas[x.programa] = 1; });

  var delCentro = admFilas.length - n;
  var coletilla = delCentro
    ? (delCentro === 1 ? " Queda fuera una cuenta del Centro" : " Quedan fuera " + delCentro + " cuentas del Centro") +
      ": las ves en «Revisión usuarios», marcando la casilla."
    : "";

  $("#adm-sub").textContent = n
    ? "Personas que han abierto un portafolio con la sesión iniciada. Del portafolio se registra el avance, nunca el texto. De las segundas opiniones sí se ve el contenido: pulsa «Ver» en la fila de cada quien." + coletilla
    : (admFilas.length
        ? "Todavía no ha entrado nadie de fuera del Centro." + coletilla
        : "Todavía nadie ha abierto un portafolio con la sesión iniciada.");

  $("#adm-kpis").innerHTML = [
    ["Personas", n],
    ["Programas", Object.keys(programas).length],
    ["Secciones promedio", sec.toFixed(1) + " de 5"],
    ["Fichas promedio", fic.toFixed(1)],
    ["Descargaron el PDF", pdf],
    ["Pidieron segunda opinión", Object.keys(revisionesPorPersona()).length]
  ].map(function (k) {
    return '<div class="adm-kpi"><div class="n">' + esc(String(k[1])) +
           '</div><div class="t">' + esc(k[0]) + "</div></div>";
  }).join("");

  $("#adm-cuerpo").innerHTML = n
    ? gente.map(function (x) {
        return "<tr>" +
          '<td><div class="adm-persona">' + esc(x.nombre || x.correo) + "</div>" +
          '<div class="adm-correo">' + esc(x.correo || "") + "</div></td>" +
          "<td>" + esc(x.facultad || "—") + "</td>" +
          "<td>" + esc(x.programa || "—") + "</td>" +
          "<td>" + esc(x.etapa || "—") + "</td>" +
          "<td>" + (Number(x.hojas_completas) || 0) + " de 5</td>" +
          "<td>" + (Number(x.fichas_completas) || 0) + " de " + (Number(x.fichas_total) || 0) + "</td>" +
          '<td class="' + (x.descargado ? "adm-si" : "adm-no") + '">' + (x.descargado ? "Sí" : "No") + "</td>" +
          "<td>" + celdaRevisiones(x) + "</td>" +
          "<td>" + esc(fechaCorta(x.actualizado_en)) + "</td></tr>";
      }).join("")
    : '<tr><td colspan="9" style="color:var(--ink-faint)">Nadie ha empezado un portafolio todavía.</td></tr>';

  var g = {};
  gente.forEach(function (x) {
    var k = x.programa || "Sin programa";
    if (!g[k]) g[k] = { n: 0, sec: 0, fic: 0, pdf: 0 };
    g[k].n++;
    g[k].sec += Number(x.hojas_completas) || 0;
    g[k].fic += Number(x.fichas_completas) || 0;
    if (x.descargado) g[k].pdf++;
  });
  var claves = Object.keys(g).sort(function (a, b) { return g[b].n - g[a].n; });
  $("#adm-prog-cuerpo").innerHTML = claves.length
    ? claves.map(function (k) {
        var p = g[k];
        return "<tr><td>" + esc(k) + '</td><td class="num">' + p.n +
          '</td><td class="num">' + (p.sec / p.n).toFixed(1) +
          '</td><td class="num">' + (p.fic / p.n).toFixed(1) +
          '</td><td class="num">' + p.pdf + "</td></tr>";
      }).join("")
    : '<tr><td colspan="5" style="color:var(--ink-faint)">Sin datos.</td></tr>';
}

function exportarConsolidado() {
  var gente = admPersonas();
  if (!gente.length) { admAviso("No hay nada que exportar todavía."); return; }
  if (typeof construirXLSX !== "function") {
    admAviso("El generador de Excel no está disponible en esta versión.");
    return;
  }
  var filas = [[
    "Correo", "Nombre", "Facultad", "Programa", "Área", "Etapa", "Objetivo",
    "Secciones completas", "Fichas escritas", "Fichas completas",
    "Descargó el PDF", "Pidió revisión con IA", "Empezó", "Última actividad"
  ]];
  gente.forEach(function (x) {
    filas.push([
      x.correo || "", x.nombre || "", x.facultad || "", x.programa || "",
      x.area || "", x.etapa || "", x.objetivo || "",
      Number(x.hojas_completas) || 0, Number(x.fichas_total) || 0, Number(x.fichas_completas) || 0,
      x.descargado ? "Sí" : "No", x.revisado_ia ? "Sí" : "No",
      fechaCorta(x.creado_en), fechaCorta(x.actualizado_en)
    ]);
  });
  try {
    var url = URL.createObjectURL(construirXLSX(filas, "Portafolios"));
    var a = document.createElement("a");
    a.href = url;
    a.download = "portafolios-cdp.xlsx";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    admAviso("");
    $("#adm-sub").textContent = "Excel descargado con " + gente.length +
      (gente.length === 1 ? " persona." : " personas.") +
      " Contiene datos personales: guárdalo donde corresponda y no lo reenvíes por correo.";
  } catch (e) {
    admAviso("No se pudo generar el Excel: " + e.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   REVISIÓN CON INTELIGENCIA ARTIFICIAL
   --------------------------------------------------------------
   Vive en «Antes de publicar». La lista de verificación de esa
   hoja comprueba que las cosas existan; esto comprueba que digan
   algo, que es la otra mitad del trabajo y la que no se puede
   automatizar con una casilla.

   Devuelve observaciones, nunca texto redactado. Si el modelo
   escribiera las fichas, el estudiante llegaría a la entrevista
   con un portafolio que no sabe defender, y eso es peor que un
   portafolio flojo. La instrucción del servidor lo repite; aquí
   se repite en la interfaz, para que quien lo use lo sepa antes
   de pulsar.
   ══════════════════════════════════════════════════════════════ */

function hayRevision() {
  return typeof api === "function" && typeof Cuenta !== "undefined" && !!(Cuenta && Cuenta.sesion);
}

/* Aviso permanente bajo el botón: dice de antemano qué hace falta,
   en vez de esperar a que la persona pulse y se lleve el error. */
function pintarAvisoRevision() {
  var nota = $("#rev-nota"), btn = $("#rev-pedir");
  if (!nota || !btn) return;
  if (nota.dataset.ocupada === "1") return;

  if (!hayRevision()) {
    btn.disabled = true;
    nota.className = "revision-nota aviso";
    nota.textContent = "Para pedir la revisión necesitas tu cuenta abierta. " +
      "Entra desde la portada y vuelve a esta hoja: tu borrador no se pierde.";
    return;
  }
  btn.disabled = false;
  nota.className = "revision-nota";
  nota.textContent = "La escribe un modelo de inteligencia artificial. Se le envía solo el texto " +
    "de tu portafolio, no tu nombre ni tu correo, y él no guarda nada. La revisión que te devuelva " +
    "queda guardada en tu cuenta y el Centro de Desarrollo Profesional puede consultarla para " +
    "atenderte mejor; puedes borrarla cuando quieras.";
}

/* Lo que sabe la herramienta sobre quién escribe. Sirve para que la
   revisión hable del programa concreto y no en abstracto: lo que se
   le pide a una ficha de Ingeniería no es lo mismo que en Derecho. */
function contextoRevision() {
  var a = AREAS[areaKey()];
  return {
    programa: programaNombre(),
    area: a ? a.label : "",
    etapa: textoElegido("f-etapa"),
    objetivo: textoElegido("f-objetivo"),
    audiencia: val("f-audiencia"),
    aviso: a ? a.aviso : ""
  };
}

/* Cuánto hay escrito. Pedir una revisión de un portafolio en blanco
   gasta cupo para que el modelo conteste lo que ya sabemos. */
function haySuficienteParaRevisar() {
  var proy = leerProyectos(false);
  var texto = [val("f-valor"), val("f-perfil"), val("f-capacidades")].join(" ");
  return proy.length > 0 || contarPalabras(texto) >= 25;
}

/* CÓMO SE NOMBRA EL ESTADO DE CADA BLOQUE
   Las etiquetas dicen qué falta por hacer, no cuánto vale lo que hay
   escrito. Antes la tercera era «Insuficiente», y eso es un juicio
   sobre la persona: dicho por una máquina que no conoce su trabajo,
   ni es justo ni sirve para nada, porque quien lo lee cierra la
   herramienta en vez de arreglar la ficha. «Por desarrollar» dice
   exactamente lo mismo del texto y además dice qué sigue.

   Los nombres antiguos se siguen aceptando: la función del servidor
   puede tardar en actualizarse, y mientras tanto la interfaz traduce
   en vez de mostrar una revisión rota. */
var ESTADOS = {
  solido:      "Sólido",
  afinar:      "Por afinar",
  desarrollar: "Por desarrollar"
};
var ESTADOS_ANTIGUOS = {
  mejorable:    "afinar",
  insuficiente: "desarrollar",
  flojo:        "desarrollar",
  vacio:        "desarrollar"
};

function estadoValido(e) {
  var k = String(e == null ? "" : e).trim().toLowerCase();
  if (ESTADOS_ANTIGUOS[k]) k = ESTADOS_ANTIGUOS[k];
  return ESTADOS[k] ? k : "afinar";
}
function etiquetaEstado(e) {
  return ESTADOS[estadoValido(e)];
}

function bloqueRevision(titulo, estado, observaciones) {
  var e = estadoValido(estado);
  var d = document.createElement("div");
  d.className = "rev-item " + e;

  var h = document.createElement("h4");
  h.textContent = titulo;
  var s = document.createElement("span");
  s.className = "rev-estado";
  s.textContent = etiquetaEstado(e);
  d.appendChild(s);
  d.appendChild(h);

  var lista = (observaciones || []).filter(function (t) { return String(t || "").trim(); });
  if (lista.length) {
    var ul = document.createElement("ul");
    lista.forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = String(t);      /* textContent, no innerHTML: lo escribe un modelo */
      ul.appendChild(li);
    });
    d.appendChild(ul);
  }
  return d;
}

/* Dibuja una revisión dentro del contenedor que se le pase. Está
   separado de pintarRevision() porque la misma ficha se enseña en
   dos sitios: a quien la pidió, en «Antes de publicar», y al CDP en
   el consolidado. Que sea el mismo código evita que una de las dos
   se quede atrás cuando cambie el formato. */
function construirRevision(salida, d, tuyo) {
  salida.innerHTML = "";
  d = d || {};

  /* Salida de emergencia: si el modelo no devolvió el formato
     esperado, se muestra su texto tal cual antes que perderlo. */
  if (d.crudo) {
    var c = document.createElement("p");
    c.className = "rev-crudo";
    c.textContent = d.crudo;
    salida.appendChild(c);
    return;
  }

  if (d.veredicto) {
    var v = document.createElement("p");
    v.className = "rev-veredicto" + (d.listo ? " listo" : "");
    v.textContent = d.veredicto;
    salida.appendChild(v);
  }

  /* Los proyectos van primero: son el 70 % del portafolio y donde
     se decide si a alguien le interesa seguir leyendo. */
  if (d.proyectos && d.proyectos.length) {
    var g1 = document.createElement("div");
    g1.className = "rev-grupo";
    var t1 = document.createElement("span");
    t1.className = "eyebrow";
    t1.textContent = tuyo === false ? "Sus fichas de proyecto" : "Tus fichas de proyecto";
    g1.appendChild(t1);
    d.proyectos.forEach(function (p, i) {
      var n = p.ficha || (i + 1);
      var titulo = "Ficha " + n + (p.titulo ? ": " + p.titulo : "");
      g1.appendChild(bloqueRevision(titulo, p.estado, p.observaciones));
    });
    salida.appendChild(g1);
  }

  if (d.secciones && d.secciones.length) {
    var g2 = document.createElement("div");
    g2.className = "rev-grupo";
    var t2 = document.createElement("span");
    t2.className = "eyebrow";
    t2.textContent = "El resto del portafolio";
    g2.appendChild(t2);
    d.secciones.forEach(function (s) {
      g2.appendChild(bloqueRevision(s.nombre || "Sección", s.estado, s.observaciones));
    });
    salida.appendChild(g2);
  }

  if (d.prioridad) {
    var pr = document.createElement("p");
    pr.className = "rev-prioridad";
    var b = document.createElement("b");
    b.textContent = "Si solo arreglas una cosa";
    pr.appendChild(b);
    pr.appendChild(document.createTextNode(d.prioridad));
    salida.appendChild(pr);
  }

  var pie = document.createElement("p");
  pie.className = "rev-pie";
  pie.textContent = tuyo === false
    ? "La generó un modelo de inteligencia artificial (Gemini) que no conoce su trabajo ni habló " +
      "con esta persona. Son observaciones automáticas, no un diagnóstico del Centro: léelas como " +
      "un punto de partida para la asesoría, no como una evaluación."
    : "Esta segunda opinión la generó un modelo de inteligencia artificial " +
      "(Gemini) que no conoce tu trabajo ni habló contigo: son observaciones, no correcciones, " +
      "y puede equivocarse. Tú decides cuáles aplicas. Para una revisión hecha por una persona, " +
      "escribe al Centro de Desarrollo Profesional desde la hoja «Hablar con un asesor».";
  salida.appendChild(pie);
}

function pintarRevision(d) {
  var salida = $("#rev-salida");
  construirRevision(salida, d, true);
  salida.hidden = false;
}

function pedirRevision() {
  var btn = $("#rev-pedir"), nota = $("#rev-nota"), salida = $("#rev-salida");

  if (!hayRevision()) { pintarAvisoRevision(); return; }

  if (!haySuficienteParaRevisar()) {
    nota.className = "revision-nota aviso";
    nota.textContent = "Todavía no hay bastante escrito para revisar. " +
      "Completa al menos una ficha de proyecto o tu perfil profesional y vuelve.";
    return;
  }

  var etiqueta = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Revisando…";
  nota.dataset.ocupada = "1";
  nota.className = "revision-nota trabajando";
  nota.textContent = "Leyendo tu portafolio. Puede tardar hasta medio minuto.";
  salida.hidden = true;

  api("/revisar-portafolio", "POST", {
    contexto: contextoRevision(),
    proyectos: leerProyectos(false),
    portafolio: armar()
  }).then(function (d) {
    pintarRevision(d || {});
    nota.className = "revision-nota";
    nota.textContent = "Revisión hecha y guardada en tu cuenta. " +
      "Vuelve a pedirla cuando hayas corregido: se guardan las últimas diez.";
    btn.textContent = "Revisar otra vez";
    guardarRevision(d || {});
  }).catch(function (err) {
    nota.className = "revision-nota aviso";
    nota.textContent = "No se pudo revisar: " + ((err && err.message) || "error desconocido") + ".";
    btn.textContent = etiqueta;
  }).then(function () {
    btn.disabled = false;
    nota.dataset.ocupada = "";
  });
}

/* ══════════════════════════════════════════════════════════════
   LAS SEGUNDAS OPINIONES SE QUEDAN EN LA CUENTA
   --------------------------------------------------------------
   Hasta ahora la revisión vivía solo en la pantalla: al recargar
   desaparecía, y quien la había pedido tenía que gastar otra para
   volver a leer lo mismo. Peor todavía, no había forma de comparar
   la de hoy con la de la semana pasada, que es justamente donde se
   ve si el portafolio mejoró.

   Se guarda la revisión, no el borrador. Son cosas distintas: el
   borrador es el portafolio de la persona y sigue sin salir de su
   navegador; la revisión es lo que el modelo respondió, y guardarla
   es lo que le da sentido a haberla pedido.

   Si la tabla todavía no existe en Supabase, esto falla en silencio:
   la revisión se ve igual en pantalla, simplemente no se guarda. Una
   migración pendiente no puede romper una funcionalidad que ya
   estaba andando.
   ══════════════════════════════════════════════════════════════ */

var revisiones = [];        /* las últimas, más reciente primero */
var revisionesFallo = "";   /* por qué no se pudieron guardar */

/* Lo que se manda a la base. Todo el contenido va en la columna
   «resultado», que es JSON: la forma de la respuesta la decide la
   función del servidor, y no vale la pena migrar la tabla cada vez
   que allí se añada un campo. */
function filaDeRevision(d) {
  return {
    portafolio_id: Nube.portafolioId,
    resultado: {
      veredicto: String(d.veredicto || "").slice(0, 1000),
      listo: d.listo === true,
      prioridad: String(d.prioridad || "").slice(0, 1000),
      fichas: (d.proyectos || []).length,
      proyectos: d.proyectos || [],
      secciones: d.secciones || [],
      crudo: d.crudo ? String(d.crudo) : ""
    }
  };
}

/* El camino de vuelta: de la fila guardada a lo que espera
   pintarRevision(). */
function revisionDesdeFila(f) {
  var r = (f && f.resultado) || {};
  if (typeof r === "string") { try { r = JSON.parse(r); } catch (e) { r = {}; } }
  if (r.crudo) return { crudo: r.crudo };
  return {
    veredicto: r.veredicto || "",
    listo: r.listo === true,
    prioridad: r.prioridad || "",
    proyectos: r.proyectos || [],
    secciones: r.secciones || []
  };
}

function guardarRevision(d) {
  if (!hayRevision()) return;

  /* La revisión cuelga del portafolio. Si todavía no se ha creado la
     fila (alguien que pidió la revisión antes de que se vaciara la
     cola de guardado), se sincroniza primero. */
  var listo = Nube.portafolioId ? Promise.resolve() : sincronizar();

  listo.then(function () {
    return api("/revisiones", "POST", filaDeRevision(d));
  }).then(function () {
    revisionesFallo = "";
    cargarRevisiones();
  }).catch(function (err) {
    /* Se dice, pero sin alarmar: lo que la persona pidió ya lo
       tiene delante. Lo único que se perdió es poder volver. */
    revisionesFallo = (err && err.message) || "no se pudo guardar";
    if (window.console) console.warn("No se pudo guardar la revisión:", revisionesFallo);
    pintarRevisiones();
  });
}

function cargarRevisiones() {
  if (!hayRevision()) { revisiones = []; pintarRevisiones(); return; }
  api("/revisiones", "GET").then(function (r) {
    revisiones = (r && Array.isArray(r.revisiones)) ? r.revisiones : [];
    revisionesFallo = "";
    pintarRevisiones();
  }).catch(function (err) {
    revisiones = [];
    revisionesFallo = (err && err.message) || "no se pudieron leer";
    pintarRevisiones();
  });
}

function borrarRevision(id) {
  if (!id) return;
  if (!window.confirm("¿Borrar esta revisión guardada? No se puede deshacer.")) return;
  api("/revisiones/" + encodeURIComponent(id), "DELETE").then(function () {
    revisiones = revisiones.filter(function (x) { return String(x.id) !== String(id); });
    pintarRevisiones();
  }).catch(function (err) {
    revisionesFallo = (err && err.message) || "no se pudo borrar";
    pintarRevisiones();
  });
}

function abrirRevisionGuardada(id) {
  var f = revisiones.filter(function (x) { return String(x.id) === String(id); })[0];
  if (!f) return;
  pintarRevision(revisionDesdeFila(f));
  var nota = $("#rev-nota");
  if (nota && nota.dataset.ocupada !== "1") {
    nota.className = "revision-nota";
    nota.textContent = "Estás viendo la revisión del " + fechaCorta(f.creado_en) +
      ". Pulsa «Revisar mi portafolio» para pedir una nueva sobre lo que tienes escrito ahora.";
  }
  var salida = $("#rev-salida");
  if (salida) salida.scrollIntoView({ block: "nearest" });
  pintarRevisiones(id);
}

function pintarRevisiones(activa) {
  var caja = $("#rev-guardadas");
  if (!caja) return;

  if (revisionesFallo && !revisiones.length) {
    caja.hidden = false;
    caja.innerHTML = "";
    var av = document.createElement("p");
    av.className = "rev-guardadas-nota";
    /* El detalle técnico no se le enseña a quien está escribiendo su
       portafolio: no puede hacer nada con él. Queda en el «title» y
       en la consola, que es donde lo busca quien mantiene esto. */
    av.title = revisionesFallo;
    av.textContent = "Las revisiones todavía no se están guardando en tu cuenta. " +
      "La de esta pantalla se ve igual, pero se perderá al recargar.";
    caja.appendChild(av);
    return;
  }

  if (!revisiones.length) { caja.hidden = true; caja.innerHTML = ""; return; }

  caja.hidden = false;
  caja.innerHTML = "";

  var t = document.createElement("span");
  t.className = "eyebrow";
  t.textContent = "Tus revisiones anteriores";
  caja.appendChild(t);

  var ul = document.createElement("ul");
  ul.className = "rev-guardadas-lista";
  revisiones.forEach(function (f) {
    var li = document.createElement("li");
    if (activa && String(activa) === String(f.id)) li.className = "activa";

    var r = f.resultado || {};
    if (typeof r === "string") { try { r = JSON.parse(r); } catch (e) { r = {}; } }

    var fecha = document.createElement("b");
    fecha.textContent = fechaCorta(f.creado_en);
    li.appendChild(fecha);

    var n = Number(r.fichas) || 0;
    var res = document.createElement("span");
    res.className = "rev-guardadas-res";
    res.textContent = (r.listo ? "Lista para publicar" : "Con observaciones") +
      " · " + n + (n === 1 ? " ficha" : " fichas");
    li.appendChild(res);

    var ver = document.createElement("button");
    ver.type = "button";
    ver.textContent = "Ver";
    ver.setAttribute("data-ver-revision", f.id);
    li.appendChild(ver);

    var bor = document.createElement("button");
    bor.type = "button";
    bor.className = "enlace";
    bor.textContent = "Borrar";
    bor.setAttribute("data-borrar-revision", f.id);
    li.appendChild(bor);

    ul.appendChild(li);
  });
  caja.appendChild(ul);

  var pie = document.createElement("p");
  pie.className = "rev-guardadas-nota";
  pie.textContent = "Se guardan las diez últimas. Las ves tú y el Centro de Desarrollo Profesional, " +
    "que las usa para preparar tu asesoría. Borra la que no quieras que quede.";
  caja.appendChild(pie);
}

/* Hay dos formas de traducir y el mensaje depende de cuál falta.
   Si el navegador no trae traductor pero la persona tiene sesión,
   traduce Gemini y no hay nada que avisar. Si tampoco hay sesión,
   lo que corresponde no es mandarla a cambiar de navegador sino
   decirle que entre a su cuenta. */
function msjSinTraductor() {
  if (Traductor.hayAlguna()) return "";
  if (Traductor.motivoSinTraductor() === "sin-sesion") {
    return "Para traducir con inteligencia artificial entra a tu cuenta desde la portada. " +
           "Chrome y Edge recientes traen además su propio traductor, que funciona sin cuenta. " +
           "En cualquier caso puedes copiar la ficha y traducirla aparte.";
  }
  if (abiertaDesdeArchivo()) {
    return "La traducción no funciona con el archivo abierto desde tu computador. " +
           "Abre la herramienta desde la dirección publicada en internet. " +
           "Mientras tanto, copia la ficha y tradúcela aparte.";
  }
  return "Tu navegador no incluye traductor y no hay sesión iniciada. " +
         "Entra a tu cuenta desde la portada para traducir con inteligencia artificial, " +
         "o copia el texto y tradúcelo aparte.";
}

/* Aviso permanente bajo los botones: dice de antemano con qué se va
   a traducir, en vez de esperar a que la persona pulse y falle. */
function pintarAvisoTraductor() {
  var texto = msjSinTraductor();
  Array.prototype.forEach.call(document.querySelectorAll(".trad-nota"), function (n) {
    if (n.dataset.ocupada === "1") return;
    n.textContent = texto;
    n.className = texto ? "trad-nota aviso" : "trad-nota";
  });
}

/* Cada modo de fallo merece su propia explicación: «no funcionó» no
   le sirve a nadie para decidir qué hacer a continuación. */
function mensajeTraductor(err) {
  var causa = err && err.message;
  if (causa === "sin-soporte" || causa === "sin-sesion") return msjSinTraductor();
  if (causa === "par-no-disponible") {
    return "Tu navegador no tiene disponible la traducción de español a inglés. " +
           "Revisa los idiomas instalados en su configuración, o copia el texto y tradúcelo aparte.";
  }
  if (causa === "no-arranca") {
    return "El traductor del navegador no respondió. Suele pasar la primera vez: " +
           "vuelve a intentarlo, y si sigue igual copia el texto y tradúcelo aparte.";
  }
  if (causa === "descarga-lenta") {
    return "La descarga del modelo de traducción está tardando demasiado. " +
           "Comprueba tu conexión y vuelve a intentarlo.";
  }
  return "No se pudo traducir en este navegador. Intenta de nuevo o copia el texto.";
}

/* Ficha → Markdown legible, con las etiquetas de cada campo */
function fichaMarkdown(fs) {
  var g = function (c) { var el = fs.querySelector("." + c); return el ? el.value.trim() : ""; };
  var o = [];

  o.push("### " + (g("p-titulo") || "Proyecto sin título"), "");
  [
    ["p-contexto", "Contexto o reto"], ["p-objetivo", "Objetivo"],
    ["p-rol", "Mi rol"], ["p-acciones", "Acciones y decisiones"],
    ["p-herr", "Herramientas o métodos"], ["p-resultado", "Resultado o impacto"],
    ["p-evidencia", "Evidencia"], ["p-competencias", "Competencias demostradas"]
  ].forEach(function (par) {
    var el = fs.querySelector("." + par[0]);
    var v = el ? el.value.trim() : "";
    if (v) o.push("**" + par[1] + ":** " + v);
  });
  return o.join("\n");
}

function traducirFicha(fs, btn) {
  if (!fs) return;
  var nota = fs.querySelector(".trad-nota");
  var salida = fs.querySelector(".trad-salida");
  var caja = fs.querySelector(".trad-texto");

  var respaldo = fs.querySelector(".trad-copiar-es");
  var fallar = function (mensaje) {
    nota.textContent = mensaje;
    nota.className = "trad-nota aviso";
    if (respaldo) respaldo.hidden = false;   /* siempre queda una salida */
  };

  if (!Traductor.hayAlguna()) { fallar(msjSinTraductor()); return; }

  var md = fichaMarkdown(fs);
  if (contarPalabras(md) < 6) {
    nota.textContent = "Escribe la ficha antes de traducirla.";
    nota.className = "trad-nota aviso";
    return;
  }

  var enElEquipo = Traductor.disponible();
  btn.disabled = true;
  nota.dataset.ocupada = "1";
  nota.className = "trad-nota";
  nota.textContent = enElEquipo
    ? "Preparando el traductor… la primera vez el navegador descarga el modelo."
    : "Traduciendo con inteligencia artificial…";

  Traductor.traducirMarkdown(
    md,
    function (pct) { nota.textContent = "Descargando el modelo de traducción… " + pct + " %"; },
    function (pct) { if (enElEquipo) nota.textContent = "Traduciendo… " + pct + " %"; }
  ).then(function (en) {
    caja.textContent = en.replace(/\*\*/g, "").replace(/^### /m, "");
    salida.hidden = false;
    nota.textContent = enElEquipo
      ? "Traducción hecha en tu equipo. Revísala antes de usarla."
      : "Traducción automática. Revísala antes de usarla: la máquina no conoce tu trabajo.";
    marcarHecho(btn, "Traducido ✓");
  }).catch(function (err) {
    fallar(mensajeTraductor(err));
  }).then(function () {
    btn.disabled = false;
    nota.dataset.ocupada = "";
  });
}

/* Portafolio completo en inglés, en PDF */
function descargarPortafolioIngles(btn) {
  var nota = $("#trad-port-nota");

  if (!Traductor.hayAlguna()) {
    nota.className = "trad-nota aviso";
    nota.textContent = msjSinTraductor();
    return;
  }

  var enElEquipo = Traductor.disponible();
  btn.disabled = true;
  nota.dataset.ocupada = "1";
  nota.className = "trad-nota";
  nota.textContent = enElEquipo
    ? "Preparando el traductor… la primera vez el navegador descarga el modelo."
    : "Traduciendo con inteligencia artificial… puede tardar medio minuto.";

  Traductor.traducirMarkdown(
    armar(),
    function (pct) { nota.textContent = "Descargando el modelo de traducción… " + pct + " %"; },
    function (pct) { if (enElEquipo) nota.textContent = "Traduciendo… " + pct + " %"; }
  ).then(function (en) {
    descargarPDF("my-portfolio.pdf", en, "Professional portfolio", btn);
    nota.textContent = enElEquipo
      ? "Traducción automática hecha en tu equipo. Revísala antes de enviarla."
      : "Traducción automática. Revísala antes de enviarla: la máquina no conoce tu trabajo.";
  }).catch(function (err) {
    nota.className = "trad-nota aviso";
    nota.textContent = mensajeTraductor(err);
  }).then(function () {
    btn.disabled = false;
    nota.dataset.ocupada = "";
  });
}

/* ═══════════════════════════════════════════════════════════════
   9 · ALMACENAMIENTO
   ---------------------------------------------------------------
   El borrador vivía solo en localStorage. Ahora la fuente principal
   es Supabase, atada a la cuenta del estudiante, y localStorage se
   queda como copia de seguridad de este navegador.

   POR QUÉ LAS DOS COSAS Y NO SOLO LA NUBE
   Escribir por red tarda y a veces falla. Si el guardado dependiera
   únicamente de Supabase, cada corte de wifi en el campus le
   costaría a alguien un párrafo. Se escribe siempre primero en
   local, que es instantáneo y no puede fallar, y se sincroniza
   después. Si la sincronización falla, el trabajo sigue estando y se
   dice en pantalla en vez de fingir que todo va bien.

   QUÉ VA A DÓNDE
     portafolios            titulo, objetivo, etapa      (una fila)
     secciones_portafolio   las otras dieciséis casillas y el
                            estado de la lista de verificación
     proyectos              una fila por ficha, con su orden

   Las tres hijas cuelgan de «portafolios.id» con borrado en
   cascada: retirar el portafolio se lleva todo lo demás.
   =============================================================== */

var guardarTimer, nubeTimer, hayAlmacen = (function () {
  try { window.localStorage.setItem("_t", "1"); window.localStorage.removeItem("_t"); return true; }
  catch (e) { return false; }
})();

/* ── El mapa del esquema ─────────────────────────────────────
   Todo lo que este módulo sabe de la forma de las tablas está
   aquí. Si mañana una columna cambia de nombre, se arregla en
   estas veinte líneas y no en quince sitios repartidos. */

/* Las tres casillas con columna propia en «portafolios». */
var CABECERA = { "f-nombre": "titulo", "f-objetivo": "objetivo", "f-etapa": "etapa" };

/* Las demás casillas del formulario, una fila cada una en
   «secciones_portafolio». El «tipo» es el identificador sin el
   prefijo «f-», salvo donde ese nombre resultaba ambiguo. */
var SECCION_DE_CAMPO = {
  "f-programa": "programa",
  "f-programa-otro": "programa_otro",
  "f-area-otro": "area_otro",
  "f-audiencia": "audiencia",
  "f-campo": "campo",
  "f-valor": "valor",
  "f-perfil": "perfil",
  "f-capacidades": "capacidades",
  "f-herramientas": "herramientas",
  "f-formacion": "formacion",
  "f-logros": "logros",
  "f-testimonio": "testimonio",
  "f-correo": "correo",
  "f-linkedin": "linkedin",
  "f-otro": "contacto_otro",
  "f-cta": "cta"
};
var CAMPO_DE_SECCION = {};
Object.keys(SECCION_DE_CAMPO).forEach(function (id) {
  CAMPO_DE_SECCION[SECCION_DE_CAMPO[id]] = id;
});

/* De casilla de la ficha a columna de «proyectos». Los nombres no
   coinciden porque la tabla se escribió aparte; se traducen aquí. */
var COLUMNA_DE_FICHA = {
  titulo: "nombre", contexto: "contexto", objetivo: "objetivo", rol: "rol",
  acciones: "acciones", herr: "herramientas", resultado: "resultados",
  evidencia: "evidencia", competencias: "competencias"
};

/* La lista de verificación no tiene tabla propia: son diez
   booleanos y crear una tabla para eso sería ceremonia. Va como una
   sección más, en JSON, con un tipo que no puede chocar con ninguna
   casilla del formulario. */
var TIPO_CHECK = "_checklist";
var ORDEN_CHECK = 900;

/* Filas que no son una casilla del formulario sino algo que se
   deduce de él. Existen para que el consolidado del CDP pueda
   agrupar sin tener que interpretar valores internos: el de
   «f-programa» es «clave|slug», que no se le enseña a nadie.
   Se escriben pero no se leen de vuelta: al abrir se recalculan. */
var TIPO_DESCARGADO = "_descargado";
var pdfDescargado = false;

function seccionesDerivadas() {
  return {
    programa_nombre: programaNombre() || "",
    facultad: val("f-facultad") || "",
    area: areaKey() || "",
    _descargado: pdfDescargado ? "si" : ""
  };
}

/* ── Estado de la sincronización ─────────────────────────────── */
var Nube = {
  portafolioId: "",   /* el id de la fila de «portafolios» */
  proyectoIds: [],    /* paralelo al orden de las fichas en pantalla */
  seccionIds: {},     /* tipo de sección → id de su fila */
  enviado: null,      /* lo último que el servidor confirmó */
  fallo: "",
  ocupado: false,
  pendiente: false,
  /* Mientras se está leyendo la cuenta no se escribe en ella: la
     pantalla todavía está vacía y sincronizarla borraría el
     portafolio que se está intentando abrir. */
  cargando: false
};

function hayNube() {
  return typeof api === "function" && typeof Cuenta !== "undefined" &&
         !!(Cuenta && Cuenta.sesion);
}

function marcarGuardado(texto, activo) {
  var caja = $("#guardado"), txt = $("#guardado-txt");
  if (!caja || !txt) return;
  txt.textContent = texto;
  caja.classList.toggle("activo", !!activo);
}

function serializar() {
  var d = { campos: {}, proyectos: leerProyectos(true), check: {}, hoja: actual };
  CAMPOS.forEach(function (id) { d.campos[id] = val(id); });
  $$("#check input").forEach(function (i) { d.check[i.dataset.txt] = i.checked; });
  return d;
}

/* Vuelca un objeto de datos en el formulario. Lo usan los dos
   caminos, el local y el de la cuenta, para que no puedan
   desincronizarse. */
function aplicarDatos(d) {
  if (!d || typeof d !== "object") return false;

  CAMPOS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el && d.campos && typeof d.campos[id] === "string") el.value = d.campos[id];
  });

  syncPrograma();
  adapt();

  $("#proyectos-wrap").innerHTML = "";
  proyN = 0;
  var ps = (d.proyectos && d.proyectos.length) ? d.proyectos : [null, null, null];
  ps.forEach(function (p) { addProyecto(p); });

  if (d.check) {
    $$("#check input").forEach(function (i) {
      if (typeof d.check[i.dataset.txt] === "boolean") i.checked = d.check[i.dataset.txt];
    });
    refreshCheck();
  }
  return true;
}

/* ── La copia de este navegador ──────────────────────────────── */
function leerLocalDe(llave) {
  if (!hayAlmacen) return null;
  var crudo;
  try { crudo = window.localStorage.getItem(llave); } catch (e) { return null; }
  if (!crudo) return null;
  try {
    var d = JSON.parse(crudo);
    return (d && typeof d === "object") ? d : null;
  } catch (e) { return null; }
}
function leerLocal() { return leerLocalDe(llaveDelBorrador()); }

function escribirLocal(d) {
  if (!hayAlmacen) return false;
  try { window.localStorage.setItem(llaveDelBorrador(), JSON.stringify(d)); return true; }
  catch (e) { return false; }
}

/* ── Traducción entre las tablas y el formulario ─────────────── */
function datosDesdeNube(r) {
  var d = { campos: {}, proyectos: [], check: {} };
  var cab = r.portafolio || {};

  Object.keys(CABECERA).forEach(function (id) {
    var v = cab[CABECERA[id]];
    if (typeof v === "string") d.campos[id] = v;
  });

  (r.secciones || []).forEach(function (s) {
    if (s.tipo === TIPO_CHECK) {
      try { d.check = JSON.parse(s.contenido || "{}") || {}; } catch (e) { d.check = {}; }
      return;
    }
    var id = CAMPO_DE_SECCION[s.tipo];
    if (id) d.campos[id] = s.contenido || "";
  });

  (r.proyectos || []).forEach(function (p) {
    var ficha = {};
    Object.keys(COLUMNA_DE_FICHA).forEach(function (clave) {
      ficha[clave] = p[COLUMNA_DE_FICHA[clave]] || "";
    });
    d.proyectos.push(ficha);
  });

  return d;
}

/* Se apuntan los identificadores de cada fila para poder
   actualizarlas después una a una, en vez de borrar y reinsertar
   el portafolio entero en cada guardado. */
function indexarNube(r) {
  Nube.portafolioId = (r.portafolio && r.portafolio.id) || "";
  Nube.seccionIds = {};
  pdfDescargado = false;
  (r.secciones || []).forEach(function (s) {
    Nube.seccionIds[s.tipo] = s.id;
    if (s.tipo === TIPO_DESCARGADO && s.contenido) pdfDescargado = true;
  });
  Nube.proyectoIds = (r.proyectos || []).map(function (p) { return p.id; });
}

/* Lo que debería haber en el servidor según lo que hay ahora en
   pantalla. Comparándolo con «Nube.enviado» sale exactamente qué
   filas hay que tocar. */
function instantanea() {
  var d = serializar();

  var cabecera = {};
  Object.keys(CABECERA).forEach(function (id) { cabecera[CABECERA[id]] = d.campos[id] || ""; });

  var secciones = {};
  Object.keys(SECCION_DE_CAMPO).forEach(function (id) {
    secciones[SECCION_DE_CAMPO[id]] = d.campos[id] || "";
  });
  secciones[TIPO_CHECK] = JSON.stringify(d.check || {});
  var extra = seccionesDerivadas();
  Object.keys(extra).forEach(function (k) { secciones[k] = extra[k]; });

  var proyectos = d.proyectos.map(function (p) {
    var fila = {};
    Object.keys(COLUMNA_DE_FICHA).forEach(function (c) { fila[COLUMNA_DE_FICHA[c]] = p[c] || ""; });
    return fila;
  });

  return { cabecera: cabecera, secciones: secciones, proyectos: proyectos };
}

function ahoraISO() { return new Date().toISOString(); }

function tareasDeSecciones(ahora, antes) {
  var tareas = [];
  var tipos = Object.keys(SECCION_DE_CAMPO).map(function (id) { return SECCION_DE_CAMPO[id]; });
  tipos.push(TIPO_CHECK);
  Object.keys(seccionesDerivadas()).forEach(function (t) { tipos.push(t); });

  tipos.forEach(function (tipo, i) {
    var valor = ahora.secciones[tipo] || "";
    if (antes && (antes.secciones[tipo] || "") === valor) return;

    var id = Nube.seccionIds[tipo];
    if (id) {
      tareas.push(api("/portafolio/secciones/" + encodeURIComponent(id), "PATCH",
        { contenido: valor, actualizado_en: ahoraISO() }));
    } else if (valor) {
      /* Una casilla vacía que nunca se escribió no merece fila. */
      tareas.push(api("/portafolio/secciones", "POST", {
        portafolio_id: Nube.portafolioId,
        tipo: tipo,
        contenido: valor,
        orden: tipo === TIPO_CHECK ? ORDEN_CHECK : i
      }).then(function (r) { if (r && r.fila) Nube.seccionIds[tipo] = r.fila.id; }));
    }
  });
  return tareas;
}

/* Una ficha en la que no se escribió nada todavía. La herramienta
   arranca con tres en blanco: crearles fila a todas llenaría la
   tabla de filas vacías de gente que solo pasó por la hoja. */
function fichaEnBlanco(fila) {
  return Object.keys(fila).every(function (k) {
    return !String(fila[k] || "").trim();
  });
}

function tareasDeProyectos(ahora, antes) {
  var tareas = [];
  var nuevos = ahora.proyectos;
  var viejos = (antes && antes.proyectos) || null;

  nuevos.forEach(function (fila, i) {
    var id = Nube.proyectoIds[i];
    var cuerpo = Object.assign({}, fila, { orden: i });

    if (!id && fichaEnBlanco(fila)) return;

    if (id) {
      var previo = viejos && viejos[i] ? viejos[i] : null;
      if (previo && JSON.stringify(previo) === JSON.stringify(fila)) return;
      tareas.push(api("/portafolio/proyectos/" + encodeURIComponent(id), "PATCH",
        Object.assign({ actualizado_en: ahoraISO() }, cuerpo)));
    } else {
      tareas.push(api("/portafolio/proyectos", "POST",
        Object.assign({ portafolio_id: Nube.portafolioId }, cuerpo))
        .then(function (r) { if (r && r.fila) Nube.proyectoIds[i] = r.fila.id; }));
    }
  });

  /* Fichas que la persona eliminó de la pantalla */
  Nube.proyectoIds.slice(nuevos.length).forEach(function (id) {
    if (id) tareas.push(api("/portafolio/proyectos/" + encodeURIComponent(id), "DELETE"));
  });
  Nube.proyectoIds = Nube.proyectoIds.slice(0, nuevos.length);

  return tareas;
}

function sincronizar() {
  /* Mientras se pregunta si quiere subir lo del navegador, no se
     sube nada. Sin este freno, el primer temporizador pendiente
     contestaba «sí» por ella. */
  if (!hayNube() || Nube.cargando || migracionPendiente) return Promise.resolve();

  /* Si ya hay un envío en marcha se anota que hace falta otro y se
     sale: dos sincronizaciones simultáneas se pisarían los
     identificadores de las filas recién creadas. */
  if (Nube.ocupado) { Nube.pendiente = true; return Promise.resolve(); }

  var ahora = instantanea();
  var antes = Nube.enviado;
  if (antes && JSON.stringify(ahora) === JSON.stringify(antes)) return Promise.resolve();

  Nube.ocupado = true;
  marcarGuardado("Guardando en tu cuenta…", true);

  return Promise.resolve().then(function () {
    /* La cabecera va primero: de ella sale el identificador del que
       cuelgan las demás filas. */
    if (Nube.portafolioId && antes &&
        JSON.stringify(ahora.cabecera) === JSON.stringify(antes.cabecera)) return;
    return api("/portafolio/cabecera", "PUT",
      Object.assign({ actualizado_en: ahoraISO() }, ahora.cabecera)
    ).then(function (r) {
      if (r && r.portafolio && r.portafolio.id) Nube.portafolioId = r.portafolio.id;
    });
  }).then(function () {
    if (!Nube.portafolioId) throw new Error("no se pudo crear el portafolio en tu cuenta");
    return Promise.all(tareasDeSecciones(ahora, antes).concat(tareasDeProyectos(ahora, antes)));
  }).then(function () {
    Nube.enviado = ahora;
    Nube.fallo = "";
    pintarAvisoNube();
    marcarGuardado("Guardado en tu cuenta", true);
    setTimeout(function () { marcarGuardado("Guardado en tu cuenta", false); }, 1600);
  }).catch(function (err) {
    Nube.fallo = (err && err.message) || "sin detalle";
    if (window.console) console.warn("No se pudo sincronizar el portafolio:", Nube.fallo);
    pintarAvisoNube();
    marcarGuardado("Guardado solo en este navegador", false);
  }).then(function () {
    Nube.ocupado = false;
    if (Nube.pendiente) { Nube.pendiente = false; sincronizar(); }
  });
}

function guardar() {
  /* Local siempre y primero: es instantáneo y no puede fallar. */
  if (hayAlmacen) {
    clearTimeout(guardarTimer);
    guardarTimer = setTimeout(function () {
      var ok = escribirLocal(serializar());
      if (!hayNube()) {
        marcarGuardado(ok ? "Guardado en este navegador" : "No se pudo guardar en este navegador", ok);
        if (ok) setTimeout(function () { marcarGuardado("Guardado en este navegador", false); }, 1600);
      }
    }, 500);
  }

  /* La nube va más despacio a propósito: escribir una frase dispara
     decenas de guardados, y no tiene sentido que cada tecla sea una
     petición. Lo pendiente se vacía al cambiar de hoja o al salir. */
  if (hayNube()) {
    clearTimeout(nubeTimer);
    nubeTimer = setTimeout(sincronizar, 2500);
  }
}

function vaciarCola() {
  if (!hayNube()) return;
  clearTimeout(nubeTimer);
  sincronizar();
}
window.addEventListener("hashchange", vaciarCola);
window.addEventListener("pagehide", vaciarCola);
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") vaciarCola();
});

function restaurar() {
  if (!hayAlmacen) { marcarGuardado("Este navegador no permite guardar", false); return false; }
  var d = leerLocal();
  if (!d || !aplicarDatos(d)) return false;
  marcarGuardado("Borrador recuperado de este navegador", false);
  return true;
}

function borrarGuardado() {
  /* Se cancela primero lo pendiente: si no, el temporizador se
     dispara DESPUÉS de borrar y vuelve a escribir lo que la persona
     acaba de pedir eliminar. */
  clearTimeout(guardarTimer);
  clearTimeout(nubeTimer);
  if (hayAlmacen) {
    try { window.localStorage.removeItem(llaveDelBorrador()); } catch (e) { /* sin permisos */ }
  }
  Nube.portafolioId = "";
  Nube.proyectoIds = [];
  Nube.seccionIds = {};
  Nube.enviado = null;
  Nube.fallo = "";
  pdfDescargado = false;
}

/* ═══════════════════════════════════════════════════════════════
   MIGRACIÓN DESDE ESTE NAVEGADOR
   ---------------------------------------------------------------
   Mucha gente empezó su portafolio antes de que existiera el
   guardado en la cuenta, o lo empezó sin haber entrado. Ese trabajo
   no se sube a espaldas de nadie: se pregunta.

   Solo se ofrece cuando la cuenta está vacía. Si ya hay portafolio
   en el servidor, lo del navegador es una copia vieja y sobrescribir
   con ella sería destruir lo bueno con lo caducado.
   =============================================================== */

/* Verdadero desde que se muestra la pregunta hasta que se contesta.
   Congela la sincronización durante ese rato. */
var migracionPendiente = false;

/* El borrador que se está ofreciendo. Se guarda aparte y NO se
   vuelca en el formulario hasta que la persona acepta.

   Esto no es un detalle: en un computador compartido del campus,
   alguien escribe sin haber entrado y se va; el siguiente entra con
   su cuenta. Si el formulario mostrara ese texto, estaría leyendo el
   portafolio a medio escribir de otra persona sin haberlo pedido.
   Se describe lo que hay, no se enseña. */
var migracionCandidato = null;

/* ¿Hay algo escrito de verdad, o solo un formulario en blanco? */
function borradorConTexto(llave) {
  var d = leerLocalDe(llave);
  if (!d) return null;
  var algo = false;

  CAMPOS.forEach(function (id) {
    if (String((d.campos && d.campos[id]) || "").trim()) algo = true;
  });
  (d.proyectos || []).forEach(function (p) {
    Object.keys(p || {}).forEach(function (k) {
      if (String(p[k] || "").trim()) algo = true;
    });
  });

  return algo ? d : null;
}

/* Quien ya dijo que no, no tiene que volver a decirlo cada vez que
   abre la herramienta. La negativa se apunta por cuenta. */
function llaveNegativa() { return llaveDelBorrador() + ":sin-migrar"; }

function yaDijoQueNo() {
  if (!hayAlmacen) return false;
  try { return window.localStorage.getItem(llaveNegativa()) === "1"; }
  catch (e) { return false; }
}

function apuntarQueDijoQueNo() {
  if (!hayAlmacen) return;
  try { window.localStorage.setItem(llaveNegativa(), "1"); } catch (e) { }
}

/* El cajón de la propia cuenta primero; después el de quien
   trabajó sin haber entrado, que es el caso más común. */
function borradorMigrable() {
  if (yaDijoQueNo()) return null;
  return borradorConTexto(llaveDelBorrador()) || borradorConTexto(LLAVE_BASE + ":anon");
}

/* Cuánto hay en el borrador que se ofrece, en una frase. */
function resumenDelCandidato() {
  var d = migracionCandidato;
  if (!d) return "";
  var campos = 0, fichas = 0;

  /* Los desplegables arrancan con un valor puesto, así que contarlos
     diría «cuatro campos escritos» a quien solo escribió uno. */
  var AUTOMATICOS = ["f-etapa", "f-objetivo", "f-programa", "f-area-otro"];
  CAMPOS.forEach(function (id) {
    if (AUTOMATICOS.indexOf(id) > -1) return;
    if (String((d.campos && d.campos[id]) || "").trim()) campos++;
  });
  (d.proyectos || []).forEach(function (p) {
    var algo = Object.keys(p || {}).some(function (k) { return String(p[k] || "").trim(); });
    if (algo) fichas++;
  });

  var partes = [];
  if (campos) partes.push(campos === 1 ? "un campo escrito" : campos + " campos escritos");
  if (fichas) partes.push(fichas === 1 ? "una ficha de proyecto" : fichas + " fichas de proyecto");
  if (!partes.length) return "";
  return "Tiene " + partes.join(" y ") + ".";
}

function migrarLocalStorageASupabase() {
  if (!hayNube()) return Promise.resolve(false);

  /* Sin instantánea previa, la sincronización sube todo en vez de
     comparar contra un estado que no existe. */
  Nube.enviado = null;
  return sincronizar().then(function () {
    if (Nube.fallo) return false;
    /* El cajón sin cuenta ya cumplió: se retira para que no se
       vuelva a ofrecer en cada visita. */
    try { window.localStorage.removeItem(LLAVE_BASE + ":anon"); } catch (e) { }
    escribirLocal(serializar());
    return true;
  });
}

/* Un solo escuchador para todo lo que se escribe dentro del contenido.
   Las hojas de administración quedan fuera: escribir en el buscador
   del consolidado no es escribir el portafolio, y disparaba un
   guardado por cada tecla. */
document.addEventListener("input", function (e) {
  if (!e.target.closest) return;
  if (!e.target.closest("main")) return;
  if (e.target.closest(".hoja-admin")) return;
  render(); guardar();
});

$("#f-programa").addEventListener("change", function () { syncPrograma(); adapt(); render(); guardar(); });
$("#f-area-otro").addEventListener("change", function () { adapt(); render(); guardar(); });
$("#f-etapa").addEventListener("change", function () { adapt(); render(); guardar(); });
$("#f-objetivo").addEventListener("change", function () { render(); guardar(); });

/* ═══════════════ 10 · ACCIONES Y ARRANQUE ═══════════════ */

$("#dl-proy").addEventListener("click", function () {
  pdfDescargado = true; guardar();
  descargarPDF("mis-proyectos.pdf", armarProyectos(), "Proyectos y evidencias", this);
});
$("#copy-proy").addEventListener("click", function () { copy(armarProyectos(), "Proyectos copiados", this); });

$("#dl-port-en").addEventListener("click", function () { descargarPortafolioIngles(this); });
$("#copy-port").addEventListener("click", function () { copy(armar(), "Portafolio copiado", this); });
$("#dl-port").addEventListener("click", function () {
  pdfDescargado = true; guardar();
  descargarPDF("mi-portafolio.pdf", armar(), "Portafolio profesional", this);
});
$("#dl-all").addEventListener("click", function () {
  pdfDescargado = true; guardar();
  descargarPDF("mi-portafolio-y-checklist.pdf",
    armar() + "\n\n---\n\n" + checklistMd(), "Portafolio profesional", this);
});

$("#reset").addEventListener("click", function () {
  if (!window.confirm("Se borrará todo lo que has escrito, también el borrador guardado en este navegador. ¿Continuar?")) return;

  /* Con cuenta se retira también el portafolio del servidor. Las
     tablas hijas cuelgan de él con borrado en cascada, así que se
     van proyectos, secciones y revisiones detrás. Empezar de nuevo
     tiene que significar eso, no solo vaciar la pantalla. */
  if (hayNube()) { api("/portafolio", "DELETE").catch(function () {}); }

  $$("main input[type='text'], main input[type='email'], main textarea").forEach(function (el) { el.value = ""; });
  $("#f-programa").value = "";
  $("#f-etapa").value = "estudiante";
  $("#f-objetivo").value = "practica";

  $("#proyectos-wrap").innerHTML = "";
  proyN = 0;
  addProyecto(); addProyecto(); addProyecto();

  syncPrograma();
  adapt();
  buildCheck(null, false);   /* antes conservaba las marcas del checklist */
  borrarGuardado();
  marcarGuardado("Sin cambios todavía", false);
  render();
  irA(0);
  toast("Todo listo para empezar de nuevo");
});

/* ═══════════════ ENGANCHE CON auth.js ═══════════════
   El portafolio no sabe nada de Supabase: se limita a escuchar
   cuándo cambia la sesión y a rellenar el programa. Si auth.js no
   está cargado, esto no se ejecuta y la herramienta funciona igual
   que antes, sin cuenta. */
if (typeof alCambiarSesion === "function") {
  alCambiarSesion(function (sesion) {
    /* Primero se cambia de borrador y solo después se aplica el
       perfil: al revés, aplicarPerfil() guardaría el texto de la
       cuenta anterior bajo la llave de la nueva. */
    cambiarDeBorrador();
    aplicarPerfil(sesion);
    pintarAvisoTraductor();
    pintarAvisoRevision();
    pintarAccesoAdmin();
    /* Las revisiones son de la cuenta, igual que el borrador: al
       cambiar de sesión hay que traer las de quien entra y soltar
       las del anterior. */
    revisionesFallo = "";
    cargarRevisiones();
  });
}

$("#rev-pedir").addEventListener("click", pedirRevision);

/* Los botones de la lista de revisiones se crean y se destruyen al
   repintarla, así que se escuchan desde el contenedor. */
$("#rev-guardadas").addEventListener("click", function (e) {
  var b = e.target && e.target.closest ? e.target.closest("button") : null;
  if (!b) return;
  if (b.hasAttribute("data-ver-revision")) { abrirRevisionGuardada(b.getAttribute("data-ver-revision")); return; }
  if (b.hasAttribute("data-borrar-revision")) { borrarRevision(b.getAttribute("data-borrar-revision")); }
});
$("#adm-actualizar").addEventListener("click", cargarConsolidado);
$("#adm-excel").addEventListener("click", exportarConsolidado);

/* El enlace del índice no lleva a una hoja del recorrido, así que
   se atiende aparte. */
document.addEventListener("click", function (e) {
  var a = e.target && e.target.closest
    ? e.target.closest('a[href="#admin"], a[href="#usuarios"]') : null;
  if (!a) return;
  e.preventDefault();
  irAHojaAdmin(a.getAttribute("href").slice(1));
});

/* Arranque */
syncPrograma();
adapt();

migrarBorradorAntiguo();
llaveActual = llaveDelBorrador();

/* Si ya había sesión al cargar la página, auth.js no vuelve a
   avisar: el portafolio de la cuenta hay que pedirlo aquí. */
if (hayNube()) {
  marcarGuardado("Abriendo tu portafolio…", true);
  cargarDeNube();
} else if (!restaurar()) {
  arrancarVacio();
}

render();

var inicial = hojas.map(function (h) { return "#" + h.id; }).indexOf(window.location.hash);
irA(inicial > -1 ? inicial : 0, false, true);

/* Si ya había sesión abierta al cargar la página, auth.js no vuelve
   a avisar: hay que preguntárselo una vez. */
if (typeof Cuenta !== "undefined" && Cuenta && Cuenta.sesion) {
  aplicarPerfil(Cuenta.sesion);
}
pintarAvisoTraductor();
pintarAvisoRevision();
pintarAccesoAdmin();
cargarRevisiones();
if (HOJAS_ADMIN.indexOf(window.location.hash.slice(1)) > -1) {
  irAHojaAdmin(window.location.hash.slice(1));
}

})();
</script>
</body>
</html>
