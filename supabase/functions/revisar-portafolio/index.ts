/* ══════════════════════════════════════════════════════════════
   REVISAR-PORTAFOLIO  ·  Edge Function de Supabase
   --------------------------------------------------------------
   Lee el portafolio que ha escrito el estudiante y le devuelve una
   revisión antes de publicarlo.

   QUÉ HACE Y QUÉ NO HACE
   Devuelve observaciones y preguntas. No devuelve texto redactado.
   Es una decisión de diseño, no una limitación técnica: si el
   modelo escribe las fichas, el estudiante llega a la entrevista
   con un portafolio que no puede defender, y eso es peor que un
   portafolio flojo. La herramienta entera está construida sobre esa
   idea, y esta función tiene que cumplirla igual que las demás.

   POR QUÉ EMPIEZA POR LOS PROYECTOS
   Las fichas de proyecto son el 70 % de un portafolio y son donde
   se cae: contexto sin cifras, rol difuso, resultado que no dice
   qué cambió. Revisar primero el perfil y dejar las fichas al final
   es revisar la portada de un libro sin abrirlo.

   DESPLIEGUE
     supabase secrets set GEMINI_API_KEY=...
     supabase functions deploy revisar-portafolio
   ══════════════════════════════════════════════════════════════ */

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODELO = Deno.env.get("GEMINI_MODELO") ?? "gemini-3.7-flash";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

/* Un portafolio con diez fichas largas ronda los 15.000 caracteres.
   El tope deja margen de sobra y evita que una pegada accidental
   consuma el cupo de golpe. */
const MAX_CARACTERES = 40000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function quienLlama(req: Request): Promise<string | null> {
  const cab = req.headers.get("Authorization") ?? "";
  if (!cab.toLowerCase().startsWith("bearer ")) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: cab, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ?? null;
  } catch {
    return null;
  }
}

const INSTRUCCION = `Eres asesor de empleabilidad del Centro de Desarrollo Profesional de la Universidad de La Sabana. Revisas el portafolio de un estudiante o egresado antes de que lo publique.

QUÉ DEVUELVES
Observaciones y preguntas concretas. NUNCA texto redactado para que lo copie.
Si una ficha está floja, no la reescribes: señalas exactamente qué falta y preguntas lo que el estudiante tendría que responder para arreglarla. Él escribe, tú revisas.

REGLAS INNEGOCIABLES
1. No inventes cifras, logros, herramientas ni experiencia. Si falta un dato, pregúntalo.
2. No sugieras exagerar. Un resultado cualitativo verificable vale más que un porcentaje inventado.
3. Cita las palabras del estudiante cuando señales un problema, entre comillas y textuales, para que sepa a qué te refieres.
4. Si algo está bien, dilo en una línea y sigue. No rellenes.
5. Máximo tres observaciones por ficha y tres por sección. Prefiere la más grave.
6. Habla de tú, en español de Colombia, directo y sin adornos. Nada de "¡excelente trabajo!" ni felicitaciones vacías.
7. No uses rayas ni guiones largos. Usa comas, dos puntos o paréntesis.

DÓNDE MIRAR EN CADA FICHA DE PROYECTO
- Contexto: ¿se entiende qué existía antes, sin conocer la empresa?
- Rol: ¿dice qué hizo ÉL, o describe lo que hizo el equipo? "Apoyé", "participé" y "colaboré" casi nunca son un rol.
- Acciones: ¿hay una decisión con alternativas descartadas, o solo una lista de tareas?
- Resultado: ¿dice qué cambió? Si no hay cifra, ¿hay un hecho verificable (se implementó, se aprobó, se publicó, se presentó)?
- Evidencia: ¿es algo que el lector pueda abrir o comprobar?
- Coherencia: ¿el resultado se sigue de las acciones que describe?

DÓNDE MIRAR EN EL RESTO
- Propuesta de valor: ¿se entiende en diez segundos a qué se dedica y para quién?
- Perfil: ¿son capacidades demostrables o adjetivos? "Proactivo" y "trabajo en equipo" no son capacidades.
- Impacto: ¿son logros transversales o repiten lo que ya está en las fichas?
- Contacto: ¿hay al menos un canal profesional que funcione?
- Confidencialidad: si menciona datos de una empresa, un paciente o un cliente, avísalo.

FORMATO DE SALIDA
Devuelve SOLO un objeto JSON válido, sin bloques de código ni texto alrededor:

{
  "veredicto": "Una frase sobre en qué estado está el portafolio.",
  "listo": false,
  "proyectos": [
    {"ficha": 1, "titulo": "el título que escribió", "estado": "solido|mejorable|insuficiente",
     "observaciones": ["...", "..."]}
  ],
  "secciones": [
    {"nombre": "Perfil profesional", "estado": "solido|mejorable|insuficiente",
     "observaciones": ["..."]}
  ],
  "prioridad": "Lo único que arreglaría primero si solo tuviera tiempo para una cosa."
}

"listo" es true solo si el portafolio se puede publicar tal como está.
Los nombres de sección posibles son: Identidad, Perfil profesional, Impacto, Contacto.
Si una sección está vacía, dilo en una observación en vez de omitirla.`;

