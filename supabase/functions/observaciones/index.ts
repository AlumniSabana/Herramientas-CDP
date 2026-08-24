// ============================================================
// Edge Function: observaciones
// Estudio de Pitch — Alumni Sabana
//
// Recibe una ronda de práctica y devuelve observaciones escritas
// por el modelo. La clave de la API vive en los secretos del
// proyecto: nunca llega al navegador.
//
// Desplegar:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy observaciones
// ============================================================

const MODELO = "claude-sonnet-4-5";
const MAX_TOKENS = 1100;
const TIEMPO_LIMITE_MS = 25000;

// Tope de observaciones por persona y por día. Cada llamada cuesta
// dinero, así que esto evita que un clic repetido dispare la factura.
// Ponlo en 0 para quitar el tope.
const TOPE_DIARIO = 20;

const CRITERIOS = `CRITERIOS DE EVALUACIÓN (metodología SENA 2018 y literatura del CDP)

Qué dice — contenido:
1. Claridad del problema: ¿identifica con precisión la necesidad o el dolor, y deja evidente por qué importa?
2. Pertinencia de la solución: ¿responde de forma directa y lógica al problema planteado?
3. Propuesta de valor e innovación: ¿qué tan diferenciada es frente a las alternativas? ¿qué aporta de distinto?
4. Viabilidad técnica y metodológica: ¿hay ruta de implementación realista y coherencia entre lo prometido y lo posible?
5. Viabilidad del modelo de negocio: ¿la forma de generar ingresos es lógica y sostenible? (solo en emprendimiento y comercial)
6. Conocimiento del mercado: ¿entiende su público objetivo, el contexto y la oportunidad?
7. Impacto esperado: ¿qué beneficios concretos genera la propuesta?

Cómo lo dice — forma:
8. Calidad de la presentación y persuasión: ¿comunica de forma convincente y sostiene el interés?
9. Claridad y estructura del discurso: ¿sigue la secuencia apertura, problema, solución, evidencia, cierre?
10. Comunicación oral: seguridad y fluidez que se dejan ver en la transcripción.
11. Manejo del tiempo: ¿se ajustó al formato asignado?
12. Capacidad de respuesta: no se puede evaluar aquí; omitir.
13. Uso de recursos de apoyo: no se puede evaluar aquí; omitir.`;

