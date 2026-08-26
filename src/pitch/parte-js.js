/* ============================================================
   RELOJ  (continúa desde donde se cortó tu pegado)
   ============================================================ */
function actualizarReloj(){
  const seg = estado.transcurrido;
  const rel = $("#reloj"), an = $("#anillo-avance"), est = $("#reloj-estado");
  rel.textContent = mmss(seg);
  const frac = Math.min(1, seg/estado.duracion);
  an.style.strokeDashoffset = String(CIRC * (1-frac));
  const excedido = seg > estado.duracion;
  rel.classList.toggle("excedido", excedido);
  an.classList.toggle("excedido", excedido);

  const restante = estado.duracion - seg;
  if(!estado.grabando){
    est.textContent = "";
  } else if(excedido){
    est.textContent = "+" + mmss(seg - estado.duracion) + " de más";
  } else if(restante <= 15){
    est.textContent = "Cierra ya";
  } else if(restante <= 30){
    est.textContent = "Últimos 30 s";
  } else {
    est.textContent = estado.modo === "mic" ? "Grabando" : "En curso";
  }
  actualizarRitmo(seg);
}

/* ============================================================
   AUDIO — nivel de voz en vivo y reproducción
   ============================================================ */
async function iniciarAudio(){
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:false}
  });
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === "suspended"){ try{ await audioCtx.resume(); }catch(_){} }
  const fuente = audioCtx.createMediaStreamSource(mediaStream);
  analizador = audioCtx.createAnalyser();
  analizador.fftSize = 1024;
  analizador.smoothingTimeConstant = .5;
  fuente.connect(analizador);

  chunks = [];
  try{
    const mime = ["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
    mediaRecorder = new MediaRecorder(mediaStream, mime ? {mimeType:mime} : undefined);
    mediaRecorder.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    mediaRecorder.start();
  }catch(_){ mediaRecorder = null; }

  medirNivelVoz();
}

/* Vúmetro en vivo: sirve para saber que el micrófono te está
   captando. No se guarda ni se analiza nada de esto. */
function medirNivelVoz(){
  const buf = new Float32Array(analizador.fftSize);
  const barras = $$("#vumetro .vu-barra");
  const centroIdx = (barras.length - 1) / 2;

  const paso = ()=>{
    if(!estado.grabando || !analizador){ return; }
    analizador.getFloatTimeDomainData(buf);
    let suma = 0;
    for(let i=0;i<buf.length;i++){ suma += buf[i]*buf[i]; }
    const rms = Math.sqrt(suma / buf.length);

    const nivelVu = Math.min(1, rms * 11);
    barras.forEach((b,i)=>{
      const dist = Math.abs(i - centroIdx) / centroIdx;
      const alto = Math.max(.12, nivelVu * (1 - dist*.6));
      b.style.height = (alto*100).toFixed(1) + "%";
      b.classList.toggle("viva", alto > .18);
    });
    rafId = requestAnimationFrame(paso);
  };
  paso();
}

function detenerAudio(){
  if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
  $$("#vumetro .vu-barra").forEach(b=>{ b.style.height="12%"; b.classList.remove("viva"); });

  if(mediaRecorder && mediaRecorder.state !== "inactive"){
    mediaRecorder.onstop = ()=>{
      if(chunks.length){
        if(urlAudio){ URL.revokeObjectURL(urlAudio); }
        urlAudio = URL.createObjectURL(new Blob(chunks, {type: chunks[0].type || "audio/webm"}));
        $("#audio-repro").src = urlAudio;
        $("#repro").hidden = false;
      }
      liberarMedios();
    };
    try{ mediaRecorder.stop(); }catch(_){ liberarMedios(); }
  } else {
    liberarMedios();
  }
}

function liberarMedios(){
  if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream = null; }
  if(audioCtx && audioCtx.state !== "closed"){ try{ audioCtx.close(); }catch(_){} }
  audioCtx = null; analizador = null; mediaRecorder = null;
}

/* ============================================================
   RECONOCIMIENTO DE VOZ
   ============================================================ */
function iniciarASR(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    estado.asrDisponible = false;
    mostrarAviso("Tu navegador no ofrece transcripción automática. El cronómetro y la guía de ritmo funcionan igual; al terminar podrás escribir lo que dijiste para completar el análisis.");
    return false;
  }
  estado.asrDisponible = true;
  reconocedor = new SR();
  reconocedor.lang = "es-CO";
  reconocedor.continuous = true;
  reconocedor.interimResults = true;
  reconocedor.maxAlternatives = 1;

  reconocedor.onresult = e =>{
    let interino = "";
    for(let i = e.resultIndex; i < e.results.length; i++){
      const txt = e.results[i][0].transcript;
      if(e.results[i].isFinal){ estado.finalTexto += txt + " "; }
      else { interino += txt; }
    }
    estado.interinoTexto = interino;
    pintarTranscripcion();
  };

  reconocedor.onerror = e =>{
    if(e.error === "not-allowed" || e.error === "service-not-allowed"){
      mostrarAviso("El navegador bloqueó la transcripción automática. La práctica sigue con cronómetro y guía de ritmo; al terminar podrás escribir tu texto.");
      estado.asrActiva = false;
    } else if(e.error === "no-speech"){
      mostrarAviso("No se detecta voz. Acércate al micrófono o revisa el dispositivo de entrada.");
    } else if(e.error === "network"){
      mostrarAviso("La transcripción automática necesita conexión y una página servida por http(s). Si abriste el archivo con doble clic, ejecútalo desde un servidor local.");
      estado.asrActiva = false;
    }
  };

  reconocedor.onend = ()=>{
    if(estado.grabando && estado.asrActiva){
      try{ reconocedor.start(); }catch(_){}
    }
  };

  try{
    reconocedor.start();
    estado.asrActiva = true;
    return true;
  }catch(_){
    estado.asrActiva = false;
    return false;
  }
}

function detenerASR(){
  estado.asrActiva = false;
  if(reconocedor){
    try{ reconocedor.onend = null; reconocedor.stop(); }catch(_){}
    reconocedor = null;
  }
  estado.finalTexto = (estado.finalTexto + " " + estado.interinoTexto).replace(/\s+/g," ").trim();
  estado.interinoTexto = "";
}

function pintarTranscripcion(){
  const caja = $("#texto-vivo");
  caja.innerHTML = esc(estado.finalTexto) +
    (estado.interinoTexto ? '<span class="interino">' + esc(estado.interinoTexto) + '</span>' : "");
  caja.scrollTop = caja.scrollHeight;
  const n = palabras(estado.finalTexto + " " + estado.interinoTexto).length;
  $("#contador-pal").textContent = n + (n === 1 ? " palabra" : " palabras");
}

function mostrarAviso(txt){
  const c = $("#aviso-mic");
  c.textContent = txt;
  c.hidden = !txt;
}

/* ============================================================
   CONTROL DE PRÁCTICA
   ============================================================ */
function prepararPractica(modo){
  estado.modo = modo;
  estado.grabando = true;
  estado.transcurrido = 0;
  estado.finalTexto = "";
  estado.interinoTexto = "";
  estado.inicio = performance.now();

  $("#btn-grabar").disabled = true;
  $("#btn-sin-mic").disabled = true;
  $("#btn-camara").disabled = true;
  $("#btn-detener").disabled = false;
  $("#ritmo-estado").textContent = "En curso";
  $("#repro").hidden = true;

  pintarNotas();

  const manual = modo === "manual";
  $("#trans-titulo").textContent = manual ? "Escribe lo que vas diciendo" : "Transcripción en vivo";
  $("#texto-vivo").hidden = manual;
  $("#texto-manual").hidden = !manual;
  $("#trans-nota").textContent = manual
    ? "Tu voz no sale de tu equipo. Habla en voz alta contra el reloj y escribe aquí lo que dijiste; puedes completarlo al terminar."
    : "";
  if(manual){ $("#texto-manual").value = ""; $("#texto-manual").focus(); }
  else { $("#texto-vivo").innerHTML = ""; }
  $("#contador-pal").textContent = "0 palabras";

  actualizarReloj();
  tickId = setInterval(()=>{
    estado.transcurrido = (performance.now() - estado.inicio)/1000;
    actualizarReloj();
    if(estado.transcurrido > estado.duracion * 2){ detenerPractica(); }
  }, 200);
}

async function iniciarPractica(){
  mostrarAviso("");
  try{
    await iniciarAudio();
  }catch(err){
    mostrarAviso("No se pudo acceder al micrófono (" + (err && err.name ? err.name : "error") + "). Puedes usar «Practicar sin micrófono».");
    return;
  }
  prepararPractica("mic");
  iniciarASR();
}

function iniciarSinMicrofono(){
  mostrarAviso("");
  prepararPractica("manual");
}

function detenerPractica(){
  if(!estado.grabando){ return; }
  estado.grabando = false;
  if(tickId){ clearInterval(tickId); tickId = null; }
  estado.transcurrido = (performance.now() - estado.inicio)/1000;

  if(estado.modo === "mic"){
    detenerASR();
    detenerAudio();
  } else {
    estado.finalTexto = $("#texto-manual").value.trim();
  }

  /* Módulo visual: independiente del audio. Apaga la cámara y
     consolida las métricas. Si no se usó, no hace nada. */
  try{ detenerCamara(); }catch(_){}

  $("#btn-grabar").disabled = false;
  $("#btn-sin-mic").disabled = false;
  $("#btn-camara").disabled = false;
  $("#btn-detener").disabled = true;
  $("#ritmo-estado").textContent = "Terminada";
  $("#reloj-estado").textContent = "";
  actualizarRitmo(-1);
  if(estado.modo === "mic"){ pintarTranscripcion(); }

  const texto = estado.finalTexto;
  if(!palabras(texto).length){
    mostrarAviso("No quedó texto para analizar. Escribe lo que dijiste en el cuadro de la derecha y vuelve a presionar «Terminar y analizar».");
    $("#texto-manual").hidden = false;
    $("#texto-vivo").hidden = true;
    $("#trans-titulo").textContent = "Escribe lo que dijiste";
    estado.modo = "manual";
    estado.grabando = true;   // permite re-terminar sin reiniciar el reloj
    $("#btn-detener").disabled = false;
    if(tickId){ clearInterval(tickId); tickId = null; }
    return;
  }

  const res = analizar(texto, estado.transcurrido);
  generarReporte(res);
  mostrarBotonReporte();

  if(!Cuenta.sesion){
    cargarHistorial();
    return;   // sin cuenta no se guarda nada, en ninguna parte
  }
  Almacen.guardar(construirRonda(res))
    .then(guardada=>{ res.idGuardado = (guardada && guardada.id) || null; cargarHistorial(); })
    .catch(err=>{ cargarHistorial(); avisoHistorial("No se pudo guardar: " + err.message); });
}

/* Métricas visuales listas para guardar. Devuelve un objeto vacío
   si no se usó cámara, para que la fila quede igual que siempre. */
function resumenVisualParaRonda(){
  const r = estado.visual && estado.visual.resumen;
  if(!r || !r.medida){ return {medida:false}; }
  return {
    medida: true,
    puntaje: r.puntaje,
    encuadre: r.encuadre,
    orientacion: r.orientacion,
    postura: r.postura,
    movimiento: r.movimiento,
    gestualidad: r.gestualidad,
    estabilidad: r.estabilidad,
    repetitivo: r.repetitivo,
    rostro_pct: r.rostroPct,
    cuerpo_pct: r.cuerpoPct,
    manos_pct: r.manosPct,
    muestras: r.muestras,
    segundos: r.segundos
  };
}

/* Objeto que se persiste. El audio NUNCA entra aquí. */
function construirRonda(res){
  const t = TIPOS[estado.tipo];
  const ej = ejercicioPara(res);
  return {
    creada_en: new Date().toISOString(),
    tipo: estado.tipo,
    tipo_nombre: t.nombre,
    duracion_objetivo: estado.duracion,
    duracion_real: Math.round(res.segundos),
    modo: estado.modo,
    puntaje: res.puntaje,
    palabras: res.meta.nPal,
    ppm: res.meta.ppm,
    muletillas_total: res.meta.muletillas.total,
    muletillas_top: res.meta.muletillas.top.map(x=>({palabra:x[0], veces:x[1]})),
    secciones_cubiertas: res.meta.cubiertas,
    secciones_total: res.meta.totalSecciones,
    dimensiones: res.dims.map(d=>({id:d.id, nombre:d.n, valor:d.val, pct:d.pct, dato:d.dato, texto:d.txt})),
    ejercicio: {titulo:ej.titulo, texto:ej.texto, pasos:ej.pasos.map(p=>p.replace(/<[^>]+>/g,""))},
    /* Métricas de presencia visual. Solo cifras y etiquetas:
       ni video, ni imágenes, ni capturas, ni fotogramas. */
    visual: resumenVisualParaRonda(),
    transcripcion: res.texto
  };
}

function mostrarBotonReporte(){
  mostrarAviso("Reporte listo en la etapa 04.");
  irA("p-reporte");
}

/* ============================================================
   ANÁLISIS
   ============================================================ */
function contarMuletillas(texto){
  const n = " " + normaliza(texto) + " ";
  const detalle = {};
  let total = 0, ponderado = 0;

  const contar = (lista, peso)=>{
    lista.forEach(m=>{
      const t = normaliza(m);
      if(!t) return;
      const re = new RegExp("(?<=\\s)" + t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "(?=\\s)", "g");
      let c = 0;
      try{ c = (n.match(re) || []).length; }
      catch(_){
        // navegadores sin lookbehind
        const re2 = new RegExp("\\s" + t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "\\s", "g");
        let m2, idx = 0;
        while((m2 = re2.exec(n)) !== null){ c++; re2.lastIndex = m2.index + 1; if(++idx>500) break; }
      }
      if(c > 0){ detalle[m] = (detalle[m]||0) + c; total += c; ponderado += c * peso; }
    });
  };
  contar(MULETILLAS_FUERTES, 1);
  contar(MULETILLAS_SUAVES, .5);

  const top = Object.entries(detalle).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return {total, ponderado, detalle, top};
}

