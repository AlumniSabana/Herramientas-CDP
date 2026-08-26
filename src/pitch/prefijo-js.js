/* ============================================================
   VUELTA A LA PAGINA DE ENTRADA
   ------------------------------------------------------------
   ESTO ES LO UNICO QUE HAY QUE EDITAR AL PUBLICAR.

   Por defecto apunta al nombre de archivo, que funciona si los
   HTML estan en la misma carpeta. Cuando el CDP publique la
   pagina de entrada en su direccion definitiva, sustituye el
   valor por la URL completa:

     const INICIO = "https://alumni.unisabana.edu.co/herramientas/";

   Dejalo vacio ("") para ocultar el enlace: si esta herramienta
   se publica suelta, un boton que lleva a ninguna parte es peor
   que no tener boton.
   ============================================================ */
/* Publicada en un servidor, la portada vive en la raiz del sitio: al
   subirla se renombra a «index.html» y el nombre original deja de
   existir, asi que enlazar al nombre daba un 404. */
const INICIO = "/";

/* Abriendo los archivos con doble clic no hay raiz de sitio a la que
   ir —«/» seria la raiz del disco—, asi que ahi se usa el nombre. */
const INICIO_ARCHIVO = "herramientas-alumni-sabana.html";

/* Marca de version. Los navegadores guardan en cache las paginas ya
   visitadas: al publicar una version nueva se puede seguir viendo la
   vieja. Subela cada vez que publiques. */
const VERSION = "2026.08.20";

(function volverInicio(){
  const a = document.getElementById("volver-inicio");
  if (!a) return;
  const destino = (window.location.protocol === "file:") ? INICIO_ARCHIVO : INICIO;
  if (!destino) { a.removeAttribute("href"); a.hidden = true; return; }
  a.setAttribute("href", destino + (destino.indexOf("?") < 0 ? "?v=" : "&v=") + VERSION);
})();

/* ============================================================
   MODELO DE CONTENIDO
   ============================================================ */
