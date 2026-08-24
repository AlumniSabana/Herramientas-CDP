/* ══════════════════════════════════════════════════════════════
   TRADUCIR  ·  Edge Function de Supabase
   --------------------------------------------------------------
   Traduce al inglés el texto que envía «Construye tu portafolio»
   cuando el navegador de la persona no trae traductor propio.

   POR QUÉ EXISTE
   El traductor integrado de Chrome y Edge hace el trabajo en el
   equipo de la persona, gratis y sin que el texto salga de ahí.
   Es la primera opción y la mejor. Pero Safari y Firefox no lo
   traen, y quien abre el archivo desde el disco tampoco lo tiene.
   Para esos casos está esta función.

   POR QUÉ NO VA LA CLAVE EN EL HTML
   La página es un archivo estático que cualquiera puede abrir y
   leer. Una clave de Gemini escrita ahí quedaría a la vista de
   todo el mundo y se podría gastar el cupo de la Universidad en
   media tarde. La clave vive aquí, en los secretos del proyecto,
   y el navegador nunca la ve.

   QUIÉN PUEDE LLAMARLA
   Solo alguien con sesión iniciada. No es por celo: es lo que
   permite atribuir el consumo y frenar el abuso. Sin cuenta queda
   el traductor del navegador y la opción de copiar el texto.

   DESPLIEGUE
     supabase secrets set GEMINI_API_KEY=...
     supabase functions deploy traducir
   ══════════════════════════════════════════════════════════════ */

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
/* El nombre del modelo se deja configurable: Google los renombra
   con más frecuencia de la que conviene redesplegar una función. */
const MODELO = Deno.env.get("GEMINI_MODELO") ?? "gemini-3.7-flash";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

/* Topes por llamada. Una ficha de proyecto son unas 300 palabras;
   el portafolio entero rara vez pasa de 3.000. Cortar por encima
   de eso protege el cupo sin estorbar el uso real. */
const MAX_CARACTERES = 24000;

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

/* Comprueba que quien llama tiene sesión, preguntándoselo a la
   propia API de autenticación de Supabase. Así no hace falta
   verificar el JWT a mano ni guardar ningún secreto extra. */
async function quienLlama(req: Request): Promise<string | null> {
  const cab = req.headers.get("Authorization") ?? "";
  if (!cab.toLowerCase().startsWith("bearer ")) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: cab,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ?? null;
  } catch {
    return null;
  }
}

/* La instrucción es deliberadamente estricta. Lo que se traduce es
   la ficha de un portafolio profesional: si el modelo se pone a
   mejorar la redacción, a añadir logros o a inflar el lenguaje,
   deja de ser el trabajo de la persona y pasa a ser el del modelo.
   Eso es justo lo que la herramienta le pide a los estudiantes que
   no hagan. */
const INSTRUCCION = [
  "Eres un traductor profesional de español a inglés.",
  "El texto pertenece al portafolio profesional de un estudiante universitario.",
  "",
  "REGLAS ESTRICTAS:",
  "1. Traduce fielmente. No añadas información, logros, cifras ni adjetivos que no estén en el original.",
  "2. No mejores la redacción. Si el original es escueto, la traducción es escueta.",
  "3. Conserva exactamente el formato Markdown: las almohadillas de encabezado, los asteriscos dobles de negrita, los guiones de lista y los saltos de línea van en el mismo sitio.",
  "4. No traduzcas nombres propios, marcas, nombres de herramientas ni de programas académicos que se usen como nombre propio.",
  "5. Usa el registro profesional del inglés de un currículo: verbos de acción, voz activa, sin florituras.",
  "6. Devuelve únicamente la traducción. Nada de comentarios, notas, disculpas ni texto introductorio.",
].join("\n");

/* La respuesta de la API de interacciones trae el texto en
   steps[].content[].text. Se acepta también la forma antigua de
   generateContent por si el proyecto se apunta a otro modelo. */
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
  const antiguo = d?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text ?? "")
    .join("");
  return antiguo ?? "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  if (!GEMINI_API_KEY) {
    return json(
      { error: "El servicio de traducción no tiene configurada la clave del proveedor." },
      503,
    );
  }

  const usuario = await quienLlama(req);
  if (!usuario) {
    return json({ error: "Necesitas iniciar sesión para traducir con inteligencia artificial." }, 401);
  }

  let cuerpo: any;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "La petición no trae datos válidos." }, 400);
  }

  const texto = String(cuerpo?.texto ?? "").trim();
  if (!texto) return json({ error: "No hay texto que traducir." }, 400);
  if (texto.length > MAX_CARACTERES) {
    return json(
      { error: `El texto es demasiado largo (máximo ${MAX_CARACTERES} caracteres).` },
      413,
    );
  }

  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        input: texto,
        system_instruction: INSTRUCCION,
        generation_config: { max_output_tokens: 8192 },
        store: false,
      }),
    });

    if (!r.ok) {
      const detalle = await r.text();
      console.error("Gemini respondió", r.status, detalle.slice(0, 500));
      if (r.status === 429) {
        return json({ error: "El servicio de traducción está saturado. Vuelve a intentarlo en un momento." }, 429);
      }
      if (r.status === 401 || r.status === 403) {
        return json({ error: "La clave del servicio de traducción no es válida." }, 503);
      }
      return json({ error: "El servicio de traducción devolvió un error." }, 502);
    }

    const d = await r.json();
    const ingles = textoDeRespuesta(d).trim();
    if (!ingles) {
      console.error("Respuesta sin texto:", JSON.stringify(d).slice(0, 500));
      return json({ error: "El servicio de traducción no devolvió texto." }, 502);
    }

    return json({ texto: ingles });
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo contactar con el servicio de traducción." }, 502);
  }
});