function analizar(texto, segundos){
  const pal = palabras(texto);
  const nPal = pal.length;
  const min = Math.max(segundos/60, .05);
  const ppm = Math.round(nPal / min);
  const mule = contarMuletillas(texto);
  const mulePorMin = mule.ponderado / min;
  const secciones = seccionesConTiempo();
  const norm = normaliza(texto);
  const dims = [];

  /* 1 · Duración -------------------------------------------------- */
  const desvio = (segundos - estado.duracion) / estado.duracion;
  const absDes = Math.abs(desvio);
  let pDur = absDes <= .05 ? 100 : absDes <= .10 ? 88 : absDes <= .20 ? 68 : absDes <= .35 ? 45 : 22;
  dims.push({
    id:"duracion", n:"Duración", val: mmss(segundos), pct: pDur,
    dato: "objetivo " + mmss(estado.duracion) + " · desvío " + (desvio>=0?"+":"−") + Math.round(absDes*100) + "%",
    txt: absDes <= .10
      ? "Cerraste dentro del margen del formato. Eso ya es señal de que el contenido está calibrado al tiempo."
      : desvio > 0
        ? "Te pasaste del objetivo. En un escenario real te habrían cortado: sobra contenido, no falta tiempo."
        : "Terminaste antes de lo previsto. Sobra espacio para una evidencia concreta en el núcleo del pitch."
  });

  /* 2 · Ritmo ----------------------------------------------------- */
  let pRit;
  if(ppm >= 115 && ppm <= 160) pRit = 100;
  else if(ppm >= 100 && ppm < 115) pRit = 78;
  else if(ppm > 160 && ppm <= 180) pRit = 72;
  else if(ppm >= 85 && ppm < 100) pRit = 55;
  else if(ppm > 180 && ppm <= 200) pRit = 48;
  else pRit = 28;
  dims.push({
    id:"ritmo", n:"Ritmo", val: ppm + " ppm", pct: pRit,
    dato: nPal + " palabras en " + mmss(segundos) + " · rango bueno 115–160",
    txt: pRit >= 75
      ? "Ritmo dentro del rango en que una audiencia sigue sin esfuerzo."
      : ppm > 160
        ? "Vas rápido. A esa velocidad quien escucha deja de procesar y solo alcanza a oír."
        : "Vas lento. Hay espacio para decir más, o el discurso está sostenido por pausas de duda."
  });

  /* 3 · Fluidez --------------------------------------------------- */
  let pFlu = mulePorMin <= 1 ? 100 : mulePorMin <= 2.5 ? 82 : mulePorMin <= 4 ? 62 : mulePorMin <= 6 ? 40 : 20;
  dims.push({
    id:"fluidez", n:"Fluidez", val: mule.total + "", pct: pFlu,
    dato: mulePorMin.toFixed(1) + " por minuto" + (mule.top.length ? " · " + mule.top.map(t=>"«"+t[0]+"» ×"+t[1]).join(", ") : ""),
    txt: pFlu >= 75
      ? "Muy pocas muletillas. El discurso avanza sin relleno."
      : "Las muletillas aparecen cuando el cerebro busca la siguiente idea. Se reducen conociendo mejor la estructura, no hablando más despacio."
  });

  /* 4 · Estructura ------------------------------------------------ */
  const cobertura = secciones.map(s=>{
    const hits = s.kw.filter(k => norm.includes(normaliza(k))).length;
    return {n:s.n, hits, cubierta: hits >= 2};
  });
  const cubiertas = cobertura.filter(c=>c.cubierta).length;
  const pEst = Math.round(cubiertas / secciones.length * 100);
  const faltantes = cobertura.filter(c=>!c.cubierta).map(c=>c.n);
  dims.push({
    id:"estructura", n:"Cobertura de estructura", val: cubiertas + "/" + secciones.length, pct: pEst,
    dato: faltantes.length ? "sin señal en: " + faltantes.join(", ") : "todas las secciones aparecen",
    txt: faltantes.length
      ? "No se detectó lenguaje propio de " + (faltantes.length===1 ? "una sección" : faltantes.length + " secciones") + ". Puede ser que las omitieras, o que las dijeras en términos tan generales que no se distinguen."
      : "Recorriste las secciones del guion. La estructura se sostuvo de principio a fin."
  });

  /* 5 · Concreción ------------------------------------------------
     Mide cuántas «anclas» tiene el discurso: datos que quien escucha
     puede verificar o recordar, frente a adjetivos que cualquiera
     podría decir de sí mismo. Antes esta dimensión mostraba una
     densidad abstracta que no le decía nada a nadie; ahora enseña
     exactamente qué contó como ancla y cuántas hacían falta. */
  const cifras = (texto.match(/\b\d+([.,]\d+)?\s*(%|por ciento|mil|millones?|años?|meses?|semanas?|d[ií]as?|horas?|minutos?|veces|personas|clientes|usuarios|pesos|d[oó]lares)?/gi) || [])
    .map(c => c.trim()).filter(Boolean);
  const propios = (texto.match(/(?<![.!?¿¡]\s)(?<!^)\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/g) || []);
  const propiosUnicos = Array.from(new Set(propios));

  /* Los nombres propios cuentan la mitad que una cifra: sitúan, pero
     no prueban. Y se topan en 8 para que una lista de nombres no
     compense la falta de datos. */
  const anclas = cifras.length + Math.min(propiosUnicos.length, 8) * .5;
  const cada100 = anclas / Math.max(1, nPal/100);

  /* Referencia declarada en pantalla, igual que el rango de ritmo:
     entre 2,5 y 6 anclas por cada 100 palabras es lo que sostiene un
     pitch sin volverlo un listado de cifras. */
  let pCon = cada100 >= 4 ? 100 : cada100 >= 2.5 ? 82 : cada100 >= 1.5 ? 62 : cada100 >= .8 ? 42 : 22;
  if(cada100 > 9){ pCon = Math.min(pCon, 74); }   // saturado de números

  const ejemploCifras = cifras.slice(0, 3).map(c => "«" + c + "»").join(", ");
  const faltan = Math.max(0, Math.ceil((2.5 * Math.max(1, nPal/100)) - anclas));

  dims.push({
    id:"concrecion", n:"Concreción · datos que respaldan",
    val: cifras.length + (cifras.length === 1 ? " cifra" : " cifras"), pct: pCon,
    dato: "detectadas: " + (ejemploCifras || "ninguna cifra") +
          (propiosUnicos.length ? " · " + propiosUnicos.length + (propiosUnicos.length === 1 ? " nombre propio" : " nombres propios") : " · sin nombres propios") +
          " · " + cada100.toFixed(1).replace(".", ",") + " anclas por cada 100 palabras · rango bueno 2,5–6",
    txt: (function(){
      const que = "Una «ancla» es un dato que quien escucha puede verificar o recordar: una cifra, una fecha, un plazo, el nombre de un cliente o de una institución. ";
      if(cada100 > 9){
        return que + "Aquí sobran: el discurso se volvió un listado de números y ninguno alcanza a pesar. Quédate con los dos o tres que de verdad prueban tu punto y explica qué significan.";
      }
      if(pCon >= 75){
        return que + "Tienes suficientes y bien repartidas. Los números hacen el trabajo que los adjetivos no pueden: «redujimos 40%» convence donde «mejoramos mucho» no dice nada.";
      }
      return que + "En esta ronda " + (anclas < 1 ? "no apareció ninguna" : "aparecieron pocas") +
        ". Para un texto de " + nPal + " palabras te " + (faltan === 1 ? "falta 1" : "faltan unas " + faltan) +
        ". Revisa cada frase con un adjetivo —«muy eficiente», «gran impacto»— y cámbiala por el dato que la respalda.";
    })()
  });

  /* 6 · Cierre ---------------------------------------------------- */
  const corte = Math.floor(pal.length * .78);
  const cola = normaliza(pal.slice(corte).join(" "));
  const ctas = PALABRAS_CTA.filter(c => cola.includes(normaliza(c)));
  const hayPregunta = /[?¿]/.test(pal.slice(corte).join(" "));
  let pCie = ctas.length >= 2 ? 100 : ctas.length === 1 ? 76 : hayPregunta ? 58 : 20;
  dims.push({
    id:"cierre", n:"Cierre con petición", val: ctas.length ? "Sí" : (hayPregunta ? "Parcial" : "No"), pct: pCie,
    dato: ctas.length ? "detectado: " + ctas.slice(0,3).map(c=>"«"+c+"»").join(", ") : "no se detectó una petición explícita en el tramo final",
    txt: pCie >= 75
      ? "Cerraste pidiendo algo concreto. Eso convierte el pitch en una conversación que continúa."
      : "El final se apaga sin pedir nada. Define en una frase qué quieres que pase después y dilo en voz alta."
  });

  /* 7 · Presencia visual ------------------------------------------
     La calcula el módulo de cámara, que corre aparte. Si no hubo
     cámara devuelve pct null y la dimensión no entra al promedio. */
  dims.push(generarReporteVisual());

  const medibles = dims.filter(d=>d.pct !== null);
  const puntaje = Math.round(medibles.reduce((a,d)=>a+d.pct,0) / medibles.length);

  const positivos = medibles.filter(d=>d.pct >= 75).sort((a,b)=>b.pct-a.pct);
  const mejoras  = medibles.filter(d=>d.pct < 75).sort((a,b)=>a.pct-b.pct);

  return {
    dims, puntaje, positivos, mejoras, texto, segundos,
    meta:{nPal, ppm, muletillas:mule, cifras:cifras.length, cubiertas, totalSecciones:secciones.length, faltantes}
  };
}

/* ============================================================
   REPORTE
   ============================================================ */
function ejercicioPara(res){
  const peor = res.mejoras[0];
  const t = TIPOS[estado.tipo];
  const mapa = {
    duracion:{
      titulo:"Recorta antes de repetir",
      texto:"El problema no es la velocidad, es el volumen de contenido. Antes de la siguiente ronda, decide qué sale.",
      pasos:["Escribe tu guion completo y <strong>marca una sola idea por sección</strong>. Todo lo demás se va.",
             "Cronometra cada sección por separado leyendo en voz alta, sin apurarte.",
             "Suma los tiempos. Si el total pasa el objetivo, recorta contenido — nunca aceleres para que quepa."]
    },
    ritmo:{
      titulo:"Calibra la velocidad con un tramo de referencia",
      texto:"El ritmo cómodo está entre 115 y 160 palabras por minuto. Se entrena con un fragmento corto, no con el pitch entero.",
      pasos:["Toma <strong>solo la primera sección</strong> del guion y dila en voz alta cronometrando.",
             "Ajusta hasta que ese tramo caiga en su tiempo asignado sin correr ni arrastrar.",
             "Cuando lo tengas, ese es tu ritmo de referencia. Repite el pitch completo tratando de sostenerlo."]
    },
    fluidez:{
      titulo:"Cambia la muletilla por silencio",
      texto:"Las muletillas aparecen mientras buscas la siguiente idea. La solución no es hablar más despacio: es tener la estructura tan clara que no necesites rellenar.",
      pasos:["Memoriza <strong>la primera frase de cada sección</strong> — solo esas. Son tus puntos de anclaje.",
             "Practica y cada vez que sientas venir una muletilla, <strong>calla dos segundos</strong>. Un silencio breve se lee como seguridad; «eh» se lee como duda.",
             "Repite hasta que las transiciones entre secciones salgan sin relleno."]
    },
    estructura:{
      titulo:"Recorre el guion sección por sección",
      texto:"Quedaron secciones sin señal clara: " + (res.meta.faltantes.join(", ") || "—") + ". O no las dijiste, o fueron tan generales que se diluyeron.",
      pasos:["Vuelve a la etapa <strong>Prepara</strong> y lee el objetivo de cada sección que falló.",
             "Escribe <strong>una frase concreta</strong> que responda a cada pregunta guía de esas secciones.",
             "Practica solo esas secciones aisladas antes de volver al pitch completo."]
    },
    concrecion:{
      titulo:"Una cifra por sección",
      texto:"Sin datos concretos, cualquier persona podría decir lo mismo que tú. La especificidad es lo que hace un pitch memorable.",
      pasos:["Elige <strong>un número real por sección</strong>: un porcentaje, un plazo, un monto, una cantidad de casos.",
             "Escríbelos en las notas de apoyo antes de practicar.",
             "En la siguiente ronda, obligate a decir todos. Si no tienes el dato, di el orden de magnitud — pero no lo reemplaces por un adjetivo."]
    },
    cierre:{
      titulo:"Escribe tu petición antes de ensayar",
      texto:"Para un pitch de tipo «" + t.corto.toLowerCase() + "», la última frase decide si hay siguiente conversación.",
      pasos:["Completa esta frase: <strong>«Me gustaría ___ para ___»</strong>. Sé específico en tiempo y acción.",
             "Escríbela literal en las notas de apoyo.",
             "Practica los últimos 30 segundos por separado, cinco veces, hasta que salga sin titubear."]
    },
    visual:{
      titulo:"Arma el encuadre antes de hablar",
      texto:"Lo que se ve pesa antes de que digas la primera frase. El encuadre y la postura se deciden en treinta segundos, no en el pitch.",
      pasos:["Sube la cámara <strong>a la altura de los ojos</strong> — con libros si hace falta — y siéntate a distancia de brazo.",
             "Encuádrate de la mitad del pecho para arriba, con dos dedos de aire sobre la cabeza, y deja el lente al frente.",
             "Pega tus notas <strong>justo debajo del lente</strong>: así el gesto de leer no te saca de la cámara.",
             "Antes de empezar, planta los pies o apoya la espalda. Repite la ronda y compara el puntaje de encuadre."]
    },
  };
  const base = peor ? mapa[peor.id] : null;
  return base || {
    titulo:"Sube la exigencia",
    texto:"Todas las dimensiones medidas están en verde. El siguiente nivel es hacerlo bajo presión.",
    pasos:["Repite el pitch <strong>sin mirar el guion ni las notas</strong>.",
           "Pídele a alguien que te interrumpa a mitad de camino con una pregunta y retoma donde ibas.",
           "Prueba el mismo contenido en el formato inmediatamente más corto."]
  };
}

