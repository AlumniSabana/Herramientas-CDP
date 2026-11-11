/* Motor de presencia visual (MediaPipe Tasks Vision).
   QUÉ SALE DE AQUÍ: cinco números y dos etiquetas. QUÉ NUNCA SALE: la imagen.
   El video se procesa fotograma a fotograma en memoria; no se guarda, no se codifica
   y no se sube. Al terminar se apagan las pistas de la cámara.
   El analizador se descarga por CDN solo cuando alguien pide practicar con cámara;
   si no carga, la dimensión queda «No medida» y no afecta el puntaje. */
import { nivel } from "./analisis";
import {
  calcularPresenciaVisual, etiquetaGestualidad, etiquetaMovimiento, puntajeEncuadreMuestra, puntajePosturaMuestra,
  type MuestraCara, type MuestraCuerpo, type ResumenVisual,
} from "./visual";

// Versión fijada a propósito: un cambio en el CDN no debe alterar el comportamiento sin avisar.
const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODELO_ROSTRO = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MODELO_POSE = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const INTERVALO_MS = 100;
const INTERVALO_MAX = 260;
const YAW_MAX = 22; // «de frente» = giro de cabeza menor a esto. No es seguimiento de mirada.
const PITCH_MAX = 20;

type Punto = { x: number; y: number; visibility?: number };
type Detector<R> = { detectForVideo(v: HTMLVideoElement, t: number): R };
type ResRostro = { faceLandmarks?: Punto[][]; facialTransformationMatrixes?: { data: ArrayLike<number> }[] };
type ResPose = { landmarks?: Punto[][] };

let rostro: Detector<ResRostro> | null = null;
let pose: Detector<ResPose> | null = null;
let cargando: Promise<void> | null = null;

function cargarMotor(): Promise<void> {
  if (rostro && pose) return Promise.resolve();
  if (cargando) return cargando;
  cargando = (async () => {
    // @vite-ignore: es un módulo remoto que solo se pide al usar la cámara.
    const mod = await import(/* @vite-ignore */ CDN + "/vision_bundle.mjs");
    const fileset = await mod.FilesetResolver.forVisionTasks(CDN + "/wasm");
    const crear = async (delegate: "GPU" | "CPU") => {
      rostro = await mod.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELO_ROSTRO, delegate }, runningMode: "VIDEO", numFaces: 1,
        outputFaceBlendshapes: false, outputFacialTransformationMatrixes: true,
      });
      pose = await mod.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELO_POSE, delegate }, runningMode: "VIDEO", numPoses: 1,
      });
    };
    try {
      await crear("GPU");
    } catch {
      await crear("CPU");
    }
  })().catch((e) => {
    cargando = null;
    throw e;
  });
  return cargando;
}

const media = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export type Vivo = {
  sinRostro: boolean;
  encuadre?: number;
  orientacion?: number;
  postura?: number;
  movimiento?: string;
  gestualidad?: string;
  guiaOk: boolean;
};
export type Tono = "normal" | "viva" | "falla";

export class MotorVisual {
  usada = false;
  disponible: boolean | null = null;
  motivo = "";
  resumen: ResumenVisual | null = null;

  private stream: MediaStream | null = null;
  private raf: number | null = null;
  private activo = false;
  private video: HTMLVideoElement | null = null;
  private cara: MuestraCara[] = [];
  private cuerpo: MuestraCuerpo[] = [];
  private t0 = 0;
  private ultimo = 0;
  private intervalo = INTERVALO_MS;

  constructor(private on: { estado(t: string, tono: Tono): void; pista(t: string): void; vivo(v: Vivo): void }) {}