const TIPOS = {
  elevator: {
    nombre:"Elevator pitch",
    corto:"Elevator pitch",
    familia:"Elevator pitch",
    desc:"La síntesis más breve posible: presentas tu idea o tu perfil en lo que dura un trayecto de ascensor, para abrir una conversación que sigue después.",
    audiencia:"Contactos de networking, reclutadores, un primer acercamiento con inversionistas",
    buscan:"Entender en una frase qué haces y por qué vale la pena seguir hablando contigo.",
    riesgo:"Querer contarlo todo. En 60 segundos no cabe el proyecto: cabe la razón para agendar una reunión.",
    duracionSugerida:60,
    secciones:[
      {id:"gancho", n:"Gancho", peso:.22, objetivo:"Una frase que detenga a quien escucha: un dato, una pregunta o el problema en crudo.",
       pistas:["¿Qué dato sorprende?","¿Qué problema duele?","¿Qué pregunta obliga a pensar?"],
       kw:["problema","cada año","por ciento","%","sabías","imagina","la mayoría","pierden","cuesta","nadie","hoy","millones","dificultad","reto"]},
      {id:"quien", n:"Quién eres", peso:.20, objetivo:"Tu identidad o la del proyecto en una línea funcional, sin currículum.",
       pistas:["¿Cómo te presentas en una frase?","¿Qué haces exactamente?","¿En qué campo?"],
       kw:["soy","somos","trabajo","nos dedicamos","mi empresa","nuestro proyecto","fundé","creamos","ingenier","profesional","especialista"]},
      {id:"valor", n:"Propuesta de valor", peso:.34, objetivo:"Qué resuelves, para quién y qué te hace distinto. Es el corazón del elevator pitch.",
       pistas:["¿Qué resuelves?","¿Para quién?","¿Qué te diferencia de lo que ya existe?"],
       kw:["ayudamos","permite","resuelve","logramos","reduce","aumenta","a diferencia","único","por primera vez","nuestro valor","beneficio","ahorra","mejora"]},
      {id:"apertura", n:"Apertura de conversación", peso:.24, objetivo:"No cierres: abre. Pide el siguiente paso concreto.",
       pistas:["¿Qué quieres que pase ahora?","¿Un café, una reunión, una demo?","¿Cómo te contactan?"],
       kw:["me gustaría","podríamos","te invito","conversar","reunión","café","mostrarte","siguiente paso","contacto","escríbeme","agendar"]}
    ]
  },
  comercial: {
    nombre:"Pitch comercial",
    corto:"Comercial o de ventas",
    familia:"Sales pitch",
    desc:"Presentas un producto o servicio a un cliente potencial. No buscas inversión sino conversión: que compre, pruebe o adopte lo que ofreces.",
    audiencia:"Clientes potenciales, decisores de compra, áreas usuarias",
    buscan:"Un beneficio concreto para ellos, no una descripción de lo que hace tu producto.",
    riesgo:"Listar funcionalidades en vez de resolver el problema del cliente, y no anticipar su objeción.",
    duracionSugerida:180,
    secciones:[
      {id:"problema", n:"El problema del cliente", peso:.18, objetivo:"Nombra el dolor con las palabras del cliente, no con las tuyas.",
       pistas:["¿Qué le está costando hoy?","¿Cuánto tiempo o dinero pierde?","¿Cómo lo resuelve ahora?"],
       kw:["problema","pierden","cuesta","demora","dificultad","hoy","actualmente","manual","error","reclamo","tiempo","ineficien","dolor","necesidad"]},
      {id:"solucion", n:"Qué ofreces", peso:.18, objetivo:"Qué es, en términos que el cliente entienda sin jerga técnica.",
       pistas:["¿Qué es exactamente?","¿Cómo lo usa?","¿Qué necesita para empezar?"],
       kw:["ofrecemos","solución","producto","servicio","plataforma","permite","funciona","incluye","herramienta","implementa"]},
      {id:"beneficio", n:"Beneficio concreto", peso:.24, objetivo:"Traduce la función en resultado. Cuánto ahorra, cuánto gana, cuánto tiempo recupera.",
       pistas:["¿Cuánto ahorra en dinero o tiempo?","¿Qué mejora medible obtiene?","¿En cuánto tiempo lo nota?"],
       kw:["ahorra","reduce","aumenta","mejora","por ciento","%","horas","días","pesos","retorno","beneficio","resultado","gana","recupera"]},
      {id:"objecion", n:"La objeción anticipada", peso:.16, objetivo:"Nombra tú la duda que el cliente ya tiene en la cabeza, antes de que la diga.",
       pistas:["¿Qué le preocupa del precio o del cambio?","¿Por qué podría decir que no?","¿Qué riesgo ve?"],
       kw:["quizá","tal vez","seguramente","preocupa","duda","riesgo","precio","costo","cambio","migración","seguridad","soporte","garantía","sin compromiso","prueba"]},
      {id:"prueba", n:"Prueba o evidencia", peso:.13, objetivo:"Un caso, un cliente, una cifra. Algo que respalde lo que acabas de prometer.",
       pistas:["¿Quién más lo usa?","¿Qué resultado obtuvo?","¿Tienes un piloto o referencia?"],
       kw:["cliente","caso","empresa","piloto","implementamos","trabajamos con","resultado","referencia","por ejemplo","logró","comprobado","certificación"]},
      {id:"cierre", n:"El siguiente paso", peso:.11, objetivo:"Pide algo pequeño y concreto: una prueba, una demo, una reunión con el área técnica.",
       pistas:["¿Qué le pides ahora?","¿Una prueba gratis, una demo?","¿Con quién más hay que hablar?"],
       kw:["propongo","le propongo","prueba","demo","reunión","siguiente paso","agendamos","cotización","piloto","empezar","le parece"]}
    ]
  },
  emprendimiento: {
    nombre:"Pitch de emprendimiento",
    corto:"Emprendimiento",
    familia:"Business pitch / Investor pitch",
    duracionSugerida:300,
    desc:"Presentas una empresa o idea de negocio ante inversionistas, aceleradoras, jurados de concurso o socios potenciales.",
    audiencia:"Inversionistas, jurados, aliados comerciales",
    buscan:"Tamaño de la oportunidad, evidencia de que funciona, y por qué tu equipo es quien debe hacerlo.",
    riesgo:"Enamorarte del producto y no explicar el problema ni el negocio.",
    secciones:[
      {id:"problema", n:"Problema", peso:.16, objetivo:"Qué duele hoy, a quién y con qué frecuencia. Cuantifícalo.",
       pistas:["¿A cuántas personas afecta?","¿Cuánto cuesta el problema hoy?","¿Cómo lo resuelven ahora?"],
       kw:["problema","dolor","dificultad","necesidad","hoy","actualmente","sufre","afecta","falta","carece","reto","desafío","brecha","pierden","cuesta"]},
      {id:"solucion", n:"Solución", peso:.18, objetivo:"Qué construiste y cómo resuelve ese problema, en términos que se entiendan sin jerga.",
       pistas:["¿Qué hace exactamente?","¿Cómo lo experimenta el usuario?","¿Por qué ahora es posible?"],
       kw:["solución","plataforma","producto","servicio","aplicación","desarrollamos","creamos","construimos","permite","resuelve","ofrecemos","funciona","herramienta"]},
      {id:"mercado", n:"Mercado", peso:.14, objetivo:"Quién es el cliente, cuántos son y por qué el momento es ahora.",
       pistas:["¿Quién paga?","¿Qué tan grande es el mercado?","¿Por qué ahora?"],
       kw:["mercado","clientes","segmento","usuarios","industria","sector","millones","tamaño","potencial","demanda","target","publico objetivo","crecimiento"]},
      {id:"modelo", n:"Modelo de negocio", peso:.14, objetivo:"Cómo se gana dinero: precio, canal y unidad económica.",
       pistas:["¿Cómo cobras?","¿Cuánto cuesta adquirir un cliente?","¿Cuál es el margen?"],
       kw:["modelo","ingresos","cobramos","precio","suscripción","margen","monetiza","facturamos","comisión","venta","costo","rentab","unidad económica","ticket"]},
      {id:"traccion", n:"Tracción", peso:.16, objetivo:"La evidencia de que funciona: usuarios, ventas, pilotos, cartas de intención.",
       pistas:["¿Qué número creció?","¿Quién ya te compró o usó?","¿Desde cuándo?"],
       kw:["tracción","usuarios","clientes","ventas","crecimiento","piloto","facturación","mensual","resultados","logramos","alcanzamos","validamos","métricas","aumentó","retención"]},
      {id:"equipo", n:"Equipo", peso:.10, objetivo:"Por qué ustedes son las personas correctas para resolver esto.",
       pistas:["¿Qué experiencia relevante tienen?","¿Qué hicieron antes?","¿Quién falta?"],
       kw:["equipo","fundador","socio","cofundador","experiencia","años","trabajamos","somos","perfil","especialista","ingeniero","lideramos"]},
      {id:"cierre", n:"Pedido y cierre", peso:.12, objetivo:"Cuánto buscas, para qué lo usarás y qué quieres que pase después de esta reunión.",
       pistas:["¿Cuánto capital o qué apoyo pides?","¿En qué lo inviertes?","¿Cuál es el siguiente paso?"],
       kw:["buscamos","levantamos","ronda","inversión","capital","invitamos","proponemos","siguiente paso","reunión","acompañar","aliado","nos gustaría","queremos"]}
    ]
  },
  empleo: {
    nombre:"Pitch para búsqueda de empleo",
    corto:"Búsqueda de empleo",
    familia:"Personal pitch",
    duracionSugerida:180,
    desc:"El clásico «cuéntame de ti» en una entrevista, una feria laboral o una conversación de networking con un reclutador.",
    audiencia:"Reclutadores, líderes de área, contactos profesionales",
    buscan:"Si resuelves su problema, si encajas en el equipo y si tu historia tiene coherencia.",
    riesgo:"Recitar la hoja de vida en orden cronológico y no decir qué quieres.",
    secciones:[
      {id:"quien", n:"Quién eres hoy", peso:.14, objetivo:"Tu identidad profesional en una frase: rol, campo y foco actual.",
       pistas:["¿Cómo te presentarías en una sola línea?","¿Cuál es tu campo?","¿Qué te define profesionalmente?"],
       kw:["soy","profesional","ingenier","administrad","psicolog","comunicad","abogad","economista","médic","especialista","trabajo","me dedico","mi perfil","actualmente"]},
      {id:"trayecto", n:"Trayectoria relevante", peso:.20, objetivo:"Solo lo que conecta con el cargo. Dos o tres hitos, no toda tu historia.",
       pistas:["¿Qué experiencia se parece a este cargo?","¿En qué empresas o proyectos?","¿Cuánto tiempo?"],
       kw:["experiencia","años","trabajé","estuve","lideré","participé","empresa","proyecto","cargo","responsable","desempeñ","he trabajado","durante"]},
      {id:"logros", n:"Logros con evidencia", peso:.24, objetivo:"Resultados medibles, no funciones. Qué cambió gracias a ti.",
       pistas:["¿Qué número mejoró?","¿Cuánto ahorraste o creciste?","¿Qué se hizo distinto después de ti?"],
       kw:["logré","conseguí","aumenté","reduje","mejoré","implementé","ahorr","incrementé","optimicé","resultado","impacto","por ciento","%","logramos","alcancé","gestioné"]},
      {id:"fortalezas", n:"Qué te diferencia", peso:.16, objetivo:"La combinación de habilidades que otro candidato no trae. Concreta, no adjetivos.",
       pistas:["¿Qué sabes hacer que es poco común?","¿Qué combinación tienes?","¿Qué dicen tus colegas de ti?"],
       kw:["diferencia","fortaleza","combino","además","también","capacidad","habilidad","manejo","domino","bilingüe","certificación","técnico","único","especializ"]},
      {id:"motivo", n:"Por qué esta vacante", peso:.14, objetivo:"Qué te atrae de esta empresa y este rol en particular.",
       pistas:["¿Por qué esta empresa y no otra?","¿Qué te llamó la atención?","¿Cómo conecta con tu plan?"],
       kw:["me interesa","busco","quiero","atrae","motiva","empresa","razón","porque","valores","proyecto","oportunidad","encaja","aportar","contribuir"]},
      {id:"cierre", n:"Cierre y apertura", peso:.12, objetivo:"Devuelve la conversación con una pregunta o una disposición concreta.",
       pistas:["¿Qué te gustaría saber de ellos?","¿Cuál es tu disponibilidad?","¿Qué sigue?"],
       kw:["me gustaría","pregunta","saber","disponible","encantaría","siguiente","conversar","proceso","equipo","conocer","aportar","quedo atento"]}
    ]
  },
  academico: {
    nombre:"Pitch de proyecto académico",
    corto:"Proyecto académico",
    familia:"Rocket pitch (contexto académico)",
    duracionSugerida:300,
    desc:"Presentas una investigación, un trabajo de grado o un proyecto de curso ante docentes, pares o un comité evaluador.",
    audiencia:"Docentes, comité evaluador, pares investigadores",
    buscan:"Rigor de la pregunta, solidez del método y relevancia del hallazgo.",
    riesgo:"Contar todo el proceso y dejar el hallazgo para el final, cuando ya se acabó el tiempo.",
    secciones:[
      {id:"pregunta", n:"Pregunta de investigación", peso:.18, objetivo:"Qué querías averiguar y por qué esa pregunta vale la pena.",
       pistas:["¿Cuál es la pregunta exacta?","¿Qué vacío llena?","¿Por qué importa?"],
       kw:["pregunta","investigación","objetivo","propósito","estudiar","analizar","determinar","indagar","hipótesis","planteamiento","buscamos","nos preguntamos","problema"]},
      {id:"contexto", n:"Contexto y antecedentes", peso:.16, objetivo:"Qué se sabía antes y dónde estaba el vacío que tú abordas.",
       pistas:["¿Qué dice la literatura?","¿Qué falta por resolver?","¿Quién lo ha estudiado?"],
       kw:["antecedentes","literatura","estudios","autores","previo","investigaciones","marco","teoría","según","revisión","estado del arte","vacío","documentado"]},
      {id:"metodo", n:"Metodología", peso:.20, objetivo:"Cómo lo hiciste: diseño, muestra, instrumentos, período.",
       pistas:["¿Cuántos casos o participantes?","¿Qué instrumento usaste?","¿Cuánto duró?"],
       kw:["metodolog","método","muestra","participantes","encuesta","entrevista","datos","análisis","cualitativ","cuantitativ","diseño","instrumento","recolecc","variables","procedimiento"]},
      {id:"hallazgos", n:"Hallazgos", peso:.24, objetivo:"Los resultados concretos. Este es el centro: dales el mayor tiempo.",
       pistas:["¿Cuál es el resultado principal?","¿Qué cifra lo respalda?","¿Qué te sorprendió?"],
       kw:["resultados","hallazgos","encontramos","evidencia","datos","muestran","indica","significativ","por ciento","%","correlación","diferencia","concluye","observamos"]},
      {id:"implicaciones", n:"Implicaciones", peso:.14, objetivo:"Qué cambia con esto: para la disciplina, la práctica o la política pública.",
       pistas:["¿Quién debería usar esto?","¿Qué decisión mejora?","¿Cuál es el aporte?"],
       kw:["implicaci","aporte","contribuye","permite","recomend","aplicaci","utilidad","impacto","sugiere","futuras","política","práctica","sirve"]},
      {id:"cierre", n:"Límites y cierre", peso:.08, objetivo:"Reconoce los límites del estudio y cierra con la línea siguiente.",
       pistas:["¿Qué no alcanzaste a resolver?","¿Cuál es el siguiente paso?","¿Qué queda abierto?"],
       kw:["limitaci","limitante","alcance","futuro","próxim","siguiente","queda","pendiente","ampliar","continuar","abre","recomendamos"]}
    ]
  },
  final: {
    nombre:"Pitch de presentación final",
    corto:"Presentación final",
    familia:"Business pitch (entrega de resultados)",
    duracionSugerida:300,
    desc:"Cierras un proyecto, una consultoría o una entrega ante un cliente, un jefe o un comité que debe tomar una decisión.",
    audiencia:"Cliente, comité directivo, jefatura",
    buscan:"Si cumpliste lo prometido, qué resultado dejaste y qué deciden ahora.",
    riesgo:"Narrar el proceso paso a paso en vez de liderar con el resultado y la decisión que se necesita.",
    secciones:[
      {id:"encargo", n:"El encargo", peso:.14, objetivo:"Recuerda en una frase qué te pidieron y bajo qué condiciones.",
       pistas:["¿Cuál era el objetivo acordado?","¿Qué alcance tenía?","¿En cuánto tiempo?"],
       kw:["objetivo","encargo","nos pidieron","propósito","alcance","meta","acordamos","planteamos","desafío","reto","solicitud","misión","partimos"]},
      {id:"resultado", n:"El resultado", peso:.26, objetivo:"Abre con lo que lograste, no con lo que hiciste. Cifras primero.",
       pistas:["¿Cuál es el número principal?","¿Se cumplió la meta?","¿Cuánto mejoró?"],
       kw:["resultado","logramos","alcanzamos","cumplimos","aumentó","redujo","mejoró","entregamos","por ciento","%","meta","superamos","impacto","ahorro"]},
      {id:"como", n:"Cómo se logró", peso:.18, objetivo:"Las dos o tres decisiones clave que explican el resultado. No todo el cronograma.",
       pistas:["¿Qué decisión fue determinante?","¿Qué cambiaron en el camino?","¿Qué hicieron distinto?"],
       kw:["decidimos","implementamos","aplicamos","cambiamos","diseñamos","estrategia","enfoque","fase","proceso","trabajamos","ajustamos","clave","priorizamos"]},
      {id:"aprendizajes", n:"Aprendizajes y riesgos", peso:.16, objetivo:"Qué aprendieron y qué podría fallar hacia adelante. La honestidad construye confianza.",
       pistas:["¿Qué no salió como esperaban?","¿Qué riesgo queda vivo?","¿Qué harían distinto?"],
       kw:["aprendimos","aprendizaje","riesgo","dificultad","obstáculo","reto","lección","no funcionó","ajustar","atención","cuidado","limitaci","supuesto"]},
      {id:"siguiente", n:"Qué sigue", peso:.14, objetivo:"El plan concreto hacia adelante, con responsables y fechas.",
       pistas:["¿Qué pasa la próxima semana?","¿Quién lo hace?","¿Qué se necesita?"],
       kw:["siguiente","próxim","plan","fase","recomendamos","proponemos","continuar","implementar","cronograma","responsable","corto plazo","seguir"]},
      {id:"decision", n:"La decisión que pides", peso:.12, objetivo:"Di explícitamente qué necesitas que aprueben o decidan hoy.",
       pistas:["¿Qué necesitas que aprueben?","¿Qué presupuesto o permiso?","¿Para cuándo?"],
       kw:["necesitamos","solicitamos","aprobar","decisión","pedimos","requerimos","autoriz","luz verde","confirmar","definir","les pido","nos gustaría"]}
    ]
  }
};
const DURACIONES = [
  {seg:60,  etiq:"1 minuto",  nombre:"1 min",  desc:"Formato ascensor. Solo el gancho, el valor y la apertura."},
  {seg:180, etiq:"3 minutos", nombre:"3 min", desc:"Formato ágil. Solo lo esencial de cada sección."},
  {seg:300, etiq:"5 minutos", nombre:"5 min", desc:"El estándar. Espacio para una evidencia por sección."},
  {seg:600, etiq:"10 minutos", nombre:"10 min", desc:"Formato extenso. Admite ejemplos y matices."}
];
const NOTAS_DUR = {
  60:"Un minuto son unas 130 palabras. No cabe el proyecto entero: cabe una razón para que la conversación siga.",
  180:"Tres minutos son unas 400 palabras. Cabe una idea por sección y un solo dato fuerte: elígelo antes de empezar.",
  300:"Cinco minutos son unas 650 palabras. Puedes sostener un ejemplo desarrollado sin perder el ritmo.",
  600:"Diez minutos son unas 1.300 palabras. El riesgo cambia: ya no es quedarte corto, es perder tensión a mitad de camino."
};
/* Muletillas: fuertes cuentan completo, suaves cuentan a peso reducido */
const MULETILLAS_FUERTES = ["eh","ehh","ehhh","este","mmm","mm","aaa","ehm","em","o sea","osea","digamos","como que","en plan","tipo que","basicamente","básicamente","obviamente","literalmente","practicamente","prácticamente","no se","no sé","este pues","como quien dice"];
const MULETILLAS_SUAVES = ["bueno","entonces","pues","la verdad","a ver","nada","digo","verdad","realmente","simplemente","cierto","vale"];
const PALABRAS_CTA = ["me gustaría","quisiera","propongo","proponemos","invito","invitamos","necesito","necesitamos","solicito","solicitamos","siguiente paso","próximo paso","reunión","conversar","agendar","contactar","aprobar","decidir","pedimos","les pido","quedo atento","quedo atenta","espero","busco","buscamos","recomiendo","recomendamos"];
const VACIAS = new Set(["para","como","pero","porque","cuando","donde","entonces","tambien","también","desde","hasta","sobre","entre","todos","todas","estos","estas","esos","esas","aquel","nuestro","nuestra","nuestros","nuestras","muchos","muchas","otro","otra","otros","otras","cada","este","esta","esto","ese","esa","hemos","hacer","tiene","tienen","tenemos","puede","pueden","podemos","estar","estamos","siendo","sido","haber","habia","había","seria","sería","ademas","además","mismo","misma","hacia","segun","según","antes","despues","después","siempre","nunca","aqui","aquí","alli","allí","bien","muy","mas","más","menos","tanto","poco","mucho","algo","alguna","alguno","cual","cuales","quien","quienes"]);
/* ============================================================
   ESTADO
   ============================================================ */
