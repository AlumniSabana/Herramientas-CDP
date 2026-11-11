/* ════════════════════════════════════════════════════════════
   MÓDULO DE PRESENCIA VISUAL
   ------------------------------------------------------------
   Independiente del análisis de audio. No comparte funciones ni
   variables con la grabación de voz: solo escribe en estado.visual
   y expone generarReporteVisual() para que el reporte lo pinte
   como una dimensión más.

   QUÉ SALE DE ESTE MÓDULO: cinco números y dos etiquetas.
   QUÉ NUNCA SALE: la imagen. El video se procesa fotograma a
   fotograma en memoria, nunca se guarda, no se codifica, no se
   sube y no se convierte en archivo. Al terminar, el objeto de
   vídeo se desconecta y las pistas de la cámara se apagan.

   Motor: MediaPipe Tasks Vision (Face Landmarker + Pose
   Landmarker). Se carga por CDN SOLO cuando la persona elige
   practicar con cámara. Si no carga, la dimensión queda «No
   medida» y no afecta el puntaje.
   ════════════════════════════════════════════════════════════ */

/* Versión fijada a propósito: evita que una actualización del CDN
   cambie el comportamiento sin avisar. */
const VIS_CDN      = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const VIS_WASM     = VIS_CDN + "/wasm";
const VIS_MODELO_ROSTRO =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const VIS_MODELO_POSE =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/* Cadencia de muestreo. No se analiza cada fotograma: 10 por
   segundo sobra para medir postura y encuadre, y deja el equipo
   libre para el reconocimiento de voz. */
const VIS_INTERVALO_MS = 100;
const VIS_INTERVALO_MAX = 260;

/* Umbrales de orientación: se considera «de frente» un giro de
   cabeza menor a estos grados. No es seguimiento de mirada. */
const VIS_YAW_MAX   = 22;
const VIS_PITCH_MAX = 20;

let visRostro = null, visPose = null, visMotorCargado = false, visCargando = null;
let visStream = null, visRaf = null, visUltimoTs = 0, visIntervalo = VIS_INTERVALO_MS;
let visMuestrasCara = [];
let visMuestrasCuerpo = [];
let visT0 = 0;

/* ------------------------------------------------------------
   Utilidades pequeñas y locales
   ------------------------------------------------------------ */
function visLimita(v, a, b){ return Math.max(a, Math.min(b, v)); }
function visMedia(a){ return a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0; }
function visDesv(a){
  if(a.length < 2) return 0;
  const m = visMedia(a);
  return Math.sqrt(visMedia(a.map(x=>(x-m)*(x-m))));
}
function visEstado(txt, clase){
  const e = document.getElementById("camara-estado");
  if(!e) return;
  e.textContent = txt;
  e.classList.remove("viva","falla");
  if(clase) e.classList.add(clase);
}
function visPista(txt){
  const p = document.getElementById("camara-pista");
  if(p) p.textContent = txt;
}
function visReiniciar(){
  visMuestrasCara = [];
  visMuestrasCuerpo = [];
  visT0 = 0;
  const v = estado.visual;
  v.activo = false; v.usada = false;
  v.encuadre = null; v.orientacion = null; v.postura = null;
  v.movimiento = null; v.gestualidad = null; v.resumen = null;
  ["encuadre","orientacion","postura","movimiento","gestualidad"].forEach(k=>{
    const el = document.getElementById("cm-" + k);
    if(el){ el.textContent = "—"; el.className = "cm-v"; }
  });
}

/* ------------------------------------------------------------
   CARGA DEL MOTOR
   Se llama una sola vez, y solo si alguien pide la cámara.
   ------------------------------------------------------------ */