const INSTRUCCIONES = `Eres asesor del Centro de Desarrollo Profesional de la Universidad de La Sabana.

Recibes: las métricas medidas de una ronda de práctica de pitch, la transcripción literal de lo que la persona dijo, su programa académico, el escenario del pitch y el historial de sus rondas anteriores si las tiene.

Las métricas ya miden la ENTREGA (duración, ritmo, muletillas, cobertura de estructura, concreción, cierre, presencia visual). Tu trabajo es distinto y complementario: evaluar el CONTENIDO de lo que dijo, usando los criterios de abajo.

${CRITERIOS}

Escribe en español de Colombia, dirigiéndote a la persona de tú, entre 220 y 320 palabras, en 5 o 6 párrafos. Cada párrafo abre con un rótulo corto en negrita (por ejemplo **Claridad del problema.**).

Reglas:
- ELIGE los 4 o 5 criterios más pertinentes para este escenario y esta transcripción. No los recorras todos ni los enumeres: escribe párrafos, no una lista.
- Omite los criterios que no apliquen. En un pitch de empleo no se evalúa modelo de negocio; en uno académico, el criterio de mercado se traduce en relevancia del hallazgo.
- CITA LA TRANSCRIPCIÓN. Menciona al menos dos frases o expresiones concretas que la persona dijo, entre comillas angulares, y explica por qué funcionan o qué cambiarías. Esto es lo que hace que el análisis sea suyo y no de cualquiera.
- Sé concreto y accionable. Cuando señales un vacío, di exactamente qué frase agregar o cómo reformular.
- PERSONALIZA con el programa académico: los ejemplos y el vocabulario de alguien de Medicina no son los de alguien de Ingeniería o Comunicación.
- SI HAY HISTORIAL: compara con las rondas anteriores y di qué mejoró y qué sigue igual. Si es la primera, dilo y establece la línea de base.
- Cierra con un párrafo **Lo siguiente.** con una sola instrucción ejecutable para la próxima ronda.
- No inventes datos que no estén en la entrada. Si la transcripción es muy corta o incoherente, dilo con franqueza en vez de rellenar.
- No emites calificación ni concepto académico: esto es práctica de comunicación, no una evaluación oficial.
- PRESENCIA VISUAL: si «presencia_visual» viene con datos, la persona practicó con cámara y esas cifras salieron de un análisis hecho en su propio navegador. Puedes comentarlas en una o dos frases dentro del párrafo de presentación y persuasión, siempre ligadas a lo que dijo. Habla de «orientación de la cabeza hacia la cámara», nunca de mirada ni de contacto visual: no se mide eso. Si «presencia_visual» es null, no la menciones ni la eches en falta.
- No uses listas ni viñetas. No saludes ni te despidas. No uses el nombre de la persona más de una vez.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });

// Identidad de quien llama, leída del JWT. Supabase ya validó la firma
// antes de que la petición llegue aquí: esto solo lee el contenido.
function usuarioDelToken(auth: string | null): string | null {
  try {
    const t = (auth || "").replace(/^Bearer\s+/i, "");
    const p = t.split(".")[1];
    if (!p) return null;
    const s = atob(p.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((p.length + 3) % 4));
    const d = JSON.parse(s);
    return typeof d?.sub === "string" ? d.sub : null;
  } catch {
    return null;
  }
}

// Cuántas observaciones lleva hoy esta persona. Si la consulta falla por
// lo que sea, devuelve -1 y la petición se deja pasar: el tope es una
// red de seguridad de costos, no un control de acceso.
async function usadasHoy(auth: string, usuario: string): Promise<number> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!url || !anon || !usuario) return -1;
    const desde = new Date().toISOString().slice(0, 10) + "T00:00:00Z";
    const r = await fetch(
      `${url}/rest/v1/rondas?select=id&usuario_id=eq.${usuario}` +
        `&creada_en=gte.${desde}&observaciones=not.is.null`,
      { headers: { apikey: anon, Authorization: auth, Prefer: "count=exact", Range: "0-0" } },
    );
    if (!r.ok) return -1;
    const rango = r.headers.get("content-range") || "";
    const n = parseInt(rango.split("/")[1] || "", 10);
    return isNaN(n) ? -1 : n;
  } catch {
    return -1;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  // Solo personas con sesión iniciada. El JWT lo valida Supabase antes
  // de llegar aquí si la función NO está marcada como pública.
  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) {
    return json({ error: "Requiere sesión iniciada." }, 401);
  }

  const clave = Deno.env.get("ANTHROPIC_API_KEY");

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo de la petición inválido." }, 400);
  }

  // Sonda de diagnóstico: contesta sin llamar al modelo, para que el
  // panel de administración pueda comprobar el despliegue sin gastar.
  if (cuerpo?.diagnostico === true) {
    return json({
      ok: true,
      desplegada: true,
      clave_cargada: !!clave,
      modelo: MODELO,
      tope_diario: TOPE_DIARIO,
      version: "1.2",
    });
  }

  if (!clave) return json({ error: "El servicio de IA no está configurado." }, 503);

  if (TOPE_DIARIO > 0) {
    const usadas = await usadasHoy(autorizacion, usuarioDelToken(autorizacion) || "");
    if (usadas >= TOPE_DIARIO) {
      return json({
        error: `Llegaste al tope de ${TOPE_DIARIO} observaciones por día. ` +
          `Vuelve mañana: el análisis de tus cifras y tu reporte siguen disponibles.`,
      }, 429);
    }
  }
  const ronda = (cuerpo?.ronda ?? cuerpo) as Record<string, unknown>;
  if (!ronda || typeof ronda !== "object") {
    return json({ error: "Falta la ronda a analizar." }, 400);
  }
  const persona = (cuerpo?.persona ?? {}) as Record<string, unknown>;
  const historial = Array.isArray(cuerpo?.historial) ? cuerpo.historial.slice(0, 5) : [];

  // Recorte defensivo: no enviamos más de lo necesario.
  const entrada = {
    persona: {
      nombre: String(persona.nombre ?? "").slice(0, 80),
      facultad: String(persona.facultad ?? "").slice(0, 120),
      programa: String(persona.programa ?? "").slice(0, 120),
    },
    ronda_numero: cuerpo?.ronda_numero ?? 1,
    escenario: ronda.tipo_nombre,
    formato_segundos: ronda.duracion_objetivo,
    duracion_real_segundos: ronda.duracion_real,
    modo: ronda.modo,
    puntaje: ronda.puntaje,
    palabras: ronda.palabras,
    palabras_por_minuto: ronda.ppm,
    muletillas_total: ronda.muletillas_total,
    muletillas_frecuentes: ronda.muletillas_top,
    secciones_cubiertas: ronda.secciones_cubiertas,
    secciones_totales: ronda.secciones_total,
    dimensiones: ronda.dimensiones,
    // Métricas de presencia visual, si practicó con cámara. Son cifras
    // agregadas: aquí no llega ninguna imagen ni fotograma.
    presencia_visual: (ronda.visual && (ronda.visual as Record<string, unknown>).medida)
      ? ronda.visual
      : null,
    rondas_anteriores: historial,
    transcripcion: String(ronda.transcripcion ?? "").slice(0, 20000),
  };

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: control.signal,
      headers: {
        "x-api-key": clave,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        system: INSTRUCCIONES,
        messages: [{ role: "user", content: JSON.stringify(entrada) }],
      }),
    });

    if (!r.ok) {
      const detalle = await r.text();
      console.error("Error del proveedor:", r.status, detalle.slice(0, 500));
      // No exponemos el detalle: podría incluir información del proveedor.
      return json({ error: "El servicio de IA no respondió correctamente." }, 502);
    }

    const d = await r.json();
    const texto = d?.content?.[0]?.text;
    if (!texto) return json({ error: "El servicio de IA devolvió una respuesta vacía." }, 502);

    // Útil para presupuestar consumo. No registramos la transcripción.
    console.log("tokens", JSON.stringify(d?.usage ?? {}));

    return json({ texto });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return json({ error: "El servicio de IA tardó demasiado. Intenta de nuevo." }, 504);
    }
    console.error(e);
    return json({ error: "No se pudo generar las observaciones." }, 500);
  } finally {
    clearTimeout(temporizador);
  }
});