const estado = {
  tipo:"empleo",
  duracion:180,
  modo:"mic",           // "mic" | "manual"
  grabando:false,
  inicio:0,
  transcurrido:0,
  finalTexto:"",
  interinoTexto:"",
  asrDisponible:false,
  asrActiva:false,
  ronda:0,
  historial:[],

  /* ----------------------------------------------------------
     MÓDULO DE CÁMARA — independiente del análisis de audio.
     Nunca contiene imágenes, frames ni video: solo números.
     «disponible» queda en null mientras no se haya intentado.
     ---------------------------------------------------------- */
  visual:{
    activo:false,        // hay cámara encendida en este momento
    usada:false,         // se usó cámara en la ronda que se va a analizar
    disponible:null,     // true/false una vez se intenta encender
    motivo:"",           // por qué no se pudo medir, en lenguaje humano
    encuadre:null,       // 0–100
    orientacion:null,    // porcentaje de tiempo de frente
    postura:null,        // 0–100
    movimiento:null,     // "quieto" | "moderado" | "alto"
    gestualidad:null,    // "baja" | "moderada" | "alta"
    resumen:null         // objeto que calcula calcularPresenciaVisual()
  }
};
let mediaStream=null, mediaRecorder=null, chunks=[], audioCtx=null, analizador=null,
    rafId=null, tickId=null, reconocedor=null, urlAudio=null;