function cargarMotorVisual(){
  if(visMotorCargado) return Promise.resolve(true);
  if(visCargando) return visCargando;

  visCargando = (async ()=>{
    const mod = await import(VIS_CDN + "/vision_bundle.mjs");
    const fileset = await mod.FilesetResolver.forVisionTasks(VIS_WASM);

    const crear = async (delegate)=>{
      visRostro = await mod.FaceLandmarker.createFromOptions(fileset, {
        baseOptions:{ modelAssetPath: VIS_MODELO_ROSTRO, delegate: delegate },
        runningMode:"VIDEO",
        numFaces:1,
        outputFaceBlendshapes:false,
        outputFacialTransformationMatrixes:true
      });
      visPose = await mod.PoseLandmarker.createFromOptions(fileset, {
        baseOptions:{ modelAssetPath: VIS_MODELO_POSE, delegate: delegate },
        runningMode:"VIDEO",
        numPoses:1
      });
    };

    try{ await crear("GPU"); }
    catch(_){ await crear("CPU"); }

    visMotorCargado = true;
    return true;
  })().catch(err=>{
    visCargando = null;
    throw err;
  });

  return visCargando;
}

/* ------------------------------------------------------------
   iniciarCamara()
   Pide permiso, muestra la vista previa y arranca el muestreo.
   Devuelve true si quedó midiendo; false si no, con el motivo
   escrito en estado.visual.motivo.
   ------------------------------------------------------------ */
async function iniciarCamara(){
  const v = estado.visual;
  visReiniciar();
  const modulo = document.getElementById("modulo-camara");
  const video  = document.getElementById("video-camara");
  const sin    = document.getElementById("camara-sin");
  if(modulo) modulo.hidden = false;

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    v.disponible = false;
    v.motivo = "este navegador no permite acceder a la cámara";
    visEstado("No disponible", "falla");
    visPista("Tu navegador no expone la cámara a las páginas web. Prueba con Chrome o Edge actualizados.");
    return false;
  }

  visEstado("Pidiendo permiso…");
  try{
    visStream = await navigator.mediaDevices.getUserMedia({
      video:{ width:{ideal:640}, height:{ideal:480}, facingMode:"user" },
      audio:false
    });
  }catch(err){
    const n = (err && err.name) || "error";
    v.disponible = false;
    v.motivo = n === "NotAllowedError"
      ? "no diste permiso de cámara"
      : n === "NotFoundError"
        ? "no se encontró ninguna cámara conectada"
        : "la cámara no pudo abrirse (" + n + ")";
    visEstado("Sin permiso", "falla");
    visPista("La práctica sigue funcionando con micrófono. La dimensión de presencia visual quedará como «No medida».");
    return false;
  }

  if(video){
    video.srcObject = visStream;
    try{ await video.play(); }catch(_){}
  }
  if(sin) sin.hidden = true;

  visEstado("Cargando el analizador…");
  visPista("La primera vez tarda unos segundos: se descarga el analizador al navegador.");
  try{
    await cargarMotorVisual();
  }catch(err){
    v.disponible = false;
    v.motivo = "no se pudo cargar el analizador visual (revisa la conexión)";
    visEstado("Analizador no disponible", "falla");
    visPista("Ves la vista previa, pero sin el analizador no hay métricas. La dimensión quedará como «No medida».");
    return false;
  }

  v.disponible = true;
  v.activo = true;
  v.usada = true;
  visIntervalo = VIS_INTERVALO_MS;
  visT0 = performance.now();
  visUltimoTs = 0;
  visEstado("Midiendo", "viva");
  visPista("Ubícate dentro del recuadro, a distancia de brazo de la cámara.");
  visBucle();
  return true;
}

/* ------------------------------------------------------------
   detenerCamara()
   Apaga el muestreo, suelta la cámara y consolida las métricas.
   Es idempotente: llamarla dos veces no borra el resumen.
   ------------------------------------------------------------ */