function textoDeRespuesta(d: any): string {
  const pasos = d?.steps;
  if (Array.isArray(pasos)) {
    const trozos: string[] = [];
    for (const paso of pasos) {
      for (const c of paso?.content ?? []) {
        if (c?.type === "text" && typeof c.text === "string") trozos.push(c.text);
      }
    }
    if (trozos.length) return trozos.join("");
  }
  return d?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
}

/* El modelo casi siempre devuelve JSON limpio, pero de vez en cuando
   lo envuelve en un bloque de código o le antepone una frase. Antes
   de rendirse conviene recortar hasta las llaves. */
function comoJSON(t: string): any | null {
  const limpio = t.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(limpio);
  } catch { /* seguimos intentando */ }
  const i = limpio.indexOf("{"), f = limpio.lastIndexOf("}");
  if (i >= 0 && f > i) {
    try { return JSON.parse(limpio.slice(i, f + 1)); } catch { /* nada */ }
  }
  return null;
}

/* Arma lo que ve el modelo. Los proyectos van primero y numerados,
   para que pueda referirse a "la ficha 2" y el estudiante sepa cuál. */
function armarEntrada(b: any): string {
  const p: string[] = [];
  const c = b?.contexto ?? {};

  p.push("CONTEXTO DE LA PERSONA");
  p.push(`Programa: ${c.programa || "sin especificar"}`);
  p.push(`Área: ${c.area || "sin especificar"}`);
  p.push(`Etapa: ${c.etapa || "sin especificar"}`);
  p.push(`Objetivo del portafolio: ${c.objetivo || "sin especificar"}`);
  if (c.audiencia) p.push(`Quién lo va a leer: ${c.audiencia}`);
  if (c.aviso) p.push(`Advertencia de confidencialidad de su disciplina: ${c.aviso}`);
  p.push("");

  const proyectos: any[] = Array.isArray(b?.proyectos) ? b.proyectos : [];
  p.push(`FICHAS DE PROYECTO (${proyectos.length}). Revísalas primero y con más detalle que el resto.`);
  p.push("");
  if (!proyectos.length) {
    p.push("No hay ninguna ficha escrita.");
  } else {
    proyectos.forEach((pr, i) => {
      p.push(`--- Ficha ${i + 1} ---`);
      p.push(`Título: ${pr.titulo || "(sin título)"}`);
      p.push(`Contexto o reto: ${pr.contexto || "(vacío)"}`);
      p.push(`Objetivo: ${pr.objetivo || "(vacío)"}`);
      p.push(`Mi rol: ${pr.rol || "(vacío)"}`);
      p.push(`Acciones y decisiones: ${pr.acciones || "(vacío)"}`);
      p.push(`Herramientas o métodos: ${pr.herr || "(vacío)"}`);
      p.push(`Resultado o impacto: ${pr.resultado || "(vacío)"}`);
      p.push(`Evidencia: ${pr.evidencia || "(vacío)"}`);
      p.push(`Competencias declaradas: ${pr.competencias || "(vacío)"}`);
      p.push("");
    });
  }

  p.push("RESTO DEL PORTAFOLIO");
  p.push("");
  p.push(String(b?.portafolio || "(vacío)"));
  return p.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  if (!GEMINI_API_KEY) {
    return json({ error: "El servicio de revisión no tiene configurada la clave del proveedor." }, 503);
  }

  const usuario = await quienLlama(req);
  if (!usuario) {
    return json({ error: "Necesitas iniciar sesión para pedir la revisión." }, 401);
  }

  let cuerpo: any;
  try { cuerpo = await req.json(); }
  catch { return json({ error: "La petición no trae datos válidos." }, 400); }

  const entrada = armarEntrada(cuerpo);
  if (entrada.length > MAX_CARACTERES) {
    return json({ error: "El portafolio es demasiado largo para revisarlo de una vez." }, 413);
  }

  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELO,
        input: entrada,
        system_instruction: INSTRUCCION,
        generation_config: { max_output_tokens: 8192 },
        store: false,
      }),
    });

    if (!r.ok) {
      const detalle = await r.text();
      console.error("Gemini respondió", r.status, detalle.slice(0, 500));
      if (r.status === 429) {
        return json({ error: "El servicio está saturado. Vuelve a intentarlo en un momento." }, 429);
      }
      if (r.status === 401 || r.status === 403) {
        return json({ error: "La clave del servicio de revisión no es válida." }, 503);
      }
      return json({ error: "El servicio de revisión devolvió un error." }, 502);
    }

    const bruto = textoDeRespuesta(await r.json()).trim();
    if (!bruto) return json({ error: "El servicio de revisión no devolvió nada." }, 502);

    const d = comoJSON(bruto);
    if (!d) {
      /* Antes que perder la revisión entera, se manda el texto tal
         cual y la interfaz lo muestra en crudo. */
      console.error("Respuesta no parseable:", bruto.slice(0, 300));
      return json({ crudo: bruto });
    }

    return json({
      veredicto: String(d.veredicto ?? ""),
      listo: d.listo === true,
      proyectos: Array.isArray(d.proyectos) ? d.proyectos : [],
      secciones: Array.isArray(d.secciones) ? d.secciones : [],
      prioridad: String(d.prioridad ?? ""),
    });
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo contactar con el servicio de revisión." }, 502);
  }
});