/* ============================================================
   UTILIDADES
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function mmss(s){
  s = Math.max(0, Math.floor(s));
  return Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
}
function normaliza(t){
  return (t||"").toLowerCase()
    .normalize("NFD").replace(/\p{M}/gu,"")
    .replace(/[^\w\s%]/gi," ")
    .replace(/\s+/g," ").trim();
}
function palabras(t){
  return (t||"").trim().split(/\s+/).filter(w=>w.length>0);
}
function esc(t){
  return String(t).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function nivel(p){ return p>=75 ? "bien" : p>=50 ? "ajusta" : "revisa"; }
function etiquetaNivel(p){ return p>=75 ? "Sólido" : p>=50 ? "Ajustable" : "Prioridad"; }

/* ── Semáforo ────────────────────────────────────────────────
   La misma escala que ya usa el reporte, envuelta para poder
   ponerla junto a cualquier cifra: en el historial, en el panel de
   administración y en el detalle de una ronda.

   Devuelve el marcador completo, con su forma y su nombre. La forma
   importa: verde y amarillo se confunden con el daltonismo más
   común, así que el color no puede ser el único canal.

   Con puntaje nulo devuelve el estado «sin practicar», que no es un
   suspenso: es que todavía no hay nada que calificar. */
function semaforoNivel(p){
  if(p == null || p === "" || isNaN(Number(p))) return "nada";
  return nivel(Number(p));
}
function semaforoEtiqueta(p){
  return semaforoNivel(p) === "nada" ? "Sin practicar" : etiquetaNivel(Number(p));
}
/* cifra = qué se escribe al lado del punto; por defecto, el puntaje */
function semaforo(p, cifra){
  const n = semaforoNivel(p);
  const txt = cifra !== undefined ? cifra : (n === "nada" ? "—" : p);
  return '<span class="sem" title="' + esc(semaforoEtiqueta(p)) + '">' +
         '<span class="sem-p ' + n + '" aria-hidden="true"></span>' +
         '<span class="sem-n">' + esc(String(txt)) + "</span>" +
         '<span class="sr-solo">' + esc(semaforoEtiqueta(p)) + "</span></span>";
}
/* ============================================================
   NAVEGACIÓN POR ETAPAS
   ============================================================ */