function detenerCamara(){
  const v = estado.visual;
  if(visRaf){ cancelAnimationFrame(visRaf); visRaf = null; }
  v.activo = false;

  if(v.usada && !v.resumen){
    v.resumen = calcularPresenciaVisual();
    v.encuadre    = v.resumen.encuadre;
    v.orientacion = v.resumen.orientacion;
    v.postura     = v.resumen.postura;
    v.movimiento  = v.resumen.movimiento;
    v.gestualidad = v.resumen.gestualidad;
  }

  if(visStream){
    visStream.getTracks().forEach(t=>{ try{ t.stop(); }catch(_){} });
    visStream = null;
  }
  const video = document.getElementById("video-camara");
  if(video){ video.pause(); video.srcObject = null; }
  const sin = document.getElementById("camara-sin");
  if(sin) sin.hidden = false;
  const guia = document.getElementById("camara-guia") ||
               document.querySelector("#modulo-camara .camara-guia");
  if(guia) guia.classList.remove("ok");

  if(v.usada && v.resumen && v.resumen.medida){
    visEstado("Medición terminada");
  } else if(v.usada){
    visEstado("Sin datos suficientes", "falla");
  }
}

/* ------------------------------------------------------------
   Bucle de muestreo
   ------------------------------------------------------------ */
function visBucle(){
  const video = document.getElementById("video-camara");
  const paso = async ()=>{
    if(!estado.visual.activo){ return; }
    visRaf = requestAnimationFrame(paso);

    const ahora = performance.now();
    if(ahora - visUltimoTs < visIntervalo) return;
    if(!video || video.readyState < 2 || !video.videoWidth) return;
    visUltimoTs = ahora;

    const t = (ahora - visT0)/1000;
    const arranque = performance.now();
    try{
      if(visRostro){ analizarRostro(visRostro.detectForVideo(video, ahora), t); }
      if(visPose){   analizarPostura(visPose.detectForVideo(video, ahora), t); }
    }catch(_){ /* un fotograma perdido no rompe la medición */ }

    /* Si el equipo va justo, se baja la cadencia en lugar de
       trabar la página o el reconocimiento de voz. */
    const costo = performance.now() - arranque;
    if(costo > visIntervalo * .8){
      visIntervalo = Math.min(VIS_INTERVALO_MAX, visIntervalo + 20);
    } else if(costo < visIntervalo * .3 && visIntervalo > VIS_INTERVALO_MS){
      visIntervalo = Math.max(VIS_INTERVALO_MS, visIntervalo - 10);
    }

    visPintarVivo();
  };
  visRaf = requestAnimationFrame(paso);
}

/* ------------------------------------------------------------
   analizarRostro(resultado, t)
   Guarda una muestra numérica del encuadre y de la orientación.
   Los puntos del rostro NO se conservan: solo el resumen.
   ------------------------------------------------------------ */
function analizarRostro(res, t){
  const puntos = res && res.faceLandmarks && res.faceLandmarks[0];
  if(!puntos || !puntos.length){
    visMuestrasCara.push({t, hay:false});
    return;
  }

  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for(let i=0;i<puntos.length;i++){
    const p = puntos[i];
    if(p.x < minX) minX = p.x;
    if(p.x > maxX) maxX = p.x;
    if(p.y < minY) minY = p.y;
    if(p.y > maxY) maxY = p.y;
  }
  const cx = (minX + maxX)/2;
  const cy = (minY + maxY)/2;
  const ancho = maxX - minX;
  const alto  = maxY - minY;

  /* ¿Se sale la cabeza del cuadro? Margen de tolerancia pequeño. */
  const dentro = minX > -0.02 && maxX < 1.02 && minY > -0.02 && maxY < 1.02;

  /* Orientación aproximada a partir de la matriz de transformación
     facial. Mide hacia dónde apunta la CABEZA, no la mirada. */
  let yaw = null, pitch = null;
  const m = res.facialTransformationMatrixes && res.facialTransformationMatrixes[0];
  if(m && m.data && m.data.length === 16){
    const d = m.data;   // columna-mayor
    const r00 = d[0], r01 = d[4], r02 = d[8];
    const r12 = d[9], r22 = d[10];
    yaw   = Math.atan2(r02, Math.sqrt(r12*r12 + r22*r22)) * 180/Math.PI;
    pitch = Math.atan2(-r12, r22) * 180/Math.PI;
    /* Corrección: si la matriz viene degenerada, se descarta. */
    if(!isFinite(yaw) || !isFinite(pitch)){ yaw = null; pitch = null; }
    void r00; void r01;
  }
  if(yaw === null){
    /* Respaldo geométrico: qué tan descentrada está la nariz dentro
       del ancho del rostro. Menos preciso, pero suficiente. */
    const nariz = puntos[1];
    if(nariz && ancho > 0.001){
      yaw = ((nariz.x - cx) / (ancho/2)) * 45;
      pitch = 0;
    }
  }

  const deFrente = yaw !== null &&
                   Math.abs(yaw) <= VIS_YAW_MAX &&
                   Math.abs(pitch === null ? 0 : pitch) <= VIS_PITCH_MAX;

  visMuestrasCara.push({t, hay:true, cx, cy, ancho, alto, dentro, yaw, pitch, deFrente});
}