function marcarMuletillas(texto){
  const todas = MULETILLAS_FUERTES.concat(MULETILLAS_SUAVES)
    .slice().sort((a,b)=>b.length-a.length)
    .map(m=>m.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  let html = esc(texto);
  try{
    const re = new RegExp("(^|[\\s,;.:¡¿(])(" + todas.join("|") + ")(?=[\\s,;.:!?)]|$)", "gi");
    html = html.replace(re, (m,p1,p2)=> p1 + '<mark class="muletilla">' + p2 + '</mark>');
  }catch(_){}
  return html;
}

function generarReporte(res){
  ultimoReporte = res;
  const t = TIPOS[estado.tipo];
  const ej = ejercicioPara(res);
  const sello = nivel(res.puntaje);
  const veredicto = res.puntaje >= 75
    ? "Entrega sólida. Lo que sigue es pulir detalles, no rehacer el pitch."
    : res.puntaje >= 50
      ? "La base está. Hay dos o tres ajustes concretos que cambian bastante el resultado."
      : "Todavía hay trabajo estructural. Empieza por la dimensión más baja y repite.";

  const dimsHtml = res.dims.map(d=>{
    if(d.pct === null){
      return `
        <div class="dim">
          <div>
            <div class="dim-cab"><h4>${esc(d.n)}</h4><span class="chip ajusta">Sin medición</span></div>
            <p>${esc(d.txt)}</p>
            <div class="dim-dato">${esc(d.dato)}</div>
          </div>
          <div class="dim-medida"><span class="dim-val">—</span></div>
        </div>`;
    }
    const nv = nivel(d.pct);
    return `
      <div class="dim">
        <div>
          <div class="dim-cab"><h4>${esc(d.n)}</h4><span class="chip ${nv}">${esc(etiquetaNivel(d.pct))}</span></div>
          <p>${esc(d.txt)}</p>
          <div class="dim-dato">${esc(d.dato)}</div>
        </div>
        <div class="dim-medida">
          <span class="dim-val">${esc(d.val)}</span>
          <div class="barra"><div class="barra-i ${nv}" style="width:${d.pct}%"></div></div>
        </div>
      </div>`;
  }).join("");

  const lista = (arr, marca, vacio) => arr.length
    ? `<div class="lista-fb">${arr.map(d=>`
        <div class="fb-item"><span class="fb-marca">${marca}</span><div><strong>${esc(d.n)}.</strong> ${esc(d.txt)}</div></div>`).join("")}</div>`
    : `<p class="nota-pie" style="margin-top:12px">${esc(vacio)}</p>`;

  $("#reporte-contenido").innerHTML = `
    <div class="marcador">
      <div class="puntaje">
        <div class="puntaje-n" style="color:var(--${sello === "bien" ? "bien" : sello === "ajusta" ? "ajusta" : "revisa"})">${res.puntaje}</div>
        <div class="puntaje-de">de 100</div>
        <div class="puntaje-sello chip ${sello}">${esc(etiquetaNivel(res.puntaje))}</div>
      </div>
      <div class="veredicto">
        <h3>${esc(t.nombre)} · ${mmss(estado.duracion)}</h3>
        <p>${esc(veredicto)}</p>
        <div class="veredicto-meta">
          <div class="vm"><span class="vm-n">${mmss(res.segundos)}</span><span class="vm-t">Duración real</span></div>
          <div class="vm"><span class="vm-n">${res.meta.ppm}</span><span class="vm-t">Palabras / min</span></div>
          <div class="vm"><span class="vm-n">${res.meta.nPal}</span><span class="vm-t">Palabras</span></div>
          <div class="vm"><span class="vm-n">${res.meta.muletillas.total}</span><span class="vm-t">Muletillas</span></div>
          <div class="vm"><span class="vm-n">${res.meta.cubiertas}/${res.meta.totalSecciones}</span><span class="vm-t">Secciones</span></div>
        </div>
      </div>
    </div>

    <div class="dimensiones">${dimsHtml}</div>

    <div class="dos-col">
      <div class="tarjeta pos">
        <h3>Lo que sostuviste</h3>
        ${lista(res.positivos, "✓", "Ninguna dimensión llegó al umbral alto en esta ronda. Es normal en la primera.")}
      </div>
      <div class="tarjeta mej">
        <h3>Lo que conviene ajustar</h3>
        ${lista(res.mejoras, "→", "Nada por debajo del umbral. Sube la exigencia con el ejercicio de abajo.")}
      </div>
    </div>

    <div class="tarjeta obs">
      <div class="obs-cab">
        <h3>Observaciones sobre tu entrega</h3>
        <span class="obs-fuente ia" id="obs-fuente">Análisis con IA</span>
      </div>
      <p class="nota-pie" style="margin-top:8px" id="obs-nota">${
        observacionesDisponibles()
          ? "Se enviarán tus cifras, tu transcripción y tu programa académico al servicio de IA de la Universidad para redactar un análisis personalizado. El audio no se envía. Solo ocurre si presionas el botón."
          : motivoSinObservaciones()
      }</p>
      <div id="obs-cuerpo">${res.observacionesHtml || ""}</div>
      <div style="margin-top:16px">${
        observacionesDisponibles()
          ? '<button class="btn btn-primario" id="obs-generar" style="display:inline-flex">' +
            (res.observacionesHtml ? "Volver a generar" : "Generar observaciones") + "</button>"
          : (Cuenta.sesion ? "" : '<button class="btn btn-primario" id="obs-entrar" style="display:inline-flex">Crear cuenta o iniciar sesión</button>')
      }</div>
    </div>

    <div class="ejercicio">
      <span class="etiqueta">Ejercicio para la siguiente ronda</span>
      <h3>${esc(ej.titulo)}</h3>
      <p>${esc(ej.texto)}</p>
      <ol>${ej.pasos.map(p=>`<li>${p}</li>`).join("")}</ol>
    </div>

    <div class="transcripcion-rev tarjeta">
      <h3>Lo que dijiste</h3>
      <p class="nota-pie" style="margin:6px 0 14px">Las muletillas detectadas están resaltadas. Se procesó en tu navegador y desaparece al cerrar la pestaña.</p>
      <div class="trans-texto">${marcarMuletillas(res.texto)}</div>
    </div>

    <div class="acciones-rep">
      ${(Cuenta.sesion && !res.idGuardado)
        ? '<button class="btn btn-primario" id="rep-guardar">Guardar esta ronda en mi cuenta</button>'
        : ""}
      <button class="btn btn-linea" id="rep-otra">Practicar otra ronda</button>
      <button class="btn btn-linea" id="rep-descargar">Descargar reporte (.pdf)</button>
      <button class="btn btn-linea" id="rep-guion">Volver al guion</button>
    </div>
    <p class="nota-pie" id="rep-aviso" style="margin-top:10px"></p>
  `;


  $("#rep-otra").addEventListener("click", ()=> irA("p-practica"));
  if($("#rep-guardar")){
    $("#rep-guardar").addEventListener("click", async ()=>{
      const b = $("#rep-guardar");
      b.disabled = true; b.textContent = "Guardando…";
      try{
        const g = await Almacen.guardar(construirRonda(res));
        res.idGuardado = (g && g.id) || null;
        if(res.observacionesHtml && res.observacionesTexto){
          Almacen.guardarObservaciones(res.idGuardado, res.observacionesTexto);
        }
        await cargarHistorial();
        b.remove();
        avisoHistorial("Ronda guardada en tu cuenta.");
      }catch(err){
        b.disabled = false; b.textContent = "Guardar esta ronda en mi cuenta";
        avisoHistorial("No se pudo guardar: " + err.message);
      }
    });
  }
  $("#rep-guion").addEventListener("click", ()=> irA("p-prepara"));
  $("#rep-descargar").addEventListener("click", ()=>{
    try{ descargarReportePDF(res, ej); avisoReporte("Reporte descargado en PDF."); }
    catch(err){ avisoReporte("No se pudo generar el PDF (" + err.message + "). Descargando en texto."); descargarReporte(res, ej); }
  });

  if($("#obs-entrar")){
    $("#obs-entrar").addEventListener("click", ()=> abrirModal("registro"));
  }
  if($("#obs-generar")){
    $("#obs-generar").addEventListener("click", async ()=>{
      const b = $("#obs-generar"), cuerpo = $("#obs-cuerpo");
      const etiquetaPrevia = b.textContent;
      b.disabled = true;
      b.textContent = "Generando…";
      cuerpo.innerHTML = '<div class="obs-cargando"><span class="punto"></span>Generando análisis personalizado…</div>';
      try{
        const o = await pedirObservaciones(res);
        cuerpo.innerHTML = o.html;
        res.observacionesHtml = o.html;
        res.observacionesTexto = o.texto;   // lo que se guarda
        res.observacionesPlano = o.plano;   // lo que va al PDF
        $("#obs-nota").textContent = "Redactadas por el servicio de IA de la Universidad a partir de tus cifras, tu transcripción y tu historial. Son orientación de práctica, no una evaluación académica.";
        b.disabled = false;
        b.textContent = "Volver a generar";
        Almacen.guardarObservaciones(res.idGuardado, o.texto);
      }catch(err){
        /* Mensaje único y claro para quien practica, con el motivo
           concreto debajo: sin él, un fallo de despliegue o el tope
           diario se confunden con un error cualquiera. */
        cuerpo.innerHTML =
          '<div class="obs-error"><strong>No fue posible generar las observaciones. Intenta nuevamente.</strong>' +
          '<span class="detalle">Motivo: ' + esc(err.message) + '</span></div>';
        b.disabled = false;
        b.textContent = etiquetaPrevia;
      }
    });
  }

}

function fechaCorta(iso){
  try{
    const d = new Date(iso);
    const p = n => String(n).padStart(2,"0");
    return p(d.getDate()) + "/" + p(d.getMonth()+1) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }catch(_){ return "—"; }
}

function renderHistorial(){
  const filas = estado.historial;
  const conCuenta = !!Cuenta.sesion;

  /* Sin cuenta no hay historial que mostrar: no se guarda nada. */
  $("#historial").hidden = !conCuenta;
  $("#hist-invitacion").hidden = conCuenta;
  if(!conCuenta){ return; }

  $("#hist-titulo").textContent = "Tu historial";
  $("#hist-sub").textContent = "Guardado en tu cuenta (" + Cuenta.sesion.correo + "). Disponible desde cualquier dispositivo.";
  $("#hist-vacio").hidden = filas.length > 0;
  /* El Excel es de cualquiera: son sus propias rondas. El
     consolidado de todo el mundo sigue estando solo en el panel de
     administración, que es otro botón y otra consulta. */
  $("#hist-excel").hidden = false;
  $("#historial-cuerpo").innerHTML = filas.map((h,i)=>`
    <tr data-id="${esc(h.id)}">
      <td class="num">${filas.length - i}</td>
      <td class="num">${fechaCorta(h.creada_en)}</td>
      <td>${esc(h.tipo_nombre || h.tipo)}</td>
      <td class="num">${mmss(h.duracion_objetivo)}</td>
      <td class="num">${mmss(h.duracion_real)}</td>
      <td class="num">${h.ppm}</td>
      <td class="num">${h.muletillas_total}</td>
      <td class="num">${semaforo(h.puntaje)}</td>
      <td><button class="btn-mini" data-borrar="${esc(h.id)}">Borrar</button></td>
    </tr>`).join("");

  $$("#historial-cuerpo [data-borrar]").forEach(b=>{
    b.addEventListener("click", ()=>{
      Almacen.borrar(b.dataset.borrar)
        .then(()=>{ cargarHistorial(); avisoHistorial("Ronda eliminada."); })
        .catch(e=> avisoHistorial("No se pudo eliminar: " + e.message));
    });
  });
}

function avisoHistorial(txt){
  const c = $("#hist-aviso");
  if(!c) return;
  c.textContent = txt;
  if(txt){ setTimeout(()=>{ if(c.textContent === txt) c.textContent = ""; }, 6000); }
}

function cargarHistorial(){
  return Almacen.listar()
    .then(lista=>{
      estado.historial = lista;
      estado.ronda = lista.length;
      renderHistorial();
      cargarAdmin();
    })
    .catch(err=>{
      estado.historial = [];
      renderHistorial();
      avisoHistorial("No se pudo leer el historial: " + err.message);
    });
}

/* ============================================================
   DESCARGA DEL REPORTE
   ============================================================ */
function textoReporte(res, ej){
  const t = TIPOS[estado.tipo];
  const L = [];
  const sep = "=".repeat(58);
  L.push("ESTUDIO DE PITCH — ALUMNI SABANA");
  L.push("Centro de Desarrollo Profesional · Universidad de La Sabana");
  L.push(sep, "");
  L.push("Escenario : " + t.nombre);
  L.push("Formato   : " + mmss(estado.duracion));
  L.push("Duración  : " + mmss(res.segundos));
  L.push("Modo      : " + (estado.modo === "mic" ? "con micrófono" : "sin micrófono"));
  L.push("Puntaje   : " + res.puntaje + "/100 (" + etiquetaNivel(res.puntaje) + ")");
  L.push("", sep, "DIMENSIONES", sep, "");
  res.dims.forEach(d=>{
    L.push((d.pct === null ? "[ — ] " : "[" + String(d.pct).padStart(3," ") + "] ") + d.n + " — " + d.val);
    L.push("      " + d.dato);
    L.push("      " + d.txt);
    L.push("");
  });
  L.push(sep, "EJERCICIO PARA LA SIGUIENTE RONDA", sep, "");
  L.push(ej.titulo);
  L.push(ej.texto, "");
  ej.pasos.forEach((p,i)=> L.push("  " + (i+1) + ". " + p.replace(/<[^>]+>/g,"")));
  L.push("", sep, "TRANSCRIPCIÓN", sep, "");
  L.push(res.texto);
  L.push("", sep);
  L.push("Este reporte se calculó en tu navegador a partir de señales medibles");
  L.push("de tu entrega. No evalúa la calidad de tus argumentos ni sustituye");
  L.push("una asesoría personalizada del CDP.");
  return L.join("\n");
}

function avisoReporte(txt){
  const c = $("#rep-aviso");
  if(!c) return;
  c.textContent = txt;
  setTimeout(()=>{ if(c) c.textContent = ""; }, 4000);
}

function nombreArchivo(){
  const d = new Date();
  const p = n => String(n).padStart(2,"0");
  return "reporte-pitch-" + estado.tipo + "-" +
         d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + "-" +
         p(d.getHours()) + p(d.getMinutes()) + ".txt";
}

function descargarReporte(res, ej){
  try{
    const blob = new Blob([textoReporte(res, ej)], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nombreArchivo();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
    avisoReporte("Reporte descargado.");
  }catch(_){
    avisoReporte("No se pudo descargar. Copia el texto manualmente desde «Lo que dijiste».");
  }
}

/* ============================================================
   TAXONOMÍA Y CRITERIOS
   ------------------------------------------------------------
   Tomados de la metodología del CDP: Sabaj et al. (2020) para la
   clasificación de tipos y SENA (2018) para los criterios.
   ============================================================ */
const TAXONOMIA = [
  {tipo:"Elevator pitch", practica:"elevator",
   que:"Síntesis muy breve de una idea, producto o servicio y de su propuesta de valor.",
   objetivo:"Captar atención inmediata y abrir una conversación.",
   dur:"30 a 60 s",
   audiencia:"Networking, reclutadores, primer acercamiento con inversionistas.",
   rasgo:"Alta concisión, mensaje memorable, foco en el valor."},
  {tipo:"Business pitch", practica:"emprendimiento",
   que:"Presentación del emprendimiento o proyecto para persuadir a un evaluador.",
   objetivo:"Obtener interés, validación o recursos.",
   dur:"Corta o media",
   audiencia:"Inversionistas, socios, jurados.",
   rasgo:"Integra problema, solución, mercado y viabilidad."},
  {tipo:"Investor pitch", practica:"emprendimiento",
   que:"Presentación dirigida a obtener financiación externa.",
   objetivo:"Convencer sobre la oportunidad de negocio y el retorno.",
   dur:"5 a 15 min",
   audiencia:"Ángeles inversionistas, capital de riesgo, comités.",
   rasgo:"Mayor densidad de evidencia, métricas y proyecciones."},
  {tipo:"Pitch deck", practica:null,
   que:"Soporte visual estructurado que acompaña la presentación.",
   objetivo:"Organizar y respaldar el discurso oral.",
   dur:"10 a 15 diapositivas",
   audiencia:"Inversionistas, jurados, incubadoras.",
   rasgo:"Secuencia visual: problema, solución, mercado, modelo, equipo."},
  {tipo:"Sales pitch", practica:"comercial",
   que:"Presentación comercial orientada al cliente.",
   objetivo:"Convencer para comprar, probar o adoptar una solución.",
   dur:"1 a 5 min",
   audiencia:"Clientes potenciales, decisores de compra.",
   rasgo:"Énfasis en beneficios concretos y en las objeciones del cliente."},
  {tipo:"Rocket pitch", practica:"academico",
   que:"Formato breve pero más desarrollado que el elevator pitch.",
   objetivo:"Presentar la totalidad esencial del proyecto con claridad.",
   dur:"1 a 3 min",
   audiencia:"Concursos, aceleradoras, jurados.",
   rasgo:"Mayor estructura narrativa que el elevator pitch."},
  {tipo:"Video pitch", practica:null,
   que:"Pitch entregado en formato audiovisual.",
   objetivo:"Comunicar la propuesta de forma sintética y atractiva.",
   dur:"Variable",
   audiencia:"Convocatorias, evaluadores remotos, plataformas digitales.",
   rasgo:"Exige claridad visual, guion preciso y síntesis."},
  {tipo:"Personal pitch", practica:"empleo",
   que:"Presentación del perfil, la experiencia y el valor profesional.",
   objetivo:"Posicionamiento individual y generación de confianza.",
   dur:"1 a 2 min",
   audiencia:"Empleadores, contactos profesionales, redes.",
   rasgo:"Se centra en trayectoria, fortalezas y diferenciación personal."}
];

const CRITERIOS = [
  {n:"Claridad del problema", g:"contenido",
   d:"Si el pitch identifica con precisión la necesidad, el reto o el dolor que se quiere resolver, y deja evidente por qué le importa a quien escucha."},
  {n:"Pertinencia de la solución", g:"contenido",
   d:"Si la propuesta responde de forma directa y lógica al problema planteado, y resulta comprensible y útil."},
  {n:"Propuesta de valor e innovación", g:"contenido",
   d:"Qué tan diferenciada o novedosa es frente a las alternativas existentes, y qué aporta de distinto."},
  {n:"Viabilidad técnica y metodológica", g:"contenido",
   d:"Si la idea puede ejecutarse de forma realista: ruta de implementación, recursos y coherencia entre lo que se promete y lo que puede hacerse."},
  {n:"Viabilidad del modelo de negocio", g:"contenido",
   d:"Si la forma de generar ingresos o sostener el proyecto es lógica y compatible con el mercado. Aplica sobre todo en emprendimiento."},
  {n:"Conocimiento del mercado", g:"contenido",
   d:"Si se entiende el público objetivo, el contexto y la oportunidad: segmentación, tamaño o una lectura razonable de la demanda."},
  {n:"Impacto esperado", g:"contenido",
   d:"Los beneficios o resultados que puede generar la propuesta: económicos, sociales, operativos o académicos, según el caso."},
  {n:"Calidad de la presentación y persuasión", g:"forma",
   d:"La capacidad de comunicar de manera convincente y ajustada al tiempo: seguridad, orden y capacidad de sostener el interés."},
  {n:"Claridad y estructura del discurso", g:"forma",
   d:"Si sigue una secuencia lógica —apertura, problema, solución, evidencia y cierre— que haga fácil seguir el mensaje."},
  {n:"Comunicación oral y no verbal", g:"forma",
   d:"Voz, postura, contacto visual, gestos y seguridad al hablar. Pesa mucho porque la forma influye en la credibilidad."},
  {n:"Uso de recursos de apoyo", g:"forma",
   d:"Calidad de diapositivas, imágenes o gráficos: que refuercen el mensaje sin saturarlo."},
  {n:"Manejo del tiempo", g:"forma",
   d:"Si la exposición se ajusta al tiempo asignado. Excederse o quedarse corto afecta la comprensión y el impacto."},
  {n:"Capacidad de respuesta en preguntas", g:"forma",
   d:"Si se responde con precisión, seguridad y coherencia. Muestra dominio real del proyecto."}
];

/* Pinta la tabla de los ocho tipos. Cuando el tipo tiene equivalente
   entre nuestros seis escenarios, el nombre queda enlazado a Prepara. */
(function renderTaxonomia(){
  const cuerpo = $("#taxonomia-cuerpo");
  if(!cuerpo) return;
  cuerpo.innerHTML = TAXONOMIA.map(t=>`
    <tr>
      <td class="tipo-nom">${
        t.practica
          ? `<a href="#" class="ir-escenario" data-tipo="${esc(t.practica)}">${esc(t.tipo)}</a>`
          : esc(t.tipo)
      }</td>
      <td>${esc(t.que)}</td>
      <td>${esc(t.objetivo)}</td>
      <td>${esc(t.dur)}</td>
      <td>${esc(t.audiencia)}</td>
      <td>${esc(t.rasgo)}</td>
    </tr>`).join("");
  cuerpo.addEventListener("click", ev=>{
    const a = ev.target.closest(".ir-escenario");
    if(!a) return;
    ev.preventDefault();
    const k = a.getAttribute("data-tipo");
    if(TIPOS[k]){
      estado.tipo = k;
      if(TIPOS[k].duracionSugerida) estado.duracion = TIPOS[k].duracionSugerida;
      renderSelectores();
      renderGuion();
      irA("p-prepara");
    }
  });
})();

/* Pinta los trece criterios de evaluación, separados por grupo. */
(function renderCriterios(){
  const cont = $("#criterios-lista");
  if(!cont) return;
  cont.innerHTML = CRITERIOS.map((c,i)=>`
    <div class="criterio${c.g === "forma" ? " forma" : ""}">
      <h4>${String(i+1).padStart(2,"0")}. ${esc(c.n)}
        <span class="marca">${c.g === "contenido" ? "Qué dices" : "Cómo lo dices"}</span>
      </h4>
      <p>${esc(c.d)}</p>
    </div>`).join("");
})();

/* ============================================================
   CONFIGURACIÓN DEL SERVIDOR
   ------------------------------------------------------------
   Deja API_BASE en "" para que la herramienta funcione en modo
   local (historial solo en este navegador, sin cuentas).
   Cuando TI publique la API, pon aquí su URL — por ejemplo:
   const API_BASE = "https://api.unisabana.edu.co/estudio-pitch";
   ============================================================ */
function observacionesDisponibles(){ return hayBackend() && !!Cuenta.sesion; }

function refrescarReporte(){
  if(ultimoReporte){ generarReporte(ultimoReporte); }
}

function motivoSinObservaciones(){
  if(!Cuenta.sesion){
    return "Las observaciones las redacta la inteligencia artificial a partir de tu entrega, tu programa y tu historial. Necesitas una cuenta para usarlas.";
  }
  return "El servicio de IA no está disponible en modo demostración. Se activa cuando la Universidad publique el proyecto de Supabase con su Edge Function.";
}

async function pedirObservaciones(res){
  if(!observacionesDisponibles()){
    throw new Error("Necesitas una cuenta para usar las observaciones con IA.");
  }
  const ronda = construirRonda(res);
  const s = Cuenta.sesion;

  const previas = (estado.historial || []).slice(0, 5).map(h=>({
    fecha: h.creada_en,
    escenario: h.tipo_nombre || h.tipo,
    puntaje: h.puntaje,
    ppm: h.ppm,
    muletillas: h.muletillas_total,
    secciones: h.secciones_cubiertas + "/" + h.secciones_total,
    visual: (h.visual && h.visual.medida) ? {
      puntaje: h.visual.puntaje, encuadre: h.visual.encuadre,
      orientacion: h.visual.orientacion, postura: h.visual.postura
    } : null
  }));

  const r = await api("/observaciones", "POST", {
    ronda: ronda,
    persona: {
      nombre:   (s && s.nombre)   || "",
      facultad: (s && s.facultad) || "",
      programa: (s && s.programa) || ""
    },
    historial: previas,
    ronda_numero: (estado.historial ? estado.historial.length : 0) + 1
  });

  const d = normalizarObservaciones(r);
  if(!d){ throw new Error("El servicio de IA no devolvió contenido."); }
  return {
    datos: d,
    texto: observacionesSerializar(d),   // lo que se guarda en la ronda
    plano: observacionesAPlano(d),       // versión legible para el PDF
    html:  observacionesAHTML(d)
  };
}

/* ============================================================
   OBSERVACIONES — NORMALIZACIÓN Y PINTADO
   ------------------------------------------------------------
   La Edge Function devuelve un objeto por secciones:
     { resumen, fortalezas, aspectos_mejora, recomendaciones }
   Pero aquí no se da por hecho: esta capa también acepta el
   formato antiguo { texto } de prosa corrida, un JSON que venga
   como cadena dentro de «texto» (con o sin cercas ```json), y
   nombres de clave alternativos. Si nada encaja, muestra el
   texto tal cual en vez de romperse.
   ============================================================ */

/* Quita los restos de Markdown que el modelo suele dejar sueltos. */
function obsLimpiar(t){
  return String(t == null ? "" : t)
    .replace(/^\s*(?:[-*•–—]|\d+[.)])\s+/, "")   // viñeta o numeración inicial
    .replace(/^\s*#{1,6}\s*/gm, "")              // encabezados
    .replace(/`{1,3}/g, "")                      // comillas de código
    .replace(/[ \t]+/g, " ")
    .trim();
}

/* Escapa y convierte **negrita** en <strong>. Nada más se
   interpreta: el HTML que llegue del modelo queda neutralizado. */
function obsHTMLSeguro(t){
  return esc(obsLimpiar(t)).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*/g, "");
}

/* Acepta array, cadena con saltos de línea, o array de objetos. */
function obsLista(v){
  if(v == null) return [];
  let bruto;
  if(Array.isArray(v)){
    bruto = v.map(x=>{
      if(x && typeof x === "object"){
        return [x.titulo, x.texto, x.descripcion, x.detalle, x.valor]
          .filter(Boolean).join(" — ");
      }
      return x;
    });
  } else {
    bruto = String(v).split(/\r?\n+/);
  }
  /* Se descarta lo que no tenga ni una letra ni un número: restos de
     puntuación o líneas en blanco. Un elemento corto pero real («Sí»)
     debe conservarse. */
  return bruto.map(obsLimpiar).filter(t => /[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(t)).slice(0, 8);
}

/* ------------------------------------------------------------
   MARKDOWN → SECCIONES
   El modelo no siempre devuelve JSON: a veces escribe un informe
   en Markdown con encabezados. Antes se le quitaban las almohadillas
   y los títulos quedaban indistinguibles del cuerpo. Aquí se leen
   ANTES de limpiar, y se reparten en los mismos cuatro bloques.
   ------------------------------------------------------------ */
const OBS_SECCIONES = [
  {clave:"resumen",         re:/resumen|desempe|general|s[ií]ntesis|valoraci/i},
  {clave:"fortalezas",      re:/fortalez|lo que (sostuviste|funcion)|destac|puntos? fuertes?|logros/i},
  {clave:"aspectos",        re:/mejor|debilidad|aspectos?|oportunidad|ajust|corregir/i},
  {clave:"recomendaciones", re:/recomend|siguiente|pr[oó]xim|acci[oó]n|pasos|sugerenc/i}
];

/* Metadatos que el modelo repite y que el reporte ya muestra
   arriba: programa, facultad, número de práctica y puntaje. */
const OBS_METADATO = /^\s*(informe|reporte|an[aá]lisis)\b.*retroaliment|^\s*(programa|facultad|n[uú]mero de pr[aá]ctica|puntaje|escenario|fecha|estudiante|nombre)\s*:/i;

function obsEsEncabezado(linea){
  const t = linea.trim();
  if(!t) return null;
  /* ## Título  ·  **Título**  ·  Título:  ·  TÍTULO */
  let m = t.match(/^#{1,6}\s+(.{2,90})$/);
  if(m) return m[1].replace(/[:：]\s*$/, "").trim();
  m = t.match(/^\*\*(.{2,90}?)\*\*[:：]?\s*$/);
  if(m) return m[1].replace(/[:：]\s*$/, "").trim();
  /* Línea corta, sin punto final, que nombra una de las secciones. */
  if(t.length <= 90 && !/[.!?»]$/.test(t)){
    const limpio = t.replace(/^\*+|\*+$/g, "").replace(/[:：]\s*$/, "").trim();
    if(limpio.length >= 3 && OBS_SECCIONES.some(s => s.re.test(limpio)) && !/^\d/.test(limpio)){
      return limpio;
    }
  }
  return null;
}

function obsBucket(titulo){
  for(const s of OBS_SECCIONES){ if(s.re.test(titulo)) return s.clave; }
  return null;
}

/* Devuelve el objeto por secciones, o null si el texto no tiene
   una estructura reconocible (entonces se muestra como prosa). */
function obsDesdeMarkdown(texto){
  const lineas = String(texto || "").split(/\r?\n/);
  const cubos = {resumen:[], fortalezas:[], aspectos:[], recomendaciones:[]};
  let actual = null, huerfanas = [], reconocidas = 0;

  for(const cruda of lineas){
    const linea = cruda.replace(/\s+$/, "");
    /* La línea en blanco no se descarta: separa un elemento del
       siguiente cuando el modelo escribe la lista sin viñetas. */
    if(!linea.trim()){
      const destino = actual ? cubos[actual] : huerfanas;
      if(destino.length && destino[destino.length-1] !== "") destino.push("");
      continue;
    }
    if(/^\s*([-*_=·—–])\1{2,}\s*$/.test(linea) || /^\s*-{3,}\s*$/.test(linea)) continue;  // regla horizontal

    const titulo = obsEsEncabezado(linea);
    if(titulo){
      const b = obsBucket(titulo);
      if(b){ actual = b; reconocidas++; continue; }
      /* Encabezado que no es de los nuestros: se ignora el rótulo
         pero se sigue escribiendo donde íbamos. */
      if(!OBS_METADATO.test(titulo)) { actual = actual || null; }
      continue;
    }
    if(OBS_METADATO.test(linea)) continue;
    (actual ? cubos[actual] : huerfanas).push(linea.trim());
  }

  if(reconocidas < 2) return null;   // no hay estructura suficiente

  /* Lo que venía antes del primer encabezado sirve de resumen si
     no hubo uno explícito. */
  if(!cubos.resumen.length && huerfanas.length){ cubos.resumen = huerfanas; }

  const aItems = lineas => {
    const out = [];
    let corte = true;   // la siguiente línea abre elemento nuevo
    lineas.forEach(l=>{
      if(l === ""){ corte = true; return; }
      /* Abre elemento nuevo si trae viñeta o número, o si venía de
         una línea en blanco. Si no, continúa el elemento anterior. */
      const previa = out.length ? out[out.length-1] : "";
      /* Si la línea anterior ya cerró con punto, esta es un elemento
         nuevo; si quedó abierta, es la misma frase que sigue. */
      const cerrada = /[.!?…»]\s*$/.test(previa);
      if(corte || cerrada || /^\s*(?:[-*•–—]|\d+[.)])\s+/.test(l) || !out.length){ out.push(l); }
      else { out[out.length-1] += " " + l; }
      corte = false;
    });
    return out.map(obsLimpiar).filter(t => /[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(t)).slice(0, 8);
  };

  const d = {
    estructurado: true,
    resumen: cubos.resumen.filter(l => l !== "").map(obsLimpiar).filter(Boolean).join("\n\n"),
    fortalezas: aItems(cubos.fortalezas),
    aspectos: aItems(cubos.aspectos),
    recomendaciones: aItems(cubos.recomendaciones)
  };
  if(!d.resumen && !d.fortalezas.length && !d.aspectos.length && !d.recomendaciones.length) return null;
  return d;
}

/* ¿La respuesta llegó cortada? El modelo se queda sin espacio y
   termina a media frase. Vale más avisarlo que fingir que está
   completa. */
/* Palabras que no pueden cerrar una frase: si el texto termina en
   una de ellas, el modelo se quedó a media idea. */
const OBS_CONECTORES = new Set(("y e o u de del al a en con por para que se su sus la el los las un una " +
  "unos unas lo como sin sobre entre desde hasta pero cuando donde aunque además luego si es son ni " +
  "tras ante bajo durante mediante según hacia porque mientras tanto cada").split(" "));

function obsCortado(t){
  const s = String(t || "").trim();
  if(s.length < 12) return false;
  if(/[.!?…»"')\]]\s*$/.test(s)) return false;
  if(/[,;:]\s*$/.test(s)) return true;
  const ultima = (s.match(/[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$/) || [""])[0].toLowerCase();
  if(OBS_CONECTORES.has(ultima)) return true;
  /* Un texto largo que ni siquiera cierra con punto casi siempre
     es un corte, no un estilo. */
  return s.length >= 120;
}

/* Intenta sacar un objeto JSON de una cadena, aunque venga
   envuelto en cercas de código o con texto alrededor. */
function obsJSONDeCadena(t){
  const s = String(t || "").trim();
  if(!s || (s.indexOf("{") < 0)) return null;
  const sinCercas = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const candidatos = [sinCercas];
  const a = sinCercas.indexOf("{"), b = sinCercas.lastIndexOf("}");
  if(a >= 0 && b > a){ candidatos.push(sinCercas.slice(a, b+1)); }
  for(const c of candidatos){
    try{
      const o = JSON.parse(c);
      if(o && typeof o === "object" && !Array.isArray(o)) return o;
    }catch(_){}
  }
  return null;
}

function normalizarObservaciones(r){
  if(!r) return null;

  /* Si llega una cadena suelta, se trata igual que { texto } */
  let o = (typeof r === "string") ? {texto: r} : r;

  const primeraClave = (obj, claves) => {
    for(const k of claves){
      if(obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return null;
  };

  const CLAVES_RESUMEN = ["resumen","resumen_general","resumenGeneral","summary","general"];
  const CLAVES_FORT    = ["fortalezas","fortalezas_principales","fortalezasPrincipales","strengths"];
  const CLAVES_MEJ     = ["aspectos_mejora","aspectos_a_mejorar","aspectosMejora","aspectos_por_mejorar","mejoras","debilidades","improvements"];
  const CLAVES_REC     = ["recomendaciones","recomendaciones_siguiente_practica","recomendacionesSiguientePractica","siguientes_pasos","recommendations"];

  const tieneSecciones = obj =>
    !!(primeraClave(obj, CLAVES_RESUMEN) || primeraClave(obj, CLAVES_FORT) ||
       primeraClave(obj, CLAVES_MEJ)     || primeraClave(obj, CLAVES_REC));

  /* Formato antiguo, o formato nuevo escondido dentro de «texto». */
  if(!tieneSecciones(o) && typeof o.texto === "string"){
    const cortado = obsCortado(o.texto);
    const dentro = obsJSONDeCadena(o.texto);
    if(dentro && tieneSecciones(dentro)){
      o = dentro;
    } else {
      /* Informe en Markdown: se reparte en los mismos cuatro bloques
         leyendo los encabezados antes de limpiarlos. */
      const porSecciones = obsDesdeMarkdown(o.texto);
      if(porSecciones){ porSecciones.cortado = cortado; return porSecciones; }

      const parrafos = String(o.texto)
        .split(/\n{2,}/)
        .map(p => obsLimpiar(p.replace(/\n/g, " ")))
        .filter(p => /[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(p));
      if(!parrafos.length) return null;
      return {estructurado:false, parrafos, cortado};
    }
  }

  if(!tieneSecciones(o)) return null;

  const d = {
    estructurado: true,
    resumen: obsLimpiar(primeraClave(o, CLAVES_RESUMEN) || ""),
    fortalezas: obsLista(primeraClave(o, CLAVES_FORT)),
    aspectos:   obsLista(primeraClave(o, CLAVES_MEJ)),
    recomendaciones: obsLista(primeraClave(o, CLAVES_REC))
  };
  if(!d.resumen && !d.fortalezas.length && !d.aspectos.length && !d.recomendaciones.length){
    return null;
  }
  /* También el JSON puede llegar a medias: la última frase de la
     última lista se corta cuando el modelo se queda sin espacio. */
  const ultimo = (d.recomendaciones.length ? d.recomendaciones
                : d.aspectos.length ? d.aspectos
                : d.fortalezas.length ? d.fortalezas : [d.resumen]).slice(-1)[0];
  d.cortado = obsCortado(ultimo) || obsCortado(d.resumen);
  return d;
}

/* Los cuatro bloques del reporte. Se omite el que venga vacío:
   más vale un reporte de tres bloques que un titular huérfano. */
function observacionesAHTML(d){
  if(!d) return "";
  if(!d.estructurado){
    return '<div class="obs-cuerpo">' +
      d.parrafos.map(p => "<p>" + obsHTMLSeguro(p) + "</p>").join("") + "</div>" +
      obsAvisoCortado(d);
  }

  const bloqueLista = (titulo, items, clase, marca) => {
    if(!items || !items.length) return "";
    return `
      <div class="obs-bloque">
        <span class="etiqueta">${esc(titulo)}</span>
        <div class="obs-lista ${clase}">
          ${items.map((t,i)=>`
            <div class="obs-punto">
              <span class="marca" aria-hidden="true">${marca(i)}</span>
              <div>${obsHTMLSeguro(t)}</div>
            </div>`).join("")}
        </div>
      </div>`;
  };

  let html = "";
  if(d.resumen){
    html += `
      <div class="obs-bloque">
        <span class="etiqueta">Resumen general del desempeño</span>
        <div class="obs-resumen">${
          d.resumen.split(/\n{2,}/).map(p=>"<p>"+obsHTMLSeguro(p)+"</p>").join("")
        }</div>
      </div>`;
  }
  html += bloqueLista("Fortalezas principales", d.fortalezas, "fortalezas", ()=>"✓");
  html += bloqueLista("Aspectos por mejorar", d.aspectos, "mejoras", ()=>"→");
  html += bloqueLista("Recomendaciones para la siguiente práctica", d.recomendaciones,
                      "recomendaciones", i => String(i+1).padStart(2,"0"));
  return html + obsAvisoCortado(d);
}

/* Aviso cuando la respuesta llegó a medias. Es mejor decirlo que
   dejar una frase colgando: quien lee no tiene por qué adivinar
   que faltó texto. */
function obsAvisoCortado(d){
  if(!d || !d.cortado) return "";
  return '<div class="obs-truncado">' +
    "<strong>La respuesta llegó incompleta.</strong>" +
    "El servicio de IA se quedó sin espacio y cortó el texto antes de terminar. " +
    "Presiona «Volver a generar» para pedirlo de nuevo. Si vuelve a pasar, avísale al CDP: " +
    "hay que subir el límite de salida en la función del servidor." +
    "</div>";
}

/* Texto llano, para el PDF y para el panel del CDP. */
function observacionesAPlano(d){
  if(!d) return "";
  if(!d.estructurado) return d.parrafos.join("\n\n");
  const bloque = (t, items) => items && items.length
    ? t + "\n" + items.map((x,i)=>"  " + (i+1) + ". " + x).join("\n")
    : "";
  return [
    d.resumen ? "Resumen general del desempeño\n" + d.resumen : "",
    bloque("Fortalezas principales", d.fortalezas),
    bloque("Aspectos por mejorar", d.aspectos),
    bloque("Recomendaciones para la siguiente práctica", d.recomendaciones)
  ].filter(Boolean).join("\n\n");
}

/* Lo que se guarda en la columna «observaciones» de la ronda.
   Se conserva la estructura para que al reabrir el historial el
   reporte vuelva a verse por secciones y no como un párrafo. */
function observacionesSerializar(d){
  if(!d) return "";
  if(!d.estructurado) return d.parrafos.join("\n\n");
  try{
    return JSON.stringify({
      resumen: d.resumen,
      fortalezas: d.fortalezas,
      aspectos_mejora: d.aspectos,
      recomendaciones: d.recomendaciones
    });
  }catch(_){
    return observacionesAPlano(d);
  }
}

/* Pinta lo que estaba guardado en una ronda, venga del formato
   nuevo o del antiguo. Devuelve HTML listo para insertar. */
function observacionesGuardadasAHTML(guardado){
  const d = normalizarObservaciones(guardado);
  if(!d) return "";
  return observacionesAHTML(d);
}

/* ============================================================
   GENERADOR DE PDF
   ------------------------------------------------------------
   Escritor mínimo de PDF 1.4 con las fuentes base Helvetica.
   Sin librerías externas: el archivo sigue siendo autocontenido
   y funciona sin conexión. Codifica en WinAnsi (cp1252), que
   cubre todos los acentos y signos del español.
   ============================================================ */
const CP1252 = {
  "€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,
  "‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,
  "˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159
};
function aLatin1(txt){
  const out = [];
  for(const ch of String(txt)){
    const c = ch.codePointAt(0);
    /* Los valores 0x80–0x9F que llegan aquí ya son bytes cp1252
       producidos por esta misma función (el contenido del PDF se
       arma en dos pasos), así que se dejan pasar tal cual. */
    if(c <= 0xFF){ out.push(c); }
    else if(CP1252[ch] !== undefined){ out.push(CP1252[ch]); }
    else if(ch === "\u2212"){ out.push(0x2D); }      // signo menos → guion
    else if(ch === "✓"){ out.push(0x2B); }          // +
    else if(ch === "◆" || ch === "·"){ out.push(0xB7); }
    else if(ch === "→"){ out.push(0x3E); }          // >
    else { out.push(0x3F); }                        // ?
  }
  return out;
}

/* Anchos de Helvetica en milésimas de em (rango imprimible). */
const ANCHOS_HELV = {32:278,33:278,34:355,35:556,36:556,37:889,38:667,39:191,40:333,41:333,
42:389,43:584,44:278,45:333,46:278,47:278,48:556,49:556,50:556,51:556,52:556,53:556,54:556,
55:556,56:556,57:556,58:278,59:278,60:584,61:584,62:584,63:556,64:1015,65:667,66:667,67:722,
68:722,69:667,70:611,71:778,72:722,73:278,74:500,75:667,76:556,77:833,78:722,79:778,80:667,
81:778,82:722,83:667,84:611,85:722,86:667,87:944,88:667,89:667,90:611,91:278,92:278,93:278,
94:469,95:556,96:333,97:556,98:556,99:500,100:556,101:556,102:278,103:556,104:556,105:222,
106:222,107:500,108:222,109:833,110:556,111:556,112:556,113:556,114:333,115:500,116:278,
117:556,118:500,119:722,120:500,121:500,122:500,123:334,124:260,125:334,126:584};
/* Acentuadas y signos: mismo ancho que su letra base. */
const BASE_ACENTO = {225:97,233:101,237:105,243:111,250:117,241:110,252:117,
193:65,201:69,205:73,211:79,218:85,209:78,220:85,191:556,161:278,171:556,187:556,
176:400,183:278,151:1000,150:556,146:191,145:191,147:333,148:333,133:1000};
function anchoChar(codigo, negrita){
  let a = ANCHOS_HELV[codigo];
  if(a === undefined){
    const b = BASE_ACENTO[codigo];
    a = (b === undefined) ? 556 : (b > 300 && ANCHOS_HELV[b] === undefined ? b : (ANCHOS_HELV[b] || 556));
  }
  return negrita ? a * 1.08 : a;
}
function anchoTexto(txt, tam, negrita){
  let t = 0;
  aLatin1(txt).forEach(c => { t += anchoChar(c, negrita); });
  return t * tam / 1000;
}
function partirLineas(txt, tam, negrita, ancho){
  const parrafos = String(txt).split("\n");
  const lineas = [];
  parrafos.forEach(p=>{
    if(!p.trim()){ lineas.push(""); return; }
    let actual = "";
    p.split(/\s+/).forEach(palabra=>{
      const prueba = actual ? actual + " " + palabra : palabra;
      if(anchoTexto(prueba, tam, negrita) > ancho && actual){ lineas.push(actual); actual = palabra; }
      else { actual = prueba; }
    });
    if(actual){ lineas.push(actual); }
  });
  return lineas;
}
function escapaPDF(bytes){
  const out = [];
  bytes.forEach(b=>{
    if(b === 0x28 || b === 0x29 || b === 0x5C){ out.push(0x5C); }
    out.push(b);
  });
  return out;
}

function crearPDF(){
  const ANCHO = 595.28, ALTO = 841.89;        // A4 en puntos
  const MI = 56, MD = 56, MS = 64, MB = 56;   // márgenes
  const util = ANCHO - MI - MD;
  const paginas = [];
  let actual = [], y = ALTO - MS;

  function nuevaPagina(){
    if(actual.length){ paginas.push(actual); }
    actual = []; y = ALTO - MS;
  }
  function sitio(alto){ if(y - alto < MB){ nuevaPagina(); } }
  function op(s){ actual.push(s); }

  return {
    espacio(h){ sitio(h); y -= h; },
    regla(color){
      sitio(14); y -= 8;
      const c = color || [0.85,0.89,0.93];
      op(`${c[0]} ${c[1]} ${c[2]} RG 0.8 w ${MI} ${y.toFixed(2)} m ${(ANCHO-MD).toFixed(2)} ${y.toFixed(2)} l S`);
      y -= 6;
    },
    barra(pct, color){
      sitio(16); y -= 10;
      const largo = util * Math.max(0, Math.min(100, pct)) / 100;
      op(`0.93 0.95 0.97 rg ${MI} ${y.toFixed(2)} ${util.toFixed(2)} 4 re f`);
      op(`${color[0]} ${color[1]} ${color[2]} rg ${MI} ${y.toFixed(2)} ${largo.toFixed(2)} 4 re f`);
      y -= 6;
    },
    texto(txt, opciones){
      const o = opciones || {};
      const tam = o.tam || 10.5;
      const negrita = !!o.negrita;
      const color = o.color || [0.16,0.20,0.28];
      const interlinea = o.interlinea || tam * 1.42;
      const sangria = o.sangria || 0;
      const lineas = partirLineas(txt, tam, negrita, util - sangria);
      lineas.forEach(l=>{
        sitio(interlinea);
        y -= interlinea;
        if(!l) return;
        const b = escapaPDF(aLatin1(l)).map(c=>String.fromCharCode(c)).join("");
        op(`BT ${color[0]} ${color[1]} ${color[2]} rg /${negrita ? "F2" : "F1"} ${tam} Tf ` +
           `1 0 0 1 ${(MI + sangria).toFixed(2)} ${y.toFixed(2)} Tm (${b}) Tj ET`);
      });
    },
    /* Etiqueta a la izquierda y valor alineado a la derecha, en la misma línea. */
    fila(izq, der, opciones){
      const o = opciones || {};
      const tam = o.tam || 11;
      const interlinea = tam * 1.5;
      sitio(interlinea); y -= interlinea;
      const ci = o.colorIzq || [0.04,0.07,0.19];
      const cd = o.colorDer || [0.04,0.07,0.19];
      const bi = escapaPDF(aLatin1(izq)).map(c=>String.fromCharCode(c)).join("");
      const bd = escapaPDF(aLatin1(der)).map(c=>String.fromCharCode(c)).join("");
      op(`BT ${ci[0]} ${ci[1]} ${ci[2]} rg /F2 ${tam} Tf 1 0 0 1 ${MI} ${y.toFixed(2)} Tm (${bi}) Tj ET`);
      const w = anchoTexto(der, tam, true);
      op(`BT ${cd[0]} ${cd[1]} ${cd[2]} rg /F2 ${tam} Tf 1 0 0 1 ${(ANCHO-MD-w).toFixed(2)} ${y.toFixed(2)} Tm (${bd}) Tj ET`);
    },
    bandaSuperior(titulo, subtitulo){
      op(`0 0.078 0.349 rg 0 ${(ALTO-92).toFixed(2)} ${ANCHO} 92 re f`);
      const t = escapaPDF(aLatin1(titulo)).map(c=>String.fromCharCode(c)).join("");
      const st = escapaPDF(aLatin1(subtitulo)).map(c=>String.fromCharCode(c)).join("");
      op(`BT 1 1 1 rg /F2 17 Tf 1 0 0 1 ${MI} ${(ALTO-52).toFixed(2)} Tm (${t}) Tj ET`);
      op(`BT 0.72 0.79 0.90 rg /F1 9.5 Tf 1 0 0 1 ${MI} ${(ALTO-72).toFixed(2)} Tm (${st}) Tj ET`);
      y = ALTO - 122;
    },
    terminar(){
      nuevaPagina();
      const objetos = [];
      const n = paginas.length;
      const idPagina = i => 5 + i*2;
      const idFlujo  = i => 6 + i*2;

      objetos[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
      objetos[2] = `<< /Type /Pages /Kids [${paginas.map((_,i)=>`${idPagina(i)} 0 R`).join(" ")}] /Count ${n} >>`;
      objetos[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
      objetos[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

      const flujos = [];
      paginas.forEach((ops,i)=>{
        const contenido = ops.join("\n");
        objetos[idPagina(i)] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idFlujo(i)} 0 R >>`;
        flujos[idFlujo(i)] = contenido;
      });

      /* Ensamblado con desplazamientos exactos */
      let bytes = [];
      const empuja = txt => { aLatin1(txt).forEach(b=>bytes.push(b)); };
      empuja("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
      const total = 4 + n*2;
      const offsets = new Array(total+1).fill(0);

      for(let id=1; id<=total; id++){
        offsets[id] = bytes.length;
        if(flujos[id] !== undefined){
          const cuerpo = aLatin1(flujos[id]);
          empuja(`${id} 0 obj\n<< /Length ${cuerpo.length} >>\nstream\n`);
          cuerpo.forEach(b=>bytes.push(b));
          empuja("\nendstream\nendobj\n");
        } else {
          empuja(`${id} 0 obj\n${objetos[id]}\nendobj\n`);
        }
      }
      const inicioXref = bytes.length;
      empuja(`xref\n0 ${total+1}\n0000000000 65535 f \n`);
      for(let id=1; id<=total; id++){
        empuja(String(offsets[id]).padStart(10,"0") + " 00000 n \n");
      }
      empuja(`trailer\n<< /Size ${total+1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);
      return new Blob([new Uint8Array(bytes)], {type:"application/pdf"});
    }
  };
}

const COLOR_NIVEL = {bien:[0.08,0.54,0.37], ajusta:[0.71,0.45,0.12], revisa:[0.64,0.15,0.18]};

function descargarReportePDF(res, ej){
  const t = TIPOS[estado.tipo];
  const s = Cuenta.sesion;
  const d = new Date();
  const p = x => String(x).padStart(2,"0");
  const doc = crearPDF();

  doc.bandaSuperior("Estudio de Pitch",
    "Centro de Desarrollo Profesional  " + String.fromCharCode(183) + "  Alumni Sabana  " +
    String.fromCharCode(183) + "  Universidad de La Sabana");

  doc.texto(t.nombre, {tam:16, negrita:true, color:[0.04,0.07,0.19]});
  doc.texto(
    p(d.getDate()) + "/" + p(d.getMonth()+1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes()) +
    "   " + String.fromCharCode(183) + "   formato " + mmss(estado.duracion) +
    "   " + String.fromCharCode(183) + "   " + (estado.modo === "mic" ? "con micrófono" : "sin micrófono") +
    (s ? "   " + String.fromCharCode(183) + "   " + s.correo : ""),
    {tam:9.5, color:[0.53,0.58,0.64]});
  if(s && (s.facultad || s.programa)){
    doc.texto([s.nombre, s.facultad, s.programa].filter(Boolean).join("   " + String.fromCharCode(183) + "   "),
      {tam:9.5, color:[0.53,0.58,0.64]});
  }

  doc.espacio(16);
  doc.fila("Puntaje general", res.puntaje + " / 100  " + etiquetaNivel(res.puntaje).toUpperCase(),
    {tam:13, colorDer: COLOR_NIVEL[nivel(res.puntaje)]});
  doc.barra(res.puntaje, COLOR_NIVEL[nivel(res.puntaje)]);
  doc.espacio(6);
  doc.texto("Duración " + mmss(res.segundos) + " de " + mmss(estado.duracion) +
            "    " + res.meta.ppm + " palabras por minuto    " + res.meta.nPal + " palabras    " +
            res.meta.muletillas.total + " muletillas    " +
            res.meta.cubiertas + "/" + res.meta.totalSecciones + " secciones",
            {tam:10, color:[0.29,0.34,0.44]});

  doc.espacio(14);
  doc.regla();
  doc.texto("Dimensiones medidas", {tam:13, negrita:true, color:[0.04,0.07,0.19]});
  doc.espacio(4);

  res.dims.forEach(dim=>{
    doc.espacio(8);
    const etiqueta = dim.pct == null ? "Sin medición" : (dim.val + "   " + etiquetaNivel(dim.pct).toUpperCase());
    doc.fila(dim.n, etiqueta, {tam:11.5,
      colorDer: dim.pct == null ? [0.53,0.58,0.64] : COLOR_NIVEL[nivel(dim.pct)]});
    doc.texto(dim.txt, {tam:10.5, color:[0.29,0.34,0.44]});
    doc.texto(dim.dato, {tam:9.5, color:[0.53,0.58,0.64]});
    if(dim.pct != null){ doc.barra(dim.pct, COLOR_NIVEL[nivel(dim.pct)]); }
    doc.espacio(4);
  });

  doc.espacio(10);
  doc.regla();
  doc.texto("Ejercicio para la siguiente ronda", {tam:13, negrita:true, color:[0.04,0.07,0.19]});
  doc.espacio(4);
  doc.texto(ej.titulo, {tam:11.5, negrita:true, color:[0.04,0.07,0.19]});
  doc.texto(ej.texto, {tam:10.5, color:[0.29,0.34,0.44]});
  doc.espacio(4);
  ej.pasos.forEach((paso,i)=>{
    doc.texto((i+1) + ".  " + paso.replace(/<[^>]+>/g,""), {tam:10.5, color:[0.29,0.34,0.44], sangria:10});
  });

  /* El PDF recibe la versión llana. Si por lo que sea solo hay el
     valor guardado (JSON del formato nuevo), se normaliza aquí para
     no imprimir llaves ni corchetes en el reporte. */
  const obsPDF = res.observacionesPlano ||
    (res.observacionesTexto ? observacionesAPlano(normalizarObservaciones({texto: res.observacionesTexto})) : "");
  if(obsPDF){
    doc.espacio(12);
    doc.regla();
    doc.texto("Observaciones", {tam:13, negrita:true, color:[0.04,0.07,0.19]});
    doc.espacio(4);
    obsPDF.split(/\n{2,}/).forEach(par=>{
      par.split(/\n/).forEach(linea=>{
        doc.texto(linea.replace(/\*\*(.+?)\*\*/g, "$1"), {tam:10.5, color:[0.29,0.34,0.44]});
      });
      doc.espacio(4);
    });
  }

  doc.espacio(12);
  doc.regla();
  doc.texto("Lo que dijiste", {tam:13, negrita:true, color:[0.04,0.07,0.19]});
  doc.espacio(4);
  doc.texto(res.texto || "Sin transcripción.", {tam:10.5, color:[0.29,0.34,0.44]});

  doc.espacio(18);
  doc.regla();
  doc.texto("Este reporte se calculó en tu navegador a partir de señales medibles de tu entrega. " +
    "No evalúa la calidad de tus argumentos ni sustituye una asesoría personalizada del Centro de Desarrollo Profesional. " +
    "La grabación de audio nunca se almacena.",
    {tam:8.5, color:[0.53,0.58,0.64]});

  const url = URL.createObjectURL(doc.terminar());
  const a = document.createElement("a");
  a.href = url; a.download = nombreArchivo().replace(/\.txt$/, ".pdf");
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

/* ============================================================
   EXPORTACIÓN A EXCEL (.xlsx)
   ============================================================ */
/* El escritor de .xlsx vive ahora en auth.js, compartido con el
   portafolio. Aquí solo queda quién arma las filas. */

const COL_DIM = ["duracion","ritmo","fluidez","estructura","concrecion","cierre","visual"];
function exportarExcel(lista, archivo){
  const s = Cuenta.sesion;
  lista = lista || estado.historial;
  const cab = [
    "Correo","Nombre","Facultad","Programa","Fecha","Escenario","Modo",
    "Objetivo (s)","Duración real (s)","Puntaje","Palabras","Palabras por minuto",
    "Muletillas","Secciones cubiertas","Secciones totales",
    "Duración %","Ritmo %","Fluidez %","Estructura %","Concreción %","Cierre %","Presencia visual %",
    "Encuadre","Orientación a cámara %","Postura","Movimiento corporal","Gestualidad",
    "Muletillas frecuentes","Ejercicio sugerido","Transcripción"
  ];
  const filas = [cab];
  lista.slice().reverse().forEach(h=>{
    const dm = {};
    (h.dimensiones || []).forEach(d=>{ dm[d.id] = (d.pct == null ? "" : d.pct); });
    const vs = (h.visual && h.visual.medida) ? h.visual : {};
    filas.push([
      h.correo   || (s ? s.correo : "sin cuenta"),
      h.nombre   || (s ? (s.nombre || "") : ""),
      h.facultad || (s ? (s.facultad || "") : ""),
      h.programa || (s ? (s.programa || "") : ""),
      String(h.creada_en || "").replace("T"," ").slice(0,16),
      h.tipo_nombre || h.tipo || "",
      (h.modo === "manual" ? "sin micrófono" : "con micrófono") +
        ((h.visual && h.visual.medida) ? " + cámara" : ""),
      Number(h.duracion_objetivo)||0, Number(h.duracion_real)||0, Number(h.puntaje)||0,
      Number(h.palabras)||0, Number(h.ppm)||0, Number(h.muletillas_total)||0,
      Number(h.secciones_cubiertas)||0, Number(h.secciones_total)||0
    ].concat(COL_DIM.map(k=> dm[k] === "" || dm[k] == null ? "" : Number(dm[k])), [
      vs.encuadre == null ? "" : Number(vs.encuadre),
      vs.orientacion == null ? "" : Number(vs.orientacion),
      vs.postura == null ? "" : Number(vs.postura),
      vs.movimiento || "",
      vs.gestualidad || "",
      (h.muletillas_top || []).map(m=> m.palabra + " (" + m.veces + ")").join(", "),
      h.ejercicio ? h.ejercicio.titulo : "",
      h.transcripcion || ""
    ]));
  });

  const blob = construirXLSX(filas, "Rondas");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo || ("estudio-de-pitch-" + (s ? s.correo.split("@")[0] : "local") + ".xlsx");
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
}

/* ============================================================
   PANEL DE ADMINISTRACIÓN
   ------------------------------------------------------------
   Solo visible con rol "admin". El servidor debe verificar el
   rol; ocultar el panel en el cliente es comodidad, no seguridad.
   ============================================================ */
let adminDatos = [], adminUsuarios = [], adminCuentas = 0;

/* Último reporte en pantalla. Se guarda para poder redibujarlo cuando
   cambia la sesión: si practicas sin cuenta y luego entras, el bloque
   de observaciones debe enterarse. */
let ultimoReporte = null;

/* Motivo por el que la lista de personas quedó incompleta, si pasó. */
let adminFalloPerfiles = "";
/* true cuando hubo que leer de «perfiles» porque falta la vista. */
let adminFaltaVista = false;
/* Rondas descartadas por pertenecer a alguien sin actividad de acceso. */
let adminRondasOcultas = 0;

async function cargarAdmin(){
  const panel = $("#admin-panel");
  if(!panel) return;
  if(!Cuenta.esAdmin()){ panel.hidden = true; return; }
  panel.hidden = false;
  adminFalloPerfiles = "";
  adminFaltaVista = false;
  adminRondasOcultas = 0;
  /* Al recargar el consolidado se vuelve al nivel de facultades: si
     no, se quedaría abierto un programa de la carga anterior. */
  progFacultad = ""; progPrograma = "";
  $("#admin-sub").textContent = "Cargando consolidado…";
  try{
    const r = await api("/admin/rondas", "GET");
    adminDatos = (r && r.rondas) ? r.rondas : [];

    /* Las dos consultas son independientes: «rondas_admin» trae la
       actividad y «perfiles» trae a TODAS las personas registradas,
       incluidas las que aún no han practicado. Si la segunda falla,
       antes se perdía en silencio y la lista salía incompleta sin
       que nadie se enterara. Ahora se dice en pantalla. */
    try{
      const u = await api("/admin/usuarios", "GET");
      adminUsuarios = (u && u.usuarios) ? u.usuarios : [];
      adminFaltaVista = !!(u && u.faltaVista);

      /* Las cuentas de administración no son personas atendidas: son
         las de quien mira el tablero. Contarlas inflaba el número de
         personas y metía a la propia dirección del Centro en la lista
         del servicio que dirige. Se quitan aquí, una sola vez, y así
         desaparecen a la vez de la tabla, de los indicadores, del
         desglose por programa y del Excel, que todos leen de estas
         dos listas. */
      adminCuentas = adminUsuarios.filter(x => x.rol === "admin").length;
      const correosAdmin = new Set(
        adminUsuarios.filter(x => x.rol === "admin")
                     .map(x => String(x.correo || "").toLowerCase()));
      adminUsuarios = adminUsuarios.filter(x => x.rol !== "admin");
      if(correosAdmin.size){
        adminDatos = adminDatos.filter(x => !correosAdmin.has(String(x.correo || "").toLowerCase()));
      }

      /* Las rondas se filtran con la misma lista. Sin esto, una ronda
         de alguien excluido lo devolvería a la tabla de personas —
         pintarPersonas() añade a quien aparece en las rondas— y
         seguiría contando en los KPIs, en «Por programa» y en el
         Excel, que todos leen adminDatos. */
      const permitidos = new Set(adminUsuarios.map(x => String(x.correo || "").toLowerCase()));
      if(permitidos.size){
        const antes = adminDatos.length;
        adminDatos = adminDatos.filter(x => permitidos.has(String(x.correo || "").toLowerCase()));
        adminRondasOcultas = antes - adminDatos.length;
      }
    }catch(err){
      adminUsuarios = [];
      adminFalloPerfiles = err.message || "error desconocido";
    }
    pintarAdmin();
  }catch(err){
    $("#admin-sub").textContent = "No se pudo cargar el consolidado: " + err.message;
    $("#admin-aviso").innerHTML = '<strong>Qué revisar:</strong> vuelve a correr <code>supabase-instalacion.sql</code> completo en el editor SQL de Supabase. ' +
      "Ese script crea la vista <code>rondas_admin</code> y las políticas que dejan al administrador leer las rondas de todas las personas.";
    $("#admin-cuerpo").innerHTML = "";
    $("#admin-personas").innerHTML = "";
    $("#admin-kpis").innerHTML = "";
  }
}

/* ── Filtro por semáforo ──────────────────────────────────────
   Deja ver de golpe a quién le está costando. Actúa sobre las dos
   listas de personas: la pestaña «Personas» y el último nivel del
   recorrido por programa.

   NO toca los indicadores ni la rosca. Un consolidado que cambiara
   sus totales al filtrar dejaría de ser un consolidado, y la
   pregunta «cuántas personas usan esto» no se responde con un
   subconjunto.

   Sin nada marcado se ve todo, que es lo que se espera al abrir. */
let semFiltro = new Set();

function semPasa(puntaje){
  if(!semFiltro.size) return true;
  return semFiltro.has(semaforoNivel(puntaje));
}

/* La clasificación de una persona es su promedio, no su última
   ronda: una mala tarde no la vuelve prioridad, ni una buena la
   saca de serlo. */
function semDePersona(p){
  if(!p) return null;
  if(p.promedio != null) return p.promedio;
  if(p.rondas && p.suma != null) return p.rondas ? Math.round(p.suma / p.rondas) : null;
  return null;
}

function semCuenta(visibles, total){
  const c = $("#sem-cuenta");
  if(!c) return;
  c.textContent = semFiltro.size
    ? "Mostrando " + visibles + " de " + total + (total === 1 ? " persona" : " personas")
    : "";
}

function montarFiltroSemaforo(){
  $$("#sem-filtro [data-sem]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const k = b.dataset.sem;
      if(semFiltro.has(k)) semFiltro.delete(k); else semFiltro.add(k);
      b.setAttribute("aria-pressed", semFiltro.has(k) ? "true" : "false");
      pintarPersonas();
      if($("#at-programas").getAttribute("aria-selected") === "true") pintarPorPrograma();
    });
  });
}

/* ---------- Lista de personas ---------- */
function pintarPersonas(){
  const porCorreo = {};
  adminUsuarios.forEach(u=>{
    porCorreo[u.correo] = {correo:u.correo, nombre:u.nombre || "", facultad:u.facultad || "",
                           programa:u.programa || "", rol:u.rol || "usuario", rondas:[]};
  });
  adminDatos.forEach(r=>{
    if(!porCorreo[r.correo]){
      porCorreo[r.correo] = {correo:r.correo, nombre:r.nombre || "", facultad:r.facultad || "",
                             programa:r.programa || "", rol:"usuario", rondas:[]};
    }
    porCorreo[r.correo].rondas.push(r);
  });

  const lista = Object.keys(porCorreo).map(c=>{
    const p = porCorreo[c];
    p.rondas.sort((a,b)=> String(b.creada_en).localeCompare(String(a.creada_en)));
    const n = p.rondas.length;
    p.total = n;
    p.ultimo = n ? p.rondas[0].puntaje : null;
    p.promedio = n ? Math.round(p.rondas.reduce((a,x)=>a+(Number(x.puntaje)||0),0)/n) : null;
    return p;
  }).sort((a,b)=> b.total - a.total || String(a.correo).localeCompare(String(b.correo)));

  adminPersonas = lista;

  /* Se filtra al pintar, no al armar: adminPersonas tiene que seguir
     completa porque el detalle de una persona se abre por su
     posición en ella. */
  const visibles = lista.map((p,i)=>({p:p, i:i})).filter(x=> semPasa(semDePersona(x.p)));
  semCuenta(visibles.length, lista.length);

  $("#admin-personas").innerHTML = visibles.length
    ? visibles.map(({p,i})=>`
        <tr class="clicable" data-persona="${i}">
          <td>${esc(p.nombre || p.correo)}${p.rol === "admin" ? ' <span class="insignia-admin">Admin</span>' : ""}
              <div style="font-size:12px;color:var(--texto-3)">${esc(p.correo)}</div></td>
          <td>${esc(p.facultad || "—")}</td>
          <td>${esc(p.programa || "—")}</td>
          <td class="num">${p.total}</td>
          <td class="num">${semaforo(p.ultimo)}</td>
          <td class="num">${semaforo(p.promedio)}</td>
          <td><button class="btn-mini" data-ver="${i}">Ver</button></td>
        </tr>`).join("")
    : ('<tr><td colspan="7" style="color:var(--texto-3)">' +
        (lista.length ? "Nadie encaja con el semáforo elegido." : "Nadie se ha registrado todavía.") +
        "</td></tr>");

  $$("#admin-personas [data-persona]").forEach(tr=>{
    tr.addEventListener("click", ()=> verPersona(+tr.dataset.persona));
  });
}

let adminPersonas = [];

function verPersona(i){
  const p = adminPersonas[i];
  if(!p) return;
  $("#admin-vista-personas").hidden = true;
  $("#admin-vista-programas").hidden = true;
  $(".admin-tabs").style.display = "none";
  $("#sem-filtro").hidden = true;
  $("#admin-detalle").hidden = false;
  $("#det-ronda").hidden = true;
  $("#det-nombre").textContent = p.nombre || p.correo;
  $("#det-meta").textContent = p.correo + " · " + (p.facultad || "Sin facultad") + " · " +
    (p.programa || "Sin programa") + " · " + p.total + (p.total === 1 ? " ronda" : " rondas");

  $("#det-rondas").innerHTML = p.rondas.length
    ? p.rondas.map((r,j)=>`
        <tr class="clicable" data-ronda="${j}">
          <td class="num">${fechaCorta(r.creada_en)}</td>
          <td>${esc(r.tipo_nombre || r.tipo)}</td>
          <td class="num">${mmss(r.duracion_objetivo)}</td>
          <td class="num">${mmss(r.duracion_real)}</td>
          <td class="num">${r.ppm}</td>
          <td class="num">${r.muletillas_total}</td>
          <td class="num">${semaforo(r.puntaje)}</td>
          <td><button class="btn-mini">Leer</button></td>
        </tr>`).join("")
    : '<tr><td colspan="8" style="color:var(--texto-3)">Esta persona todavía no ha practicado.</td></tr>';

  $$("#det-rondas [data-ronda]").forEach(tr=>{
    tr.addEventListener("click", ()=> verRondaAdmin(p, +tr.dataset.ronda));
  });
}

function verRondaAdmin(persona, j){
  const r = persona.rondas[j];
  if(!r) return;
  const dims = (r.dimensiones || []).map(d=>`
    <div class="det-dim"><div class="n">${d.pct == null ? "—" : d.pct}</div><div class="t">${esc(d.nombre || d.id)}</div></div>`).join("");

  $("#det-ronda").hidden = false;
  $("#det-ronda").innerHTML = `
    <div class="det-ficha">
      <h4>${esc(r.tipo_nombre || r.tipo)} · ${fechaCorta(r.creada_en)} · puntaje ${r.puntaje}</h4>
      <div class="det-dims">${dims || '<span style="color:var(--texto-3)">Sin dimensiones registradas.</span>'}</div>
      <div class="det-bloque">
        <span class="et">Transcripción</span>
        <div class="det-texto">${esc(r.transcripcion || "Sin transcripción.")}</div>
      </div>
      <div class="det-bloque">
        <span class="et">Observaciones</span>
        ${(function(){
          if(!r.observaciones){
            return '<div class="det-texto">Esta persona no generó observaciones para esta ronda.</div>';
          }
          const h = observacionesGuardadasAHTML({texto: r.observaciones});
          /* Si está guardado en el formato por secciones se pinta igual
             que en el reporte; si es prosa antigua, tal cual como antes. */
          return h && h.indexOf("obs-bloque") >= 0
            ? '<div class="det-obs">' + h + '</div>'
            : '<div class="det-texto">' + esc(r.observaciones) + '</div>';
        })()}
      </div>
      <div class="det-bloque">
        <span class="et">Ejercicio sugerido</span>
        <div class="det-texto">${r.ejercicio && r.ejercicio.titulo ? esc(r.ejercicio.titulo + " — " + r.ejercicio.texto) : "—"}</div>
      </div>
    </div>`;
  $("#det-ronda").scrollIntoView({behavior:"smooth", block:"nearest"});
}

function volverALista(){
  $("#admin-detalle").hidden = true;
  $("#det-ronda").hidden = true;
  $(".admin-tabs").style.display = "";
  const enPersonas = $("#at-personas").getAttribute("aria-selected") === "true";
  $("#admin-vista-personas").hidden = !enPersonas;
  $("#admin-vista-programas").hidden = enPersonas;
  if(enPersonas){ $("#sem-filtro").hidden = false; }
  else { pintarPorPrograma(); }
}

function pintarAdmin(){
  pintarPersonas();
  const total = adminDatos.length;
  const personas = adminUsuarios.length || new Set(adminDatos.map(r=>r.correo)).size;
  const prom = total ? Math.round(adminDatos.reduce((a,r)=>a + (Number(r.puntaje)||0), 0) / total) : 0;
  const promMul = total ? (adminDatos.reduce((a,r)=>a + (Number(r.muletillas_total)||0), 0) / total) : 0;
  const facultades = new Set(adminDatos.map(r=>r.facultad).filter(Boolean)).size;

  if(adminFalloPerfiles){
    $("#admin-sub").innerHTML =
      '<strong style="color:var(--revisa)">La lista está incompleta.</strong> No se pudo leer la tabla de perfiles (' +
      esc(adminFalloPerfiles) + "), así que abajo solo aparecen las personas que ya practicaron: " +
      "quien se registró pero todavía no ha hecho ninguna ronda no se ve. " +
      "Vuelve a correr <code>supabase-instalacion.sql</code> completo — crea la política que deja al administrador leer todos los perfiles.";
  } else if(adminFaltaVista){
    $("#admin-sub").innerHTML =
      '<strong style="color:var(--ajusta)">Falta la vista <code>perfiles_admin</code>.</strong> ' +
      "El panel está leyendo la tabla <code>perfiles</code> directamente, así que puede incluir cuentas " +
      "que no correspondan al consolidado. Crea la vista en Supabase y vuelve a actualizar.";
  } else {
    /* Se dice cuántas cuentas de administración quedaron fuera, para
       que la diferencia entre este número y el de Supabase no parezca
       un error del panel. */
    const nota = adminCuentas
      ? " No se cuenta" + (adminCuentas === 1 ? " la cuenta de administración." : " las " + adminCuentas + " cuentas de administración.")
      : "";
    $("#admin-sub").textContent = personas
      ? "Personas que han iniciado sesión al menos una vez, hayan practicado o no. " +
        "Las cuentas creadas pero nunca usadas no aparecen aquí." + nota
      : "Todavía nadie ha iniciado sesión en el servicio." + nota;
  }

  /* «Muletillas por ronda» salió de aquí: en un consolidado del
     servicio no dice nada accionable, y el dato sigue estando en el
     reporte de cada persona y en el Excel. */
  $("#admin-kpis").innerHTML = [
    ["Personas", personas], ["Rondas", total], ["Facultades", facultades],
    ["Puntaje promedio", prom]
  ].map(k=>`<div class="admin-kpi"><div class="n">${esc(k[1])}</div><div class="t">${esc(k[0])}</div></div>`).join("");

  pintarPorPrograma();
}

/* ============================================================
   POR PROGRAMA: TRES NIVELES
   ------------------------------------------------------------
   Antes esta vista listaba solo las combinaciones de facultad y
   programa que ya tenían rondas. Con dos personas practicando
   mostraba una fila, y la pregunta que de verdad se hace el Centro
   («¿en qué programas no está entrando nadie?») no se podía
   responder: lo que falta no aparecía por ninguna parte.

   Ahora salen TODAS las facultades de la Universidad y TODOS los
   programas de cada una, tengan actividad o no. Un programa en cero
   es información, no un hueco.

     Nivel 1  ·  las diez facultades
     Nivel 2  ·  los programas de la facultad elegida
     Nivel 3  ·  las personas de ese programa

   FACULTADES lo trae auth.js, que es donde vive la lista oficial y
   la misma que se usa en el registro. Así no hay dos listas que
   mantener.
   ============================================================ */

/* ============================================================
   ROSCA DE COMPOSICIÓN
   ------------------------------------------------------------
   Un vistazo a cómo se reparten las personas: por facultad en el
   primer nivel, por programa dentro de una facultad en el segundo.

   POR QUÉ SOLO CINCO SECTORES
   Una rosca sirve para ver la proporción de un vistazo, no para
   comparar valores parecidos, y deja de leerse pasados unos seis
   sectores. Con diez facultades se pintan las cuatro mayores y el
   resto se agrupa en «Otras». El detalle completo, facultad por
   facultad, está en la tabla de debajo, que es además el respaldo
   accesible de la gráfica.

   POR QUÉ UN SOLO TONO
   Cualquier sector puede quedar junto a cualquier otro, así que
   todos los pares cuentan. Con más de tres tonos distintos los
   pares dejan de distinguirse para quien no percibe bien el color.
   Una escala de claridad del azul institucional, ordenada de mayor
   a menor, evita el problema y además dice dos veces lo mismo:
   más grande y más oscuro es más gente.

   La identidad nunca depende del color: cada sector lleva su
   etiqueta en la leyenda, con su cifra y su porcentaje.
   ============================================================ */
const ROSCA_TONOS = ["#001459", "#2A5AA8", "#5E93CE", "#A3C3E6"];
const ROSCA_OTRAS = "#5C6472";
const ROSCA_MAX   = 4;    /* sectores con nombre propio; el quinto es «Otras» */

/* Un sector de rosca es un arco entre dos radios. Se dibuja como
   trazo grueso sobre un círculo, que sale más simple y más nítido
   que componer el path a mano. */
function arcoRosca(desde, hasta, color, id){
  const R = 36, C = 2 * Math.PI * R;
  const largo = Math.max(0, (hasta - desde)) * C;
  /* 2 px de aire entre sectores: los separa sin inventar un borde
     de color, que competiría con los datos. */
  const hueco = 1.6;
  const visible = Math.max(0.5, largo - hueco);
  return '<circle class="rosca-sector" data-sector="' + id + '"' +
    ' cx="50" cy="50" r="' + R + '" fill="none"' +
    ' stroke="' + color + '" stroke-width="17"' +
    ' stroke-dasharray="' + visible.toFixed(2) + ' ' + (C - visible).toFixed(2) + '"' +
    ' stroke-dashoffset="' + (-desde * C).toFixed(2) + '"' +
    ' transform="rotate(-90 50 50)"><title></title></circle>';
}

/* datos: [{nombre, valor}] sin ordenar. Devuelve lo que se pinta. */
function pintarRosca(titulo, datos, etiquetaCentro){
  const zona = $("#rosca-zona");
  if(!zona) return;

  const con = datos.filter(d => d.valor > 0).sort((a,b)=> b.valor - a.valor);
  const total = con.reduce((a,d)=> a + d.valor, 0);

  if(!total){
    zona.hidden = false;
    $("#rosca-titulo").textContent = titulo;
    $("#rosca-svg").innerHTML =
      '<circle cx="50" cy="50" r="36" fill="none" stroke="#E9EEF7" stroke-width="17"/>';
    $("#rosca-total").textContent = "0";
    $("#rosca-leyenda").innerHTML =
      '<div class="rosca-vacia">Todavía no hay a nadie registrado aquí.</div>';
    $("#rosca-alt").textContent = "Sin datos que representar.";
    return;
  }

  /* Los mayores con nombre; el resto, agrupado. */
  let trozos = con.slice(0, ROSCA_MAX).map((d,i)=>({
    nombre: d.nombre, valor: d.valor, color: ROSCA_TONOS[i]
  }));
  const resto = con.slice(ROSCA_MAX);
  if(resto.length){
    trozos.push({
      nombre: resto.length === 1 ? resto[0].nombre : "Otras " + resto.length,
      valor: resto.reduce((a,d)=> a + d.valor, 0),
      color: resto.length === 1 ? ROSCA_TONOS[ROSCA_MAX - 1] : ROSCA_OTRAS,
      agrupa: resto.length > 1 ? resto.map(d=> d.nombre) : null
    });
  }

  let acumulado = 0;
  const arcos = trozos.map((t,i)=>{
    const desde = acumulado;
    acumulado += t.valor / total;
    return arcoRosca(desde, acumulado, t.color, i);
  }).join("");

  zona.hidden = false;
  $("#rosca-titulo").textContent = titulo;
  $("#rosca-total").textContent = total;
  $("#rosca-svg").innerHTML = arcos;

  $("#rosca-leyenda").innerHTML = trozos.map((t,i)=>{
    const pct = Math.round(t.valor / total * 100);
    return '<div class="rosca-item" data-sector="' + i + '">' +
      '<span class="rosca-punto" style="background:' + t.color + '"></span>' +
      '<span class="rosca-nom" title="' + esc(t.agrupa ? t.agrupa.join(", ") : t.nombre) + '">' +
        esc(t.nombre) + "</span>" +
      '<span class="rosca-val">' + t.valor + "</span>" +
      '<span class="rosca-pct">' + pct + " %</span></div>";
  }).join("");

  /* El título de cada arco es lo que muestra el navegador al pasar
     por encima, y lo que lee un lector de pantalla. */
  $$("#rosca-svg [data-sector]").forEach(el=>{
    const t = trozos[+el.dataset.sector];
    const pct = Math.round(t.valor / total * 100);
    const tit = el.querySelector("title");
    if(tit){ tit.textContent = t.nombre + ": " + t.valor + " de " + total + " (" + pct + " %)"; }
  });

  $("#rosca-alt").textContent = titulo + ". " +
    trozos.map(t=> t.nombre + ", " + t.valor).join("; ") + ". Total " + total + " " +
    (etiquetaCentro || "personas") + ". El detalle completo está en la tabla siguiente.";
}

let progFacultad = "", progPrograma = "";

/* Todo lo que se sabe de una persona, venga de perfiles o de haber
   aparecido en una ronda. */
function personasConDatos(){
  const por = {};
  adminUsuarios.forEach(u=>{
    const c = String(u.correo || "").toLowerCase();
    if(!c) return;
    por[c] = {correo:u.correo, nombre:u.nombre || "", facultad:u.facultad || "",
              programa:u.programa || "", rondas:0, suma:0, ultimo:null};
  });
  adminDatos.forEach(r=>{
    const c = String(r.correo || "").toLowerCase();
    if(!c) return;
    if(!por[c]){
      por[c] = {correo:r.correo, nombre:r.nombre || "", facultad:r.facultad || "",
                programa:r.programa || "", rondas:0, suma:0, ultimo:null};
    }
    const p = por[c];
    p.rondas++;
    p.suma += Number(r.puntaje) || 0;
    if(p.ultimo == null){ p.ultimo = Number(r.puntaje) || 0; }
    if(!p.facultad) p.facultad = r.facultad || "";
    if(!p.programa) p.programa = r.programa || "";
  });
  return Object.values(por);
}

/* Los nombres se escribieron por separado en el registro y en las
   rondas, así que se comparan sin tildes ni mayúsculas. */
function igualNombre(a, b){
  const n = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
                   .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  return n(a) === n(b);
}

function resumen(lista){
  const rondas = lista.reduce((a,p)=> a + p.rondas, 0);
  const suma   = lista.reduce((a,p)=> a + p.suma, 0);
  return {
    personas: lista.length,
    activas:  lista.filter(p=> p.rondas > 0).length,
    rondas:   rondas,
    prom:     rondas ? Math.round(suma / rondas) : null
  };
}

/* El detalle de una persona se alimenta de adminPersonas, que arma
   pintarPersonas(). Desde el recorrido por programa se llega con el
   correo, así que hay que traducirlo a su posición en esa lista. */
function indiceDePersona(correo){
  const c = String(correo || "").toLowerCase();
  if(!c || !Array.isArray(adminPersonas)) return -1;
  for(let i = 0; i < adminPersonas.length; i++){
    if(String(adminPersonas[i].correo || "").toLowerCase() === c) return i;
  }
  return -1;
}

function pintarRuta(){
  const partes = [];
  if(progFacultad){
    partes.push('<button type="button" data-ruta="raiz">Todas las facultades</button>');
    if(progPrograma){
      partes.push('<span class="sep" aria-hidden="true">›</span>');
      partes.push('<button type="button" data-ruta="facultad">' + esc(progFacultad) + "</button>");
      partes.push('<span class="sep" aria-hidden="true">›</span>');
      partes.push('<span class="aqui">' + esc(progPrograma) + "</span>");
    } else {
      partes.push('<span class="sep" aria-hidden="true">›</span>');
      partes.push('<span class="aqui">' + esc(progFacultad) + "</span>");
    }
  } else {
    partes.push('<span class="aqui">Todas las facultades</span>');
  }
  $("#admin-ruta").innerHTML = partes.join(" ");
  $$("#admin-ruta [data-ruta]").forEach(b=>{
    b.addEventListener("click", ()=>{
      if(b.dataset.ruta === "raiz"){ progFacultad = ""; progPrograma = ""; }
      else { progPrograma = ""; }
      pintarPorPrograma();
    });
  });
}

function pintarPorPrograma(){
  const cab = $("#admin-prog-cab");
  const cuerpo = $("#admin-cuerpo");
  if(!cab || !cuerpo) return;
  pintarRuta();

  const gente = personasConDatos();
  const listaFac = (typeof FACULTADES === "object" && FACULTADES) ? Object.keys(FACULTADES) : [];

  /* ── Nivel 3: las personas del programa elegido ── */
  if(progFacultad && progPrograma){
    const todos = gente
      .filter(p=> igualNombre(p.programa, progPrograma))
      .sort((a,b)=> b.rondas - a.rondas || String(a.correo).localeCompare(String(b.correo)));
    const dentro = todos.filter(p=> semPasa(p.rondas ? Math.round(p.suma / p.rondas) : null));
    semCuenta(dentro.length, todos.length);

    /* En el nivel de personas no hay composición que mostrar: cada
       fila es una persona, no una parte de un total. */
    $("#rosca-zona").hidden = true;
    $("#sem-filtro").hidden = false;

    cab.innerHTML = "<tr><th>Persona</th><th>Rondas</th><th>Último puntaje</th><th>Promedio</th><th></th></tr>";
    cuerpo.innerHTML = dentro.length
      ? dentro.map(p=>{
          /* El detalle con el reporte y las observaciones ya existe;
             aquí solo se enlaza, buscando a la persona en la lista
             que lo alimenta. */
          const idx = indiceDePersona(p.correo);
          return `<tr${p.rondas ? "" : ' class="vacia"'}>
          <td>${esc(p.nombre || p.correo)}
              <div style="font-size:12px;color:var(--texto-3)">${esc(p.correo)}</div></td>
          <td class="num">${p.rondas}</td>
          <td class="num">${semaforo(p.ultimo)}</td>
          <td class="num">${semaforo(p.rondas ? Math.round(p.suma / p.rondas) : null)}</td>
          <td>${idx > -1
            ? '<button class="btn-mini" data-ver-persona="' + idx + '">Ver reporte</button>'
            : ""}</td>
        </tr>`;}).join("")
      : ('<tr><td colspan="5" style="color:var(--texto-3)">' +
          (todos.length ? "Nadie de este programa encaja con el semáforo elegido."
                        : "Nadie de este programa se ha registrado todavía.") + "</td></tr>");

    $$("#admin-cuerpo [data-ver-persona]").forEach(b=>{
      b.addEventListener("click", e=>{
        e.stopPropagation();
        verPersona(+b.dataset.verPersona);
      });
    });

    const r = resumen(dentro);
    $("#admin-prog-pista").textContent = dentro.length
      ? r.personas + (r.personas === 1 ? " persona registrada" : " personas registradas") +
        ", " + r.activas + " con al menos una ronda."
      : "Este programa aparece porque está en la lista de la Universidad, no porque tenga a alguien inscrito en la herramienta.";
    return;
  }

  /* El filtro por semáforo clasifica personas, así que en los
     niveles de facultad y programa se retira. */
  $("#sem-filtro").hidden = true;
  semCuenta(0, 0);

  /* ── Nivel 2: los programas de la facultad elegida ── */
  if(progFacultad){
    const programas = (FACULTADES && FACULTADES[progFacultad]) ? FACULTADES[progFacultad].slice() : [];
    /* Alguien puede tener un programa que no está en la lista oficial
       (posgrado, «otro programa»). No se puede perder: se añade. */
    gente.forEach(p=>{
      if(!igualNombre(p.facultad, progFacultad) || !p.programa) return;
      if(!programas.some(x=> igualNombre(x, p.programa))) programas.push(p.programa);
    });

    cab.innerHTML = "<tr><th>Programa</th><th>Personas</th><th>Con rondas</th><th>Rondas</th><th>Puntaje promedio</th></tr>";
    cuerpo.innerHTML = programas.length
      ? programas.map(nom=>{
          const dentro = gente.filter(p=> igualNombre(p.programa, nom));
          const r = resumen(dentro);
          return `<tr class="baja${r.personas ? "" : " vacia"}" data-programa="${esc(nom)}">
            <td>${esc(nom)}</td>
            <td class="num">${r.personas}</td>
            <td class="num">${r.activas}</td>
            <td class="num">${r.rondas}</td>
            <td class="num">${semaforo(r.prom)}</td>
          </tr>`;
        }).join("")
      : '<tr><td colspan="5" style="color:var(--texto-3)">Esta facultad no tiene programas en la lista.</td></tr>';

    $$("#admin-cuerpo [data-programa]").forEach(tr=>{
      tr.addEventListener("click", ()=>{
        progPrograma = tr.dataset.programa;
        pintarPorPrograma();
      });
    });

    pintarRosca("Personas por programa · " + progFacultad,
      programas.map(nom=>({
        nombre: nom,
        valor: gente.filter(p=> igualNombre(p.programa, nom)).length
      })));

    $("#admin-prog-pista").textContent = "Pulsa un programa para ver quién está inscrito y abrir su reporte.";
    return;
  }

  /* ── Nivel 1: todas las facultades ── */
  const nombres = listaFac.slice();
  gente.forEach(p=>{
    if(p.facultad && !nombres.some(x=> igualNombre(x, p.facultad))) nombres.push(p.facultad);
  });

  cab.innerHTML = "<tr><th>Facultad</th><th>Programas</th><th>Personas</th><th>Con rondas</th><th>Rondas</th><th>Puntaje promedio</th></tr>";
  cuerpo.innerHTML = nombres.length
    ? nombres.map(nom=>{
        const dentro = gente.filter(p=> igualNombre(p.facultad, nom));
        const r = resumen(dentro);
        const cuantos = (FACULTADES && FACULTADES[nom]) ? FACULTADES[nom].length : 0;
        return `<tr class="baja${r.personas ? "" : " vacia"}" data-facultad="${esc(nom)}">
          <td>${esc(nom)}</td>
          <td class="num">${cuantos || "—"}</td>
          <td class="num">${r.personas}</td>
          <td class="num">${r.activas}</td>
          <td class="num">${r.rondas}</td>
          <td class="num">${semaforo(r.prom)}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="6" style="color:var(--texto-3)">No hay facultades que mostrar.</td></tr>';

  $$("#admin-cuerpo [data-facultad]").forEach(tr=>{
    tr.addEventListener("click", ()=>{
      progFacultad = tr.dataset.facultad;
      progPrograma = "";
      pintarPorPrograma();
    });
  });

  pintarRosca("Personas por facultad",
    nombres.map(nom=>({
      nombre: nom.replace(/^Facultad de /, "").replace(/^Escuela Internacional de /, "E. I. de "),
      valor: gente.filter(p=> igualNombre(p.facultad, nom)).length
    })));

  const conAlguien = nombres.filter(n=> gente.some(p=> igualNombre(p.facultad, n))).length;
  $("#admin-prog-pista").textContent =
    "Están las " + nombres.length + " facultades, tengan actividad o no: " + conAlguien +
    (conAlguien === 1 ? " tiene" : " tienen") + " a alguien registrado. Pulsa una para ver sus programas.";
}

/* ============================================================
   ARRANQUE
   ============================================================ */
$("#btn-grabar").addEventListener("click", iniciarPractica);
$("#btn-sin-mic").addEventListener("click", iniciarSinMicrofono);
$("#btn-detener").addEventListener("click", detenerPractica);
/* ── Notas de apoyo ────────────────────────────────────────────
   Se escriben en «Prepara» y sirven para mirarlas de reojo mientras
   se habla. Antes solo aparecían al pulsar «Grabar», que es justo
   cuando ya no hay tiempo de leerlas: quien entraba a «Practica»
   veía el hueco vacío y daba por hecho que no se habían guardado.
   Ahora están puestas desde que se abre la hoja y se actualizan
   mientras se escriben. */
function pintarNotas(){
  const caja = $("#notas-vivas"), eco = $("#notas-eco"), campo = $("#notas");
  if(!caja || !eco || !campo) return;
  const notas = campo.value.trim();
  caja.style.display = notas ? "block" : "none";
  eco.textContent = notas;
}

$("#notas").addEventListener("input", pintarNotas);

/* Se vigila el panel en lugar de enganchar cada botón que lleva a
   él: así vale igual si se llega desde «Prepara», desde el reporte
   o desde las pestañas de arriba. */
(function vigilarPractica(){
  const panel = document.getElementById("p-practica");
  if(!panel || typeof MutationObserver !== "function"){ return; }
  new MutationObserver(()=>{ if(!panel.hidden) pintarNotas(); })
    .observe(panel, {attributes:true, attributeFilter:["hidden"]});
})();

$("#ir-practica").addEventListener("click", ()=> irA("p-practica"));
$("#vacio-ir").addEventListener("click", ()=> irA("p-practica"));
$("#texto-manual").addEventListener("input", ()=>{
  const n = palabras($("#texto-manual").value).length;
  $("#contador-pal").textContent = n + (n === 1 ? " palabra" : " palabras");
});
window.addEventListener("beforeunload", ()=>{
  if(estado.grabando){ liberarMedios(); }
});


/* --- Historial: exportar, descargar y borrar --- */
$("#hist-excel").addEventListener("click", ()=>{
  /* Antes esto salía sin hacer nada si no eras administrador, así
     que el botón existía y no respondía. Cualquiera puede bajarse
     sus propias rondas; el consolidado de todo el mundo sigue
     siendo otro botón, dentro del panel de administración. */
  if(!estado.historial.length){
    avisoHistorial("Todavía no hay rondas que exportar. Practica una y vuelve.");
    return;
  }
  try{ exportarExcel(); avisoHistorial("Excel descargado con " + estado.historial.length +
        (estado.historial.length === 1 ? " ronda." : " rondas.")); }
  catch(err){ avisoHistorial("No se pudo generar el Excel: " + err.message); }
});

/* ============================================================
   DIAGNÓSTICO DEL SERVICIO DE IA
   ------------------------------------------------------------
   Recorre la cadena eslabón por eslabón y dice exactamente cuál
   está roto y qué hacer. La sonda de la Edge Function contesta
   sin llamar al modelo, así que comprobar no cuesta nada.
   ============================================================ */
const DIAG_PASOS = [
  {id:"sesion",   n:"Sesión iniciada"},
  {id:"bd",       n:"Base de datos (perfiles y rondas)"},
  {id:"perfiles", n:"Ver a todas las personas registradas"},
  {id:"consolidado", n:"Ver las rondas y transcripciones de todos"},
  {id:"columna",  n:"Columna «visual» de la migración"},
  {id:"funcion",  n:"Edge Function «observaciones» desplegada"},
  {id:"clave",    n:"Clave del proveedor de IA cargada"},
  {id:"modelo",   n:"El modelo responde"}
];

function diagPintar(estados){
  const marca = e => e === "ok" ? "✓" : e === "mal" ? "✕" : e === "duda" ? "!" : "·";
  $("#diag-lista").innerHTML = DIAG_PASOS.map(p=>{
    const r = estados[p.id] || {estado:"espera", texto:"Sin comprobar."};
    return `
      <div class="diag-item">
        <div class="diag-marca ${r.estado}">${marca(r.estado)}</div>
        <div>
          <h4>${esc(p.n)}</h4>
          <p>${r.texto}</p>
          ${r.arreglo ? '<div class="arreglo">' + r.arreglo + "</div>" : ""}
        </div>
      </div>`;
  }).join("");
}

async function diagnosticoIA(){
  const e = {};
  const pintar = ()=> diagPintar(e);
  DIAG_PASOS.forEach(p=>{ e[p.id] = {estado:"espera", texto:"Comprobando…"}; });
  pintar();

  /* 1 · Sesión ------------------------------------------------- */
  if(!Cuenta.sesion){
    e.sesion = {estado:"mal", texto:"No hay sesión iniciada.",
      arreglo:"Entra con tu cuenta institucional y vuelve a comprobar."};
    pintar(); return e;
  }
  e.sesion = {estado:"ok", texto:"Conectado como " + esc(Cuenta.sesion.correo) +
    (Cuenta.esAdmin() ? " (administrador)." : ".")};
  pintar();

  if(!haySupabase()){
    ["bd","columna","funcion","clave","modelo"].forEach(k=>{
      e[k] = {estado:"duda", texto:"No aplica: la herramienta no está conectada a Supabase."};
    });
    pintar(); return e;
  }

  /* 2 · Base de datos ------------------------------------------ */
  try{
    await sbAuth("/rest/v1/rondas?select=id&limit=1", {method:"GET"});
    e.bd = {estado:"ok", texto:"La base de datos responde y las políticas por fila dejan leer tus rondas."};
  }catch(err){
    e.bd = {estado:"mal", texto:"No respondió: " + esc(err.message),
      arreglo:"Corre <code>supabase-instalacion.sql</code> completo en el editor SQL de Supabase."};
    pintar(); return e;
  }
  pintar();

  /* 3 · Perfiles de todo el mundo (solo administración) --------- */
  if(!Cuenta.esAdmin()){
    e.perfiles = {estado:"duda", texto:"No aplica: esta cuenta no tiene rol de administrador."};
    e.consolidado = {estado:"duda", texto:"No aplica: esta cuenta no tiene rol de administrador."};
  } else {
    try{
      const u = await sbAuth("/rest/v1/" + VISTA_ADMIN_PERFILES +
        "?select=correo,rol,ultimo_acceso&order=creado_en", {method:"GET"});
      const todas = u || [];
      const conAcceso = todas.filter(x=>x.ultimo_acceso);
      const n = conAcceso.length;
      const admins = conAcceso.filter(x=>x.rol === "admin").length;
      const sinAcceso = todas.length - n;
      e.perfiles = n > 1
        ? {estado:"ok", texto:"El panel muestra " + n + " personas con sesión iniciada alguna vez (" +
             admins + " con rol de administrador)" +
             (sinAcceso ? ", y oculta " + sinAcceso +
                (sinAcceso === 1 ? " cuenta creada que nunca se usó." : " cuentas creadas que nunca se usaron.")
              : ". Ninguna cuenta quedó fuera por falta de actividad.") +
             " Fuente: <code>" + esc(VISTA_ADMIN_PERFILES) + "</code>."}
        : {estado:"duda", texto:"La vista <code>" + esc(VISTA_ADMIN_PERFILES) + "</code> responde, pero solo ves tu propio perfil.",
           arreglo:"Si esperabas ver a otras personas, revisa que la vista no filtre de más y que la política <code>perfil propio o admin</code> esté aplicada sobre <code>perfiles</code>."};
    }catch(err){
      if(esVistaInexistente(err)){
        e.perfiles = {estado:"mal", texto:"La vista <code>" + esc(VISTA_ADMIN_PERFILES) + "</code> no existe. El panel está leyendo <code>perfiles</code> de respaldo.",
          arreglo:"Créala en Supabase con el archivo <code>vista-perfiles-admin.sql</code>. Mientras tanto el panel funciona, pero sin el filtro de la vista."};
      } else {
        e.perfiles = {estado:"mal", texto:"No se pudo leer <code>" + esc(VISTA_ADMIN_PERFILES) + "</code>: " + esc(err.message),
          arreglo:"Revisa que la vista tenga <code>grant select … to authenticated</code> y <code>security_invoker = true</code>."};
      }
    }
    pintar();

    /* 4 · Consolidado de rondas ---------------------------------- */
    try{
      const r = await sbAuth("/rest/v1/rondas_admin?select=correo,transcripcion,observaciones&order=creada_en.desc", {method:"GET"});
      const filas = r || [];
      const personas = new Set(filas.map(x=>x.correo)).size;
      const conTexto = filas.filter(x=>x.transcripcion).length;
      const conObs = filas.filter(x=>x.observaciones).length;
      e.consolidado = filas.length
        ? {estado:"ok", texto: filas.length + " rondas de " + personas + " personas · " +
             conTexto + " con transcripción · " + conObs + " con observaciones de IA. " +
             "Haz clic en cualquier persona de la lista para leerlas."}
        : {estado:"duda", texto:"La vista responde, pero todavía no hay ninguna ronda guardada.",
           arreglo:"Si alguien ya practicó con su cuenta, revisa que la ronda se haya guardado: sin sesión iniciada no se guarda nada."};
    }catch(err){
      e.consolidado = {estado:"mal", texto:"No se pudo leer la vista «rondas_admin»: " + esc(err.message),
        arreglo:"Vuelve a correr <code>supabase-instalacion.sql</code>. La vista se reconstruye al final del script con <code>security_invoker = true</code>."};
    }
  }
  pintar();

  /* 5 · Columna visual ----------------------------------------- */
  try{
    await sbAuth("/rest/v1/rondas?select=visual&limit=1", {method:"GET"});
    e.columna = {estado:"ok", texto:"La columna existe: las métricas de cámara se van a guardar."};
  }catch(err){
    e.columna = {estado:"duda", texto:"La columna «visual» todavía no existe.",
      arreglo:"Vuelve a correr <code>supabase-instalacion.sql</code>. Mientras tanto las rondas se guardan igual, pero sin las métricas de presencia visual, y los escenarios «elevator» y «comercial» fallarán al guardarse."};
  }
  pintar();

  /* 6 y 7 · Función y clave ------------------------------------ */
  let sonda = null;
  try{
    sonda = await sbAuth("/functions/v1/observaciones", {
      method:"POST", body: JSON.stringify({diagnostico:true})
    });
    e.funcion = {estado:"ok", texto:"Desplegada y respondiendo" +
      (sonda && sonda.version ? " (versión " + esc(sonda.version) + ")." : ".")};
  }catch(err){
    const m = String(err && err.message || "");
    if(err.status === 404 || m.indexOf("No hay conexión") >= 0){
      e.funcion = {estado:"mal", texto:"No está desplegada: Supabase devuelve 404.",
        arreglo:"En el panel de Supabase: <strong>Edge Functions → Deploy a new function → Via editor</strong>, nómbrala exactamente <code>observaciones</code> y pega el contenido de <code>observaciones/index.ts</code>."};
    } else if(err.status === 401){
      e.funcion = {estado:"mal", texto:"Desplegada, pero rechazó la sesión (401).",
        arreglo:"Cierra sesión y vuelve a entrar. Si sigue igual, revisa que la función esté con <em>Verify JWT</em> activado y que el proyecto sea el mismo del HTML."};
    } else {
      e.funcion = {estado:"mal", texto:"Respondió con un error: " + esc(m),
        arreglo:"Mira <strong>Edge Functions → observaciones → Logs</strong> en el panel de Supabase."};
    }
    e.clave  = {estado:"espera", texto:"No se pudo comprobar: primero hay que desplegar la función."};
    e.modelo = {estado:"espera", texto:"No se pudo comprobar."};
    pintar(); return e;
  }
  pintar();

  if(sonda && sonda.clave_cargada){
    e.clave = {estado:"ok", texto:"Cargada. Modelo configurado: " + esc(sonda.modelo || "—") +
      (sonda.tope_diario ? " · tope de " + sonda.tope_diario + " observaciones por persona al día." : " · sin tope diario.")};
  } else {
    e.clave = {estado:"mal", texto:"La función está desplegada pero no encuentra la clave del proveedor.",
      arreglo:"En el panel: <strong>Edge Functions → Secrets → Add new secret</strong>, con nombre exacto <code>ANTHROPIC_API_KEY</code> y tu clave <code>sk-ant-…</code>. Después vuelve a desplegar la función."};
    e.modelo = {estado:"espera", texto:"No se puede probar sin la clave."};
    pintar(); return e;
  }
  e.modelo = {estado:"espera", texto:"Listo para probar. La prueba real sí consume una llamada al proveedor."};
  pintar();
  return e;
}

/* Prueba de extremo a extremo. Se separa a propósito: esta sí gasta. */
async function diagProbarModelo(){
  const pie = $("#diag-pie");
  const b = $("#diag-probar");
  if(b) b.disabled = true;
  const marcar = (estado, texto, arreglo)=>{
    const item = $$("#diag-lista .diag-item").pop();
    if(!item) return;
    item.querySelector(".diag-marca").className = "diag-marca " + estado;
    item.querySelector(".diag-marca").textContent = estado === "ok" ? "✓" : estado === "mal" ? "✕" : "·";
    item.querySelector("p").innerHTML = texto;
    const viejo = item.querySelector(".arreglo");
    if(viejo) viejo.remove();
    if(arreglo){
      const d = document.createElement("div");
      d.className = "arreglo"; d.innerHTML = arreglo;
      item.querySelector("div:last-child").appendChild(d);
    }
  };
  marcar("espera", "Pidiendo una observación de prueba al modelo…");
  try{
    const r = await api("/observaciones", "POST", {
      ronda: {
        tipo_nombre:"Prueba de conexión", duracion_objetivo:60, duracion_real:58,
        modo:"manual", puntaje:70, palabras:60, ppm:120,
        muletillas_total:1, secciones_cubiertas:3, secciones_total:4,
        transcripcion:"Esta es una prueba de conexión del Centro de Desarrollo Profesional. " +
          "Buenos días, soy estudiante de la Universidad de La Sabana y quiero verificar que el " +
          "servicio de observaciones está funcionando correctamente. Gracias."
      },
      persona:{nombre:"Prueba", facultad:"—", programa:"—"},
      historial:[], ronda_numero:1
    });
    /* Sirve para los dos formatos: por secciones o texto corrido. */
    const t = observacionesAPlano(normalizarObservaciones(r)) || "";
    if(!t){ throw new Error("respondió, pero sin contenido reconocible"); }
    marcar("ok", "El modelo respondió con " + palabras(t).length + " palabras. La cadena completa funciona." +
      '<br><span style="color:var(--texto-3);font-size:12.5px">Primeras líneas: «' +
      esc(t.replace(/\*\*/g,"").slice(0,180)) + "…»</span>");
    if(pie){ pie.hidden = false; }
  }catch(err){
    marcar("mal", "No respondió: " + esc(err.message),
      "Revisa <strong>Edge Functions → observaciones → Logs</strong>. Si dice algo de <em>credit balance</em> o <em>authentication</em>, el problema está en la cuenta de Anthropic, no en Supabase.");
  }
  if(b) b.disabled = false;
}

$("#diag-correr").addEventListener("click", async ()=>{
  const b = $("#diag-correr");
  b.disabled = true;
  b.textContent = "Comprobando…";
  $("#diag-pie").hidden = true;
  try{
    const e = await diagnosticoIA();
    if(e.clave && e.clave.estado === "ok"){
      $("#diag-pie").hidden = false;
      $("#diag-pie").innerHTML =
        '<button class="btn btn-primario" id="diag-probar">Probar una observación real</button>' +
        '<span class="nota-pie">Esta prueba sí consume una llamada al proveedor (fracciones de centavo).</span>';
      $("#diag-probar").addEventListener("click", diagProbarModelo);
    }
  }catch(_){}
  b.disabled = false;
  b.textContent = "Comprobar de nuevo";
});

diagPintar({});

/* --- Administración --- */
$("#admin-refrescar").addEventListener("click", cargarAdmin);
$("#det-volver").addEventListener("click", volverALista);
montarFiltroSemaforo();

$("#at-personas").addEventListener("click", ()=>{
  $("#at-personas").setAttribute("aria-selected","true");
  $("#at-programas").setAttribute("aria-selected","false");
  $("#admin-vista-personas").hidden = false;
  $("#admin-vista-programas").hidden = true;
  /* En la pestaña de personas el filtro siempre aplica. */
  $("#sem-filtro").hidden = false;
  pintarPersonas();
});
$("#at-programas").addEventListener("click", ()=>{
  $("#at-personas").setAttribute("aria-selected","false");
  $("#at-programas").setAttribute("aria-selected","true");
  $("#admin-vista-personas").hidden = true;
  $("#admin-vista-programas").hidden = false;
  /* Lo muestra o lo esconde según el nivel en el que se esté. */
  pintarPorPrograma();
});
$("#inv-registro").addEventListener("click", ()=> abrirModal("registro"));
$("#inv-entrar").addEventListener("click", ()=> abrirModal("entrar"));
$("#admin-excel").addEventListener("click", ()=>{
  if(!Cuenta.esAdmin()){ return; }
  if(!adminDatos.length){ $("#admin-aviso").textContent = "No hay rondas para exportar todavía."; return; }
  try{
    const d = new Date();
    const p = n => String(n).padStart(2,"0");
    exportarExcel(adminDatos, "estudio-de-pitch-consolidado-" +
      d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + ".xlsx");
    $("#admin-aviso").textContent = "Excel generado con " + adminDatos.length +
      " rondas. Contiene datos personales: guárdalo en la carpeta restringida del CDP en OneDrive y no lo reenvíes por correo.";
  }catch(err){
    $("#admin-aviso").textContent = "No se pudo generar el Excel: " + err.message;
  }
});

let confirmandoBorrado = false;
$("#hist-borrar").addEventListener("click", async ()=>{
  const b = $("#hist-borrar");
  if(!confirmandoBorrado){
    confirmandoBorrado = true;
    b.textContent = "¿Seguro? Confirmar";
    avisoHistorial("Esto elimina todas tus rondas de forma permanente. Vuelve a pulsar para confirmar.");
    setTimeout(()=>{ if(confirmandoBorrado){ confirmandoBorrado = false; b.textContent = "Borrar todo"; } }, 6000);
    return;
  }
  confirmandoBorrado = false; b.textContent = "Borrar todo";
  try{
    await Almacen.borrarTodo();
    await cargarHistorial();
    avisoHistorial("Historial eliminado.");
  }catch(err){ avisoHistorial("No se pudo borrar: " + err.message); }
});

limpiarRastrosLocales();
renderSelectores();
renderGuion();
renderConsola();
actualizarReloj();
/* ============================================================
   ENGANCHE CON auth.js
   ------------------------------------------------------------
   La autenticación vive ahora en auth.js, compartida con la
   portada y el portafolio. Este archivo le dice qué repintar
   cuando alguien entra o sale, que es lo que antes hacía el
   propio módulo llamando a estas funciones directamente.
   ============================================================ */
alCambiarSesion(() => { cargarHistorial(); refrescarReporte(); });
alAvisar(txt => avisoHistorial(txt));

/* Qué hace el Pitch cuando alguien acaba de entrar */
alEntrar(async (sesion, txt) => {
  await cargarHistorial();
  refrescarReporte();
  irA("p-reporte");
  avisoHistorial(txt === "Cuenta verificada."
    ? "Cuenta verificada. A partir de ahora tu historial se guarda en tu cuenta."
    : "Sesión iniciada. Tu historial está sincronizado.");
});
sesionDesdeURL().then(entro=>{
  if(entro){ Cuenta.pintar(); irA("p-reporte"); }
  cargarHistorial();
});

})();