  /** Pide permiso, muestra la vista previa y arranca el muestreo. Devuelve true si quedó midiendo. */
  async iniciar(video: HTMLVideoElement): Promise<boolean> {
    this.cara = [];
    this.cuerpo = [];
    this.resumen = null;
    this.usada = false;
    this.video = video;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.disponible = false;
      this.motivo = "este navegador no permite acceder a la cámara";
      this.on.estado("No disponible", "falla");
      this.on.pista("Tu navegador no expone la cámara a las páginas web. Prueba con Chrome o Edge actualizados.");
      return false;
    }
    this.on.estado("Pidiendo permiso…", "normal");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
    } catch (err) {
      const n = (err as { name?: string })?.name || "error";
      this.disponible = false;
      this.motivo = n === "NotAllowedError" ? "no diste permiso de cámara" : n === "NotFoundError" ? "no se encontró ninguna cámara conectada" : `la cámara no pudo abrirse (${n})`;
      this.on.estado("Sin permiso", "falla");
      this.on.pista("La práctica sigue funcionando con micrófono. La dimensión de presencia visual quedará como «No medida».");
      return false;
    }
    video.srcObject = this.stream;
    try {
      await video.play();
    } catch {
      /* el navegador puede diferir la reproducción */
    }

    this.on.estado("Cargando el analizador…", "normal");
    this.on.pista("La primera vez tarda unos segundos: se descarga el analizador al navegador.");
    try {
      await cargarMotor();
    } catch {
      this.disponible = false;
      this.motivo = "no se pudo cargar el analizador visual (revisa la conexión)";
      this.on.estado("Analizador no disponible", "falla");
      this.on.pista("Ves la vista previa, pero sin el analizador no hay métricas. La dimensión quedará como «No medida».");
      return false;
    }
    this.disponible = true;
    this.activo = true;
    this.usada = true;
    this.intervalo = INTERVALO_MS;
    this.t0 = performance.now();
    this.ultimo = 0;
    this.on.estado("Midiendo", "viva");
    this.on.pista("Ubícate dentro del recuadro, a distancia de brazo de la cámara.");
    this.bucle();
    return true;
  }

  /** Apaga el muestreo, suelta la cámara y consolida las métricas. Idempotente. */
  detener(): ResumenVisual | null {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.activo = false;
    if (this.usada && !this.resumen) this.resumen = calcularPresenciaVisual(this.cara, this.cuerpo);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
    if (this.usada) this.on.estado(this.resumen?.medida ? "Medición terminada" : "Sin datos suficientes", this.resumen?.medida ? "normal" : "falla");
    return this.resumen;
  }

  private bucle() {
    const paso = () => {
      if (!this.activo) return;
      this.raf = requestAnimationFrame(paso);
      const ahora = performance.now();
      const v = this.video;
      if (ahora - this.ultimo < this.intervalo || !v || v.readyState < 2 || !v.videoWidth) return;
      this.ultimo = ahora;
      const t = (ahora - this.t0) / 1000;
      try {
        if (rostro) this.analizarRostro(rostro.detectForVideo(v, ahora), t);
        if (pose) this.analizarPostura(pose.detectForVideo(v, ahora), t);
      } catch {
        /* un fotograma perdido no rompe la medición */
      }
      // Si el equipo va justo, baja la cadencia en vez de trabar la página o la transcripción.
      const costo = performance.now() - ahora;
      if (costo > this.intervalo * 0.8) this.intervalo = Math.min(INTERVALO_MAX, this.intervalo + 20);
      else if (costo < this.intervalo * 0.3 && this.intervalo > INTERVALO_MS) this.intervalo = Math.max(INTERVALO_MS, this.intervalo - 10);
      this.pintarVivo();
    };
    this.raf = requestAnimationFrame(paso);
  }

  private analizarRostro(res: ResRostro, t: number) {
    const puntos = res?.faceLandmarks?.[0];
    if (!puntos?.length) {
      this.cara.push({ t, hay: false });
      return;
    }
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const p of puntos) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const ancho = maxX - minX;
    const alto = maxY - minY;
    const dentro = minX > -0.02 && maxX < 1.02 && minY > -0.02 && maxY < 1.02;

    // Hacia dónde apunta la CABEZA (no la mirada), desde la matriz de transformación facial.
    let yaw: number | null = null;
    let pitch: number | null = null;
    const m = res.facialTransformationMatrixes?.[0];
    if (m?.data && m.data.length === 16) {
      const d = m.data;
      yaw = (Math.atan2(d[8], Math.sqrt(d[9] * d[9] + d[10] * d[10])) * 180) / Math.PI;
      pitch = (Math.atan2(-d[9], d[10]) * 180) / Math.PI;
      if (!isFinite(yaw) || !isFinite(pitch)) {
        yaw = null;
        pitch = null;
      }
    }
    if (yaw === null) {
      const nariz = puntos[1];
      if (nariz && ancho > 0.001) {
        yaw = ((nariz.x - cx) / (ancho / 2)) * 45;
        pitch = 0;
      }
    }
    const deFrente = yaw !== null && Math.abs(yaw) <= YAW_MAX && Math.abs(pitch ?? 0) <= PITCH_MAX;
    this.cara.push({ t, hay: true, cx, cy, ancho, alto, dentro, yaw, pitch, deFrente });
  }

  private analizarPostura(res: ResPose, t: number) {
    const p = res?.landmarks?.[0];
    if (!p || p.length < 25) {
      this.cuerpo.push({ t, hay: false });
      return;
    }
    const vis = (i: number) => (typeof p[i]?.visibility === "number" ? (p[i].visibility as number) : 1);
    const hI = p[11], hD = p[12], cI = p[23], cD = p[24];
    if (!hI || !hD) {
      this.cuerpo.push({ t, hay: false });
      return;
    }
    const anchoHombros = Math.hypot(hI.x - hD.x, hI.y - hD.y) || 0.001;
    const inc = Math.abs((Math.atan2(hI.y - hD.y, hI.x - hD.x) * 180) / Math.PI);
    const inclinacionHombros = inc > 90 ? 180 - inc : inc;
    const simetria = Math.abs(hI.y - hD.y) / anchoHombros;
    const mH = { x: (hI.x + hD.x) / 2, y: (hI.y + hD.y) / 2 };
    let inclinacionTronco: number | null = null;
    if (cI && cD && Math.min(vis(23), vis(24)) > 0.4) {
      const mC = { x: (cI.x + cD.x) / 2, y: (cI.y + cD.y) / 2 };
      inclinacionTronco = Math.abs((Math.atan2(mC.x - mH.x, mC.y - mH.y) * 180) / Math.PI);
    }
    const manos: { x: number; y: number }[] = []; // solo si de verdad se ven
    if (vis(15) > 0.5 && p[15]) manos.push({ x: p[15].x, y: p[15].y });
    if (vis(16) > 0.5 && p[16]) manos.push({ x: p[16].x, y: p[16].y });
    this.cuerpo.push({
      t, hay: true, hombrosVisibles: Math.min(vis(11), vis(12)) > 0.5, anchoHombros, inclinacionHombros, simetria,
      inclinacionTronco, tx: mH.x, ty: mH.y, manos,
    });
  }

  /** Lectura en vivo: solo informativa, no se guarda. */
  private pintarVivo() {
    if (this.cara.length % 5 !== 0) return; // ~2 veces por segundo
    const ult = this.cara.slice(-20).filter((m) => m.hay);
    if (!ult.length) {
      this.on.vivo({ sinRostro: true, guiaOk: false });
      return;
    }
    const encuadre = Math.round(media(ult.map(puntajeEncuadreMuestra)));
    const orientacion = Math.round((ult.filter((m) => m.deFrente).length / ult.length) * 100);
    const v: Vivo = { sinRostro: false, encuadre, orientacion, guiaOk: encuadre >= 75 };
    const cuerpo = this.cuerpo.slice(-20).filter((m) => m.hay);
    if (cuerpo.length >= 4) {
      v.postura = Math.round(media(cuerpo.map(puntajePosturaMuestra)));
      v.movimiento = etiquetaMovimiento(cuerpo).etiqueta;
      v.gestualidad = etiquetaGestualidad(cuerpo).etiqueta;
    }
    this.on.vivo(v);
  }
}

export const tonoNivel = (n: number | undefined) => (n == null ? "normal" : nivel(n));