/* ------------------------------------------------------------
   analizarPostura(resultado, t)
   Guarda inclinación, simetría y posición del tronco y las manos.
   ------------------------------------------------------------ */
function analizarPostura(res, t){
  const p = res && res.landmarks && res.landmarks[0];
  if(!p || p.length < 25){
    visMuestrasCuerpo.push({t, hay:false});
    return;
  }
  const vis = i => (p[i] && typeof p[i].visibility === "number") ? p[i].visibility : 1;
  const hI = p[11], hD = p[12], cI = p[23], cD = p[24];
  if(!hI || !hD){ visMuestrasCuerpo.push({t, hay:false}); return; }

  const hombrosVisibles = Math.min(vis(11), vis(12)) > .5;
  const anchoHombros = Math.hypot(hI.x - hD.x, hI.y - hD.y) || 0.001;

  /* Inclinación de la línea de hombros respecto a la horizontal. */
  const incHombros = Math.abs(Math.atan2(hI.y - hD.y, hI.x - hD.x) * 180/Math.PI);
  const inclinacionHombros = incHombros > 90 ? 180 - incHombros : incHombros;

  /* Diferencia de altura entre hombros, normalizada por su ancho:
     es la simetría aproximada. */
  const simetria = Math.abs(hI.y - hD.y) / anchoHombros;

  const mHombro = {x:(hI.x + hD.x)/2, y:(hI.y + hD.y)/2};
  let inclinacionTronco = null;
  if(cI && cD && Math.min(vis(23), vis(24)) > .4){
    const mCadera = {x:(cI.x + cD.x)/2, y:(cI.y + cD.y)/2};
    inclinacionTronco = Math.abs(Math.atan2(mCadera.x - mHombro.x, mCadera.y - mHombro.y) * 180/Math.PI);
  }

  /* Manos: se cuentan solo si de verdad se ven. */
  const munecaI = p[15], munecaD = p[16];
  const manoIVis = vis(15) > .5, manoDVis = vis(16) > .5;
  const manos = [];
  if(manoIVis && munecaI) manos.push({x:munecaI.x, y:munecaI.y});
  if(manoDVis && munecaD) manos.push({x:munecaD.x, y:munecaD.y});

  visMuestrasCuerpo.push({
    t, hay:true, hombrosVisibles, anchoHombros,
    inclinacionHombros, simetria, inclinacionTronco,
    tx:mHombro.x, ty:mHombro.y, manos
  });
}

/* ------------------------------------------------------------
   Lectura en vivo — solo informativa, no se guarda.
   ------------------------------------------------------------ */