function irA(id){
  $$(".etapa").forEach(b=>{
    const activo = b.getAttribute("aria-controls") === id;
    b.setAttribute("aria-selected", activo ? "true":"false");
  });
  $$(".panel").forEach(p=> p.hidden = (p.id !== id));
  window.scrollTo({top:0, behavior:"smooth"});
}
$$(".etapa").forEach(b => b.addEventListener("click", ()=> irA(b.getAttribute("aria-controls"))));
/* ============================================================
   RENDER — APRENDE
   ============================================================ */
(function renderTipos(){
  const cont = $("#tipos-rejilla");
  cont.innerHTML = Object.entries(TIPOS).map(([k,t])=>`
    <article class="tipo-tarjeta">
      <h3>${esc(t.nombre)}</h3>
      ${t.familia ? `<span class="familia">${esc(t.familia)}</span>` : ""}
      <p>${esc(t.desc)}</p>
      <div class="tipo-meta">
        <div class="tipo-meta-fila"><span class="tipo-meta-k">Audiencia</span><span class="tipo-meta-v">${esc(t.audiencia)}</span></div>
        <div class="tipo-meta-fila"><span class="tipo-meta-k">Qué buscan</span><span class="tipo-meta-v">${esc(t.buscan)}</span></div>
        <div class="tipo-meta-fila"><span class="tipo-meta-k">Riesgo</span><span class="tipo-meta-v">${esc(t.riesgo)}</span></div>
      </div>
    </article>`).join("");
})();
/* ============================================================
   RENDER — PREPARA
   ============================================================ */
