import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Alert, Button, Card, cx } from "@/components/ui";
import { analizar, construirRonda, mmss, nivel, palabras, seccionesConTiempo, type Modo } from "./analisis";
import { MotorVisual, type Tono, type Vivo } from "./camara";
import { TIPOS } from "./contenido";
import { guardarRonda } from "./datos";
import { usePitch } from "./PitchContext";
import { TONO_TEXTO } from "./piezas";

/* Reconocimiento de voz del navegador: tipos mínimos, porque no están en lib.dom. */
type SRResultado = { isFinal: boolean; 0: { transcript: string } };
type SREvento = { resultIndex: number; results: ArrayLike<SRResultado> };
type SR = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: SREvento) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
};
type ConstructorSR = new () => SR;

const CIRC = 2 * Math.PI * 88;
const BARRAS = 21;
type Fase = "espera" | "iniciando" | "grabando" | "texto";

export default function Practica() {
  const { tipo, duracion, notas, setReporte, historial, recargarHistorial } = usePitch();
  const { perfil } = useAuth();
  const navegar = useNavigate();

  const [fase, setFase] = useState<Fase>("espera");
  const [modo, setModo] = useState<Modo>("mic");
  const [seg, setSeg] = useState(0);
  const [finalTxt, setFinalTxt] = useState("");
  const [interino, setInterino] = useState("");
  const [manual, setManual] = useState("");
  const [aviso, setAviso] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cam, setCam] = useState<{ visible: boolean; estado: string; tono: Tono; pista: string; vivo: Vivo | null }>({
    visible: false, estado: "En espera", tono: "normal", pista: "Ubícate dentro del recuadro, a distancia de brazo de la cámara.", vivo: null,
  });

  // Todo lo mutable que no necesita repintar vive en refs; los temporizadores leen siempre lo último.
  const faseRef = useRef<Fase>("espera");
  const segRef = useRef(0);
  const inicio = useRef(0);
  const tick = useRef<number | null>(null);
  const rafVu = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const grabador = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const analizador = useRef<AnalyserNode | null>(null);
  const reconocedor = useRef<SR | null>(null);
  const asrActiva = useRef(false);
  const finalRef = useRef("");
  const interinoRef = useRef("");
  const barras = useRef<(HTMLDivElement | null)[]>([]);
  const video = useRef<HTMLVideoElement | null>(null);
  const motor = useRef<MotorVisual | null>(null);
  const urlRef = useRef<string | null>(null);
  const ultimo = useRef({ tipo, duracion, modo, manual, perfil, historial });
  ultimo.current = { tipo, duracion, modo, manual, perfil, historial };

  const cambiarFase = (f: Fase) => {
    faseRef.current = f;
    setFase(f);
  };

  if (!motor.current) {
    motor.current = new MotorVisual({
      estado: (estado, tono) => setCam((c) => ({ ...c, estado, tono })),
      pista: (pista) => setCam((c) => ({ ...c, pista })),
      vivo: (vivo) => setCam((c) => ({ ...c, vivo })),
    });
  }

  /* ── Audio: nivel de voz en vivo y grabación local ── */
  const liberarMedios = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (audioCtx.current && audioCtx.current.state !== "closed") void audioCtx.current.close().catch(() => {});
    audioCtx.current = null;
    analizador.current = null;
    grabador.current = null;
  }, []);

  const medirVoz = useCallback(() => {
    const buf = new Float32Array(analizador.current?.fftSize ?? 1024);
    const centro = (BARRAS - 1) / 2;
    const paso = () => {
      const an = analizador.current;
      if (!an) return;
      an.getFloatTimeDomainData(buf);
      let suma = 0;
      for (let i = 0; i < buf.length; i++) suma += buf[i] * buf[i];
      const nv = Math.min(1, Math.sqrt(suma / buf.length) * 11);
      barras.current.forEach((b, i) => {
        if (!b) return;
        const alto = Math.max(0.12, nv * (1 - (Math.abs(i - centro) / centro) * 0.6));
        b.style.height = (alto * 100).toFixed(1) + "%";
        b.style.opacity = alto > 0.18 ? "1" : "0.45";
      });
      rafVu.current = requestAnimationFrame(paso);
    };
    paso();
  }, []);

  const iniciarAudio = useCallback(async () => {
    stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx.current = new Ctx();
    if (audioCtx.current.state === "suspended") await audioCtx.current.resume().catch(() => {});
    const fuente = audioCtx.current.createMediaStreamSource(stream.current);
    analizador.current = audioCtx.current.createAnalyser();
    analizador.current.fftSize = 1024;
    analizador.current.smoothingTimeConstant = 0.5;
    fuente.connect(analizador.current);

    trozos.current = [];
    try {
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported(m));
      grabador.current = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
      grabador.current.ondataavailable = (e) => e.data?.size && trozos.current.push(e.data);
      grabador.current.start();
    } catch {
      grabador.current = null;
    }
    medirVoz();
  }, [medirVoz]);

  const detenerAudio = useCallback(() => {
    if (rafVu.current) cancelAnimationFrame(rafVu.current);
    rafVu.current = null;
    barras.current.forEach((b) => b && ((b.style.height = "12%"), (b.style.opacity = "0.45")));
    const g = grabador.current;
    if (g && g.state !== "inactive") {
      g.onstop = () => {
        if (trozos.current.length) {
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          // Solo para escucharte aquí mismo: este audio no se envía ni se guarda.
          urlRef.current = URL.createObjectURL(new Blob(trozos.current, { type: trozos.current[0].type || "audio/webm" }));
          setAudioUrl(urlRef.current);
        }
        liberarMedios();
      };
      try {
        g.stop();
      } catch {
        liberarMedios();
      }
    } else {
      liberarMedios();
    }
  }, [liberarMedios]);

  /* ── Reconocimiento de voz ── */
  const iniciarASR = useCallback(() => {
    const W = window as unknown as { SpeechRecognition?: ConstructorSR; webkitSpeechRecognition?: ConstructorSR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      setAviso("Tu navegador no ofrece transcripción automática. El cronómetro y la guía de ritmo funcionan igual; al terminar podrás escribir lo que dijiste para completar el análisis.");
      return;
    }
    const r = new Ctor();
    r.lang = "es-CO";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += txt + " ";
        else parcial += txt;
      }
      interinoRef.current = parcial;
      setFinalTxt(finalRef.current);
      setInterino(parcial);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setAviso("El navegador bloqueó la transcripción automática. La práctica sigue con cronómetro y guía de ritmo; al terminar podrás escribir tu texto.");
        asrActiva.current = false;
      } else if (e.error === "no-speech") {
        setAviso("No se detecta voz. Acércate al micrófono o revisa el dispositivo de entrada.");
      } else if (e.error === "network") {
        setAviso("La transcripción automática necesita conexión a internet.");
        asrActiva.current = false;
      }
    };
    r.onend = () => {
      if (faseRef.current === "grabando" && asrActiva.current) {
        try { r.start(); } catch { /* ya estaba en marcha */ }
      }
    };
    reconocedor.current = r;
    try {
      r.start();
      asrActiva.current = true;
    } catch {
      asrActiva.current = false;
    }
  }, []);

  const detenerASR = useCallback(() => {
    asrActiva.current = false;
    const r = reconocedor.current;
    if (r) {
      try { r.onend = null; r.stop(); } catch { /* ya detenido */ }
      reconocedor.current = null;
    }
    finalRef.current = (finalRef.current + " " + interinoRef.current).replace(/\s+/g, " ").trim();
    interinoRef.current = "";
    setFinalTxt(finalRef.current);
    setInterino("");
  }, []);

  /* ── Control de la práctica ── */
  const terminar = useCallback(async () => {
    const f = faseRef.current;
    if (f !== "grabando" && f !== "texto") return;
    const L = ultimo.current;
    const eraTexto = f === "texto";
    let modoFinal: Modo = L.modo;
    let segundos = segRef.current;

    if (!eraTexto) {
      if (tick.current) clearInterval(tick.current);
      tick.current = null;
      segundos = (performance.now() - inicio.current) / 1000;
      segRef.current = segundos;
      setSeg(segundos);
      if (L.modo === "mic") {
        detenerASR();
        detenerAudio();
      }
      motor.current?.detener(); // apaga la cámara y consolida las métricas
    }

    const texto = (L.modo === "mic" && !eraTexto ? finalRef.current : L.manual).trim();

    if (!palabras(texto).length) {
      // Sin texto no hay nada que analizar: se pide a mano, sin reiniciar el reloj.
      setAviso("No quedó texto para analizar. Escribe lo que dijiste en el cuadro de la derecha y vuelve a presionar «Terminar y analizar».");
      setModo("manual");
      cambiarFase("texto");
      return;
    }
    if (eraTexto) modoFinal = "manual";

    const m = motor.current!;
    const res = analizar({
      texto, segundos, tipo: L.tipo, duracion: L.duracion, modo: modoFinal,
      visual: m.resumen, camaraUsada: m.usada, motivoCamara: m.motivo,
    });
    cambiarFase("espera");
    setAviso("");
    setReporte({ res, idGuardado: null, obs: null });
    navegar("/pitch/reporte");

    // Sin cuenta no se guarda nada, en ninguna parte.
    const p = L.perfil;
    if (!p) return;
    try {
      const g = await guardarRonda(p.id, construirRonda(res));
      setReporte((r) => (r && r.res === res ? { ...r, idGuardado: g.id } : r));
      void recargarHistorial();
    } catch (e) {
      setReporte((r) => (r && r.res === res ? { ...r, errorGuardado: "No se pudo guardar: " + (e instanceof Error ? e.message : "error desconocido") } : r));
    }
  }, [detenerASR, detenerAudio, navegar, recargarHistorial, setReporte]);

  const prepararPractica = useCallback((m: Modo) => {
    setModo(m);
    segRef.current = 0;
    setSeg(0);
    finalRef.current = "";
    interinoRef.current = "";
    setFinalTxt("");
    setInterino("");
    setManual("");
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setAudioUrl(null);
    inicio.current = performance.now();
    cambiarFase("grabando");
    tick.current = window.setInterval(() => {
      segRef.current = (performance.now() - inicio.current) / 1000;
      setSeg(segRef.current);
      if (segRef.current > ultimo.current.duracion * 2) void terminar();
    }, 200);
  }, [terminar]);

  const iniciar = async (m: Modo, conCamara: boolean) => {
    if (faseRef.current !== "espera") return;
    setAviso("");
    cambiarFase("iniciando");
    let okCamara = true;
    let modoReal: Modo = m;
    const avisos: string[] = [];

    if (conCamara) {
      setCam((c) => ({ ...c, visible: true, vivo: null }));
      try {
        okCamara = await motor.current!.iniciar(video.current!);
      } catch {
        okCamara = false;
      }
      if (!okCamara) avisos.push("No se pudo medir la presencia visual: " + (motor.current!.motivo || "la cámara no está disponible") + ".");
    }
    if (m === "mic") {
      try {
        await iniciarAudio();
      } catch (e) {
        if (!conCamara) {
          setAviso("No se pudo acceder al micrófono (" + ((e as { name?: string })?.name ?? "error") + "). Puedes usar «Practicar sin micrófono».");
          cambiarFase("espera");
          return;
        }
        modoReal = "manual";
        avisos.push("Tampoco se pudo usar el micrófono: escribe lo que digas en el cuadro de la derecha.");
      }
    }
    if (avisos.length) setAviso(avisos.join(" "));
    prepararPractica(modoReal);
    if (modoReal === "mic") iniciarASR();
  };

  // Al salir de la página se apaga todo: micrófono, cámara, reconocimiento y temporizadores.
  useEffect(() => {
    const m = motor.current;
    return () => {
      if (tick.current) clearInterval(tick.current);
      if (rafVu.current) cancelAnimationFrame(rafVu.current);
      asrActiva.current = false;
      try { reconocedor.current?.stop(); } catch { /* ya detenido */ }
      try { if (grabador.current && grabador.current.state !== "inactive") grabador.current.stop(); } catch { /* ya detenido */ }
      liberarMedios();
      m?.detener();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [liberarMedios]);

  /* ── Presentación ── */
  const t = TIPOS[tipo];
  const secciones = seccionesConTiempo(tipo, duracion);
  const enCurso = fase === "grabando";
  const ocupada = fase !== "espera";
  const excedido = seg > duracion;
  const restante = duracion - seg;
  const estadoReloj = !enCurso ? "" : excedido ? `+${mmss(seg - duracion)} de más` : restante <= 15 ? "Cierra ya" : restante <= 30 ? "Últimos 30 s" : modo === "mic" ? "Grabando" : "En curso";
  const escribiendo = modo === "manual" && (fase === "grabando" || fase === "texto");
  const nPal = palabras(escribiendo ? manual : finalTxt + " " + interino).length;
  const v = cam.vivo;

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Roleplay controlado</p>
        <h2 className="text-3xl">Habla como si estuvieran al frente</h2>
        <p className="mt-3 text-slate-600">Cuando presiones iniciar, empieza a hablar. La guía de la derecha te muestra en qué sección deberías estar según el reloj — úsala de reojo, no la leas.</p>
        <Alert className="mt-6">
          Tu audio se graba y se analiza en tu navegador, y no se almacena. Ten en cuenta que la <strong>transcripción automática</strong> la hace el servicio de voz de Chrome o Edge, lo que implica enviar tu voz a Google o Microsoft para convertirla en texto. Para que tu voz no salga de tu equipo, usa «Practicar sin micrófono» y escribe lo que dijiste.
        </Alert>
      </div>

      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
        {/* ───── Consola ───── */}
        <div className="h-fit rounded-2xl bg-gradient-to-b from-brand-900 to-brand-950 p-6 text-white shadow-lift sm:p-8 lg:sticky lg:top-40">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold">{t.corto}</span>
            <span className="text-sm tabular-nums text-brand-300">{mmss(duracion)}</span>
          </div>

          <div className="relative mx-auto mt-6 size-52">
            <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="100" cy="100" r="88" fill="none" strokeWidth="8" className="stroke-white/15" />
              <circle
                cx="100" cy="100" r="88" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC}
                style={{ strokeDashoffset: CIRC * (1 - Math.min(1, seg / duracion)) }}
                className={cx("transition-[stroke-dashoffset] duration-200", excedido ? "stroke-rose-400" : "stroke-brand-300")}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p role="timer" className={cx("text-5xl font-semibold tabular-nums", excedido && "text-rose-300")}>{mmss(seg)}</p>
              <p className="mt-1 text-xs text-brand-300">objetivo {mmss(duracion)}</p>
              <p aria-live="polite" className="mt-1 h-4 text-xs font-semibold text-brand-100">{estadoReloj}</p>
            </div>
          </div>

          <div className="mx-auto mt-6 flex h-12 items-center justify-center gap-1" aria-hidden="true">
            {Array.from({ length: BARRAS }, (_, i) => (
              <div key={i} ref={(el) => { barras.current[i] = el; }} style={{ height: "12%", opacity: 0.45 }} className="w-1.5 rounded-full bg-brand-300 transition-[height] duration-75" />
            ))}
          </div>

          <div className="mt-6 grid gap-3">
            <Button variant="onDark" size="lg" disabled={ocupada} onClick={() => void iniciar("mic", false)}>● Iniciar práctica</Button>
            <Button variant="danger" size="lg" disabled={!enCurso && fase !== "texto"} onClick={() => void terminar()}>■ Terminar y analizar</Button>
            <button
              disabled={ocupada || !navigator.mediaDevices?.getUserMedia}
              onClick={() => void iniciar("mic", true)}
              className="h-11 rounded-lg border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
            >
              ▣ Practicar con cámara
            </button>
            <button
              disabled={ocupada}
              onClick={() => void iniciar("manual", false)}
              className="h-11 rounded-lg border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
            >
              Practicar sin micrófono
            </button>
          </div>
          {aviso && <p role="alert" className="mt-5 rounded-lg bg-amber-400/15 px-4 py-3 text-sm text-amber-100">{aviso}</p>}
        </div>

        {/* ───── Guía, cámara y transcripción ───── */}
        <div className="space-y-8">
          <Card className={cx(!cam.visible && "hidden")}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg">Presencia visual</h3>
              <span className={cx("rounded-full px-3 py-1 text-xs font-semibold", cam.tono === "viva" ? "bg-emerald-100 text-emerald-800" : cam.tono === "falla" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700")}>{cam.estado}</span>
            </div>
            <div className="mt-5 grid gap-6 sm:grid-cols-[14rem_1fr]">
              <div className={cx("relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-900 ring-2", v?.guiaOk ? "ring-emerald-500" : "ring-transparent")}>
                <video ref={video} playsInline muted autoPlay className="size-full -scale-x-100 object-cover" />
                {!cam.estado.startsWith("Midiendo") && !cam.estado.startsWith("Cargando") && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Sin señal de cámara</span>
                )}
              </div>
              <dl className="space-y-2 text-sm">
                {([
                  ["Encuadre", v?.sinRostro ? "sin rostro" : v?.encuadre != null ? v.encuadre + "/100" : "—", v?.encuadre],
                  ["Orientación a cámara", v?.orientacion != null ? v.orientacion + "%" : "—", v?.orientacion],
                  ["Postura", v?.postura != null ? v.postura + "/100" : "—", v?.postura],
                  ["Movimiento corporal", v?.movimiento ?? "—", undefined],
                  ["Gestualidad", v?.gestualidad ?? "—", undefined],
                ] as [string, string, number | undefined][]).map(([k, val, n]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className={cx("font-semibold", n != null ? TONO_TEXTO[nivel(n)] : v?.sinRostro && k === "Encuadre" ? "text-rose-700" : "text-brand-900")}>{val}</dd>
                  </div>
                ))}
                <p className="pt-1 text-xs text-slate-500">{cam.pista}</p>
              </dl>
            </div>
            <p className="mt-5 rounded-lg bg-brand-50 px-4 py-3 text-xs text-brand-900">
              El análisis visual ocurre dentro de tu navegador. La cámara no se graba, no se almacena y ningún video sale de tu dispositivo. Solo se conservan métricas agregadas si tienes una cuenta.
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg">Guía de ritmo</h3>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{enCurso ? "En curso" : fase === "texto" ? "Terminada" : "En espera"}</span>
            </div>
            <ol className="mt-5 space-y-2">
              {secciones.map((s) => {
                const activa = enCurso && seg >= s.desde && seg < s.hasta;
                const pasada = enCurso && seg >= s.hasta;
                return (
                  <li key={s.id} className={cx("flex items-center gap-4 rounded-lg px-4 py-3 text-sm transition-colors", activa ? "bg-brand-900 text-white" : pasada ? "text-slate-400 line-through" : "bg-slate-50 text-slate-700")}>
                    <span className="w-10 font-semibold tabular-nums">{mmss(s.desde)}</span>
                    <span className="flex-1">{s.n}</span>
                    {activa && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">Ahora</span>}
                  </li>
                );
              })}
            </ol>
            {notas.trim() && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Tus notas</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{notas}</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg">{escribiendo ? (fase === "texto" ? "Escribe lo que dijiste" : "Escribe lo que vas diciendo") : "Transcripción en vivo"}</h3>
              <span className="text-xs tabular-nums text-slate-500">{nPal} {nPal === 1 ? "palabra" : "palabras"}</span>
            </div>
            {escribiendo ? (
              <>
                <label htmlFor="texto-manual" className="sr-only">Lo que dijiste</label>
                <textarea
                  id="texto-manual"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  autoFocus
                  rows={8}
                  placeholder="Escribe o pega aquí lo que dijiste. El análisis de estructura, muletillas y concreción funciona igual con texto escrito."
                  className="mt-4 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                />
                <p className="mt-3 text-xs text-slate-500">Tu voz no sale de tu equipo. Habla en voz alta contra el reloj y escribe aquí lo que dijiste; puedes completarlo al terminar.</p>
              </>
            ) : (
              <div aria-live="off" className="mt-4 min-h-40 whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-800">
                {finalTxt || interino ? (
                  <>
                    {finalTxt}
                    <span className="text-slate-400">{interino}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Tu discurso aparecerá aquí mientras hablas.</span>
                )}
              </div>
            )}
            {audioUrl && (
              <div className="mt-5">
                <p className="mb-2 text-xs text-slate-500">Escúchate: este audio solo existe en esta pestaña y no se envía ni se guarda.</p>
                <audio src={audioUrl} controls className="w-full" />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