function visPintarVivo(){
  const nC = visMuestrasCara.length;
  if(nC % 5 !== 0) return;   // refresca ~2 veces por segundo

  const ult = visMuestrasCara.slice(-20).filter(m=>m.hay);
  const guia = document.querySelector("#modulo-camara .camara-guia");
  const poner = (id, txt, clase)=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.textContent = txt;
    el.className = "cm-v" + (clase ? " " + clase : "");
  };

  if(!ult.length){
    poner("cm-encuadre", "sin rostro", "revisa");
    poner("cm-orientacion", "—");
    if(guia) guia.classList.remove("ok");
    return;
  }
  const enc = Math.round(visMedia(ult.map(visPuntajeEncuadreMuestra)));
  const ori = Math.round(ult.filter(m=>m.deFrente).length / ult.length * 100);
  poner("cm-encuadre", enc + "/100", nivel(enc));
  poner("cm-orientacion", ori + "%", nivel(ori));
  if(guia) guia.classList.toggle("ok", enc >= 75);

  const cuerpo = visMuestrasCuerpo.slice(-20).filter(m=>m.hay);
  if(cuerpo.length >= 4){
    const post = Math.round(visMedia(cuerpo.map(visPuntajePosturaMuestra)));
    poner("cm-postura", post + "/100", nivel(post));
    const mov = visEtiquetaMovimiento(cuerpo);
    poner("cm-movimiento", mov.etiqueta);
    const ges = visEtiquetaGestualidad(cuerpo);
    poner("cm-gestualidad", ges.etiqueta);
  }
}

/* ------------------------------------------------------------
   Puntajes por muestra
   ------------------------------------------------------------ */
function visPuntajeEncuadreMuestra(m){
  if(!m.hay) return 0;
  /* Centrado horizontal: el ideal es el centro del cuadro. */
  const dx = Math.abs(m.cx - 0.5);
  const pX = dx <= .06 ? 100 : dx <= .12 ? 82 : dx <= .20 ? 58 : dx <= .30 ? 32 : 12;
  /* Centrado vertical: el rostro debe ir algo por encima del centro. */
  const dy = Math.abs(m.cy - 0.42);
  const pY = dy <= .07 ? 100 : dy <= .13 ? 80 : dy <= .20 ? 55 : dy <= .28 ? 30 : 12;
  /* Distancia: ancho del rostro respecto al cuadro. */
  const a = m.ancho;
  const pD = (a >= .17 && a <= .34) ? 100
           : (a >= .13 && a < .17) || (a > .34 && a <= .42) ? 76
           : (a >= .10 && a < .13) || (a > .42 && a <= .50) ? 48
           : 20;
  const pM = m.dentro ? 100 : 25;
  return pX*.28 + pY*.22 + pD*.28 + pM*.22;
}

function visPuntajePosturaMuestra(m){
  if(!m.hay) return 0;
  const iH = m.inclinacionHombros;
  const pH = iH <= 3 ? 100 : iH <= 6 ? 85 : iH <= 10 ? 62 : iH <= 16 ? 38 : 18;
  const s = m.simetria;
  const pS = s <= .05 ? 100 : s <= .10 ? 84 : s <= .18 ? 60 : s <= .28 ? 36 : 16;
  if(m.inclinacionTronco === null){
    return pH*.55 + pS*.45;
  }
  const iT = m.inclinacionTronco;
  const pT = iT <= 5 ? 100 : iT <= 10 ? 84 : iT <= 16 ? 60 : iT <= 24 ? 36 : 16;
  return pH*.32 + pS*.28 + pT*.40;
}

/* ------------------------------------------------------------
   Etiquetas descriptivas: movimiento y gestualidad.
   A propósito NO se convierten en puntaje: describen, no juzgan.
   ------------------------------------------------------------ */
function visEtiquetaMovimiento(cuerpo){
  if(cuerpo.length < 6){
    return {etiqueta:"sin datos", desplazamiento:0, bruscos:0, repetitivo:false};
  }
  const d = [];
  let bruscos = 0;
  for(let i=1;i<cuerpo.length;i++){
    const a = cuerpo[i-1], b = cuerpo[i];
    const dt = Math.max(b.t - a.t, .001);
    const dist = Math.hypot(b.tx - a.tx, b.ty - a.ty) / Math.max(b.anchoHombros, .05);
    const vel = dist / dt;            // anchos de hombro por segundo
    d.push(vel);
    if(vel > 1.6) bruscos++;
  }
  const media = visMedia(d);
  /* Repetitivo: la posición oscila alrededor del mismo punto con
     mucha frecuencia — típico del balanceo de pie. */
  const xs = cuerpo.map(m=>m.tx);
  let cruces = 0;
  const mx = visMedia(xs);
  for(let i=1;i<xs.length;i++){
    if((xs[i-1] - mx) * (xs[i] - mx) < 0) cruces++;
  }
  const dur = Math.max(cuerpo[cuerpo.length-1].t - cuerpo[0].t, 1);
  const crucesPorMin = cruces / dur * 60;
  const repetitivo = crucesPorMin > 34 && visDesv(xs) > .012;

  let etiqueta;
  if(media < .12) etiqueta = "quieto";
  else if(media < .45) etiqueta = "moderado";
  else etiqueta = "alto";

  return {
    etiqueta, desplazamiento: media,
    bruscos, bruscosPorMin: bruscos / dur * 60,
    repetitivo, crucesPorMin
  };
}