function renderSelectores(){
  $("#selector-tipo").innerHTML = Object.entries(TIPOS).map(([k,t])=>`
    <button class="opcion" data-tipo="${k}" aria-pressed="${k===estado.tipo}">
      <span class="opcion-t">${esc(t.corto)}</span>
      <span class="opcion-d">${esc(t.audiencia)}</span>
    </button>`).join("");
  $("#selector-dur").innerHTML = DURACIONES.map(d=>`
    <button class="dur" data-seg="${d.seg}" aria-pressed="${d.seg===estado.duracion}">
      <span class="dur-n">${esc(d.nombre)}</span>
      <span class="dur-d">${esc(d.desc)}</span>
    </button>`).join("");
  $("#selector-tipo").querySelectorAll(".opcion").forEach(b=>{
    b.addEventListener("click", ()=>{ estado.tipo = b.dataset.tipo; renderSelectores(); renderGuion(); renderConsola(); });
  });
  $("#selector-dur").querySelectorAll(".dur").forEach(b=>{
    b.addEventListener("click", ()=>{ estado.duracion = +b.dataset.seg; renderSelectores(); renderGuion(); renderConsola(); });
  });
  $("#nota-dur").textContent = NOTAS_DUR[estado.duracion];
}
function seccionesConTiempo(){
  const t = TIPOS[estado.tipo], total = estado.duracion;
  let acum = 0;
  return t.secciones.map(s=>{
    const dur = Math.round(total * s.peso);
    const desde = acum; acum += dur;
    return Object.assign({}, s, {desde, hasta:acum, dur});
  });
}
function renderGuion(){
  const t = TIPOS[estado.tipo];
  $("#guion-titulo").textContent = t.nombre + " · " + mmss(estado.duracion);
  $("#guion-total").textContent = t.secciones.length + " secciones";
  $("#guion-lista").innerHTML = seccionesConTiempo().map(s=>`
    <div class="guion-fila">
      <div class="guion-t">${mmss(s.desde)}</div>
      <div class="guion-c">
        <h4>${esc(s.n)}</h4>
        <p>${esc(s.objetivo)}</p>
        <div class="guion-pistas">${s.pistas.map(p=>`<span class="pista">${esc(p)}</span>`).join("")}</div>
      </div>
      <div class="guion-seg">${s.dur}s</div>
    </div>`).join("");
}
/* ============================================================
   RENDER — CONSOLA / PRACTICA
   ============================================================ */
const CIRC = 2 * Math.PI * 88;
function renderConsola(){
  const t = TIPOS[estado.tipo];
  $("#consola-tipo").textContent = t.corto;
  $("#consola-dur").textContent = mmss(estado.duracion);
  $("#reloj-obj").textContent = "objetivo " + mmss(estado.duracion);
  $("#ritmo-lista").innerHTML = seccionesConTiempo().map(s=>`
    <div class="ritmo-item" data-desde="${s.desde}" data-hasta="${s.hasta}">
      <span class="ritmo-t">${mmss(s.desde)}</span>
      <span class="ritmo-n">${esc(s.n)}</span>
      <span class="ritmo-marca">Ahora</span>
    </div>`).join("");
}
(function construirVu(){
  $("#vumetro").innerHTML = Array.from({length:21},()=>'<div class="vu-barra"></div>').join("");
})();
function actualizarRitmo(seg){
  $$("#ritmo-lista .ritmo-item").forEach(el=>{
    const d = +el.dataset.desde, h = +el.dataset.hasta;
    el.classList.toggle("activa", seg>=d && seg<h);
    el.classList.toggle("pasada", seg>=h);
  });
}