function visEtiquetaGestualidad(cuerpo){
  const conManos = cuerpo.filter(m=>m.manos && m.manos.length);
  if(cuerpo.length < 6 || conManos.length < 3){
    return {etiqueta:"no visible", visiblePct:0, actividad:0};
  }
  const visiblePct = Math.round(conManos.length / cuerpo.length * 100);
  const d = [];
  for(let i=1;i<conManos.length;i++){
    const a = conManos[i-1], b = conManos[i];
    const dt = Math.max(b.t - a.t, .001);
    const n = Math.min(a.manos.length, b.manos.length);
    let suma = 0;
    for(let k=0;k<n;k++){
      suma += Math.hypot(b.manos[k].x - a.manos[k].x, b.manos[k].y - a.manos[k].y);
    }
    if(n) d.push((suma/n) / Math.max(b.anchoHombros, .05) / dt);
  }
  const act = visMedia(d);
  let etiqueta;
  if(act < .28) etiqueta = "baja";
  else if(act < .95) etiqueta = "moderada";
  else etiqueta = "alta";
  return {etiqueta, visiblePct, actividad:act};
}

/* ------------------------------------------------------------
   calcularPresenciaVisual()
   Consolida todas las muestras en el objeto que se guarda.
   Solo números y etiquetas: ni un pixel.
   ------------------------------------------------------------ */
function calcularPresenciaVisual(){
  const cara   = visMuestrasCara;
  const cuerpo = visMuestrasCuerpo;
  const conCara   = cara.filter(m=>m.hay);
  const conCuerpo = cuerpo.filter(m=>m.hay);

  const vacio = {
    medida:false, encuadre:null, orientacion:null, postura:null,
    movimiento:null, gestualidad:null, puntaje:null,
    rostroPct:0, cuerpoPct:0, muestras:cara.length, segundos:0,
    estabilidad:null, bruscos:0, repetitivo:false, manosPct:0
  };

  /* Menos de 4 segundos útiles de rostro: no alcanza para decir nada. */
  if(cara.length < 20 || conCara.length < 15){
    return vacio;
  }

  const segundos = cara.length ? (cara[cara.length-1].t - cara[0].t) : 0;
  const rostroPct = Math.round(conCara.length / cara.length * 100);
  const cuerpoPct = cuerpo.length ? Math.round(conCuerpo.length / cuerpo.length * 100) : 0;

  /* 1 · Encuadre — promedio, castigado por el tiempo sin rostro. */
  const encBase = visMedia(conCara.map(visPuntajeEncuadreMuestra));
  const encuadre = Math.round(visLimita(encBase * (0.35 + 0.65 * (rostroPct/100)), 0, 100));

  /* 2 · Orientación — porcentaje del tiempo con la cara al frente,
         sobre el total de la ronda (no solo sobre los fotogramas
         en que se detectó rostro: mirar fuera del cuadro también
         es no estar de frente). */
  const conOrientacion = conCara.filter(m=>m.yaw !== null);
  const orientacion = conOrientacion.length
    ? Math.round(conCara.filter(m=>m.deFrente).length / cara.length * 100)
    : null;

  /* 3 · Postura — promedio por muestra, ajustado por estabilidad
         del tronco y por cambios bruscos de posición. */
  let postura = null, estabilidad = null, mov = null, ges = null;
  if(conCuerpo.length >= 8){
    const base = visMedia(conCuerpo.map(visPuntajePosturaMuestra));
    const desvX = visDesv(conCuerpo.map(m=>m.tx));
    const desvY = visDesv(conCuerpo.map(m=>m.ty));
    const deriva = Math.hypot(desvX, desvY) / Math.max(visMedia(conCuerpo.map(m=>m.anchoHombros)), .05);
    estabilidad = Math.round(visLimita(100 - deriva*260, 0, 100));

    mov = visEtiquetaMovimiento(conCuerpo);
    ges = visEtiquetaGestualidad(conCuerpo);

    let p = base*.68 + estabilidad*.32;
    if(mov.bruscosPorMin > 12) p -= 12;
    else if(mov.bruscosPorMin > 5) p -= 6;
    /* El balanceo constante es un problema postural, aunque el
       cuerpo esté recto en cada fotograma por separado. */
    if(mov.repetitivo) p -= 14;
    postura = Math.round(visLimita(p, 0, 100));
  }

  /* Puntaje de la dimensión: solo encuadre, orientación y postura.
     Movimiento y gestualidad se describen, no se califican. */
  const partes = [];
  if(encuadre !== null)    partes.push({v:encuadre, w:.34});
  if(orientacion !== null) partes.push({v:orientacion, w:.33});
  if(postura !== null)     partes.push({v:postura, w:.33});
  const pesoTotal = partes.reduce((a,p)=>a+p.w, 0);
  const puntaje = pesoTotal
    ? Math.round(partes.reduce((a,p)=>a + p.v*p.w, 0) / pesoTotal)
    : null;

  return {
    medida: puntaje !== null,
    encuadre, orientacion, postura, puntaje,
    movimiento: mov ? mov.etiqueta : null,
    gestualidad: ges ? ges.etiqueta : null,
    estabilidad,
    bruscos: mov ? Math.round(mov.bruscosPorMin*10)/10 : 0,
    repetitivo: mov ? !!mov.repetitivo : false,
    manosPct: ges ? ges.visiblePct : 0,
    rostroPct, cuerpoPct,
    muestras: cara.length,
    segundos: Math.round(segundos)
  };
}

/* ------------------------------------------------------------
   generarReporteVisual()
   Devuelve la dimensión con el mismo contrato que las otras siete:
   {id, n, val, pct, dato, txt}. Con pct null el reporte la pinta
   como «Sin medición» y no entra al promedio.
   ------------------------------------------------------------ */
function generarReporteVisual(){
  const v = estado.visual;
  const r = v.resumen;

  if(!r || !r.medida){
    const motivo = !v.usada
      ? "practicaste sin cámara, así que no hay señal de video"
      : (v.motivo || "no se recogieron suficientes muestras de video");
    return {
      id:"visual", n:"Presencia visual", val:"—", pct:null,
      dato:"no medida · " + motivo,
      txt:"Esta dimensión no entra en el puntaje. Para medirla, empieza la ronda con «Practicar con cámara»: el análisis ocurre en tu navegador y ningún video sale de tu equipo."
    };
  }

  const partes = [];
  partes.push("encuadre " + r.encuadre + "/100");
  if(r.orientacion !== null) partes.push("de frente " + r.orientacion + "% del tiempo");
  if(r.postura !== null) partes.push("postura " + r.postura + "/100");
  if(r.movimiento) partes.push("movimiento " + r.movimiento);
  if(r.gestualidad) partes.push("gestualidad " + r.gestualidad);
  partes.push(r.muestras + " muestras en " + mmss(r.segundos));

  /* El texto se arma con la señal más floja, para que diga algo
     distinto según lo que de verdad pasó. */
  const frases = [];
  if(r.encuadre >= 75 && (r.orientacion === null || r.orientacion >= 70)){
    frases.push("Te mantuviste centrado en cámara y de frente la mayor parte de la práctica.");
  } else if(r.encuadre < 60){
    frases.push("El encuadre se movió bastante: quedaste descentrado, demasiado cerca o demasiado lejos. Ajusta la cámara a la altura de los ojos y déjate unos dedos de aire sobre la cabeza.");
  } else if(r.orientacion !== null && r.orientacion < 60){
    frases.push("Buena parte del tiempo la cabeza no apuntó a la cámara. Suele pasar por leer el guion en pantalla: sube las notas al borde superior, junto al lente.");
  }

  if(r.postura !== null){
    if(r.postura >= 75 && !r.repetitivo){
      frases.push("La postura se sostuvo estable y con los hombros parejos.");
    } else if(r.postura >= 75){
      frases.push("Los hombros se mantuvieron parejos, pero el cuerpo no se quedó quieto.");
    } else if(r.postura >= 50){
      frases.push("La postura se inclina o se desplaza más de lo necesario. Planta los pies y deja que el movimiento venga de las manos, no del tronco.");
    } else {
      frases.push("Hubo inclinación marcada o cambios bruscos de posición. Fija un punto de apoyo antes de empezar y vuelve a él después de cada gesto.");
    }
  }

  if(r.repetitivo){
    frases.push("Se detectó un balanceo repetitivo de lado a lado: quien escucha lo registra aunque no lo comente.");
  } else if(r.movimiento === "quieto" && r.manosPct < 25){
    frases.push("Casi no hubo movimiento ni manos a la vista. Un poco de gesto ayuda a marcar las ideas, siempre que acompañe lo que dices.");
  } else if(r.movimiento === "alto"){
    frases.push("El movimiento fue alto y continuo. Reserva el desplazamiento para los cambios de sección, no para todo el discurso.");
  }

  if(r.rostroPct < 60){
    frases.push("Solo se te detectó el rostro en el " + r.rostroPct + "% de las muestras: buena parte del tiempo estuviste fuera del cuadro o de espaldas al lente.");
  }
  if(r.cuerpoPct < 40){
    frases.push("El cuerpo apenas se vio en el cuadro, así que la lectura de postura es parcial. Aléjate un poco para que se vean los hombros.");
  }

  return {
    id:"visual", n:"Presencia visual", val: r.puntaje + "", pct: r.puntaje,
    dato: partes.join(" · "),
    txt: frases.join(" ") || "Se midió tu presencia en cámara durante la ronda."
  };
}

/* ------------------------------------------------------------
   Enganche con la interfaz. El botón vive en la consola pero la
   lógica se queda aquí: el módulo de audio no lo conoce.
   ------------------------------------------------------------ */
async function iniciarPracticaConCamara(){
  mostrarAviso("");
  /* Encender la cámara y cargar el analizador toma unos segundos.
     Se bloquean los tres botones desde ya para que nadie arranque
     una segunda ronda encima mientras tanto. prepararPractica()
     deja después el estado definitivo. */
  ["btn-camara","btn-grabar","btn-sin-mic"].forEach(id=>{
    const b = document.getElementById(id);
    if(b) b.disabled = true;
  });

  let okCamara = false;
  try{ okCamara = await iniciarCamara(); }
  catch(_){ okCamara = false; }

  let modo = "mic";
  try{
    await iniciarAudio();
  }catch(err){
    modo = "manual";
  }

  const avisos = [];
  if(!okCamara){
    avisos.push("No se pudo medir la presencia visual: " + (estado.visual.motivo || "la cámara no está disponible") + ".");
  }
  if(modo === "manual"){
    avisos.push("Tampoco se pudo usar el micrófono: escribe lo que digas en el cuadro de la derecha.");
  }
  if(avisos.length){ mostrarAviso(avisos.join(" ")); }

  prepararPractica(modo);
  if(modo === "mic"){ iniciarASR(); }
}

document.addEventListener("DOMContentLoaded", visEnlazarBoton);
visEnlazarBoton();

function visEnlazarBoton(){
  const btn = document.getElementById("btn-camara");
  if(!btn || btn.dataset.enlazado) return;
  btn.dataset.enlazado = "1";
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    btn.disabled = true;
    btn.title = "Este navegador no permite acceder a la cámara.";
    return;
  }
  btn.addEventListener("click", iniciarPracticaConCamara);
}
