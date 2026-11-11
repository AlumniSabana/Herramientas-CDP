import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Alert, Button, Eyebrow, Input, Textarea, cx } from "@/components/ui";
import { REGLAS_FICHA, type ClaveRegla } from "./datos";
import { useBorrador } from "./Borrador";
import { armarProyectos, areaDe, evaluarFicha, evaluarProyectos, fichaConTexto, fichaMarkdown } from "./logica";
import { Aviso, Encabezado, Nota, Prosa, Tabla, copiar } from "./piezas";
import { descargarPDF } from "./pdf";
import { hayTraductorLocal, mensajeTraductor, traducirMarkdown } from "./traductor";
import { fichaVacia, type Ficha } from "./tipos";

const PLACEHOLDERS: Record<string, string> = {
  contexto: "Qué situación, necesidad o problema existía.",
  objetivo: "Qué se buscaba conseguir.",
  rol: "Qué hiciste tú específicamente, no el equipo.",
  acciones: "Cómo abordaste el trabajo y qué decidiste.",
  herr: "Solo si es relevante para el proyecto",
  resultado: "Qué se consiguió, o qué aprendiste si no hubo resultado medible.",
  evidencia: "Pega el enlace: repositorio, documento, publicación, video, perfil",
  competencias: "Solo las que se infieran de lo que describiste",
};

function Contador({ f, k }: { f: Ficha; k: ClaveRegla }) {
  const r = REGLAS_FICHA[k];
  const n = f[k].trim().split(/\s+/).filter(Boolean).length;
  const ok = n >= r.min;
  const texto = r.unidad ? (ok ? "Enlace escrito" : `Falta el ${r.unidad}`) : ok ? `${n} palabras` : `${n} de ${r.min} palabras`;
  return <p className={cx("mt-1.5 text-xs", ok ? "font-medium text-emerald-700" : n > 0 ? "font-medium text-amber-700" : "text-slate-500")}>{texto}</p>;
}

function Traduccion({ f }: { f: Ficha }) {
  const { session } = useAuth();
  const [estado, setEstado] = useState<{ nota: string; tono: "info" | "warn"; texto: string; ocupado: boolean }>({ nota: "", tono: "info", texto: "", ocupado: false });
  const hayIA = Boolean(session);
  const sinTraductor = !hayTraductorLocal() && !hayIA;

  const traducir = async () => {
    const md = fichaMarkdown(f);
    if (md.split(/\s+/).filter(Boolean).length < 6) return setEstado((s) => ({ ...s, nota: "Escribe la ficha antes de traducirla.", tono: "warn" }));
    const local = hayTraductorLocal();
    setEstado({ nota: local ? "Preparando el traductor… la primera vez el navegador descarga el modelo." : "Traduciendo con inteligencia artificial…", tono: "info", texto: "", ocupado: true });
    try {
      const en = await traducirMarkdown(
        md,
        hayIA,
        (p) => setEstado((s) => ({ ...s, nota: `Descargando el modelo de traducción… ${p} %` })),
        (p) => local && setEstado((s) => ({ ...s, nota: `Traduciendo… ${p} %` })),
      );
      setEstado({
        texto: en.replace(/\*\*/g, "").replace(/^### /m, ""),
        nota: local ? "Traducción hecha en tu equipo. Revísala antes de usarla." : "Traducción automática. Revísala antes de usarla: la máquina no conoce tu trabajo.",
        tono: "info",
        ocupado: false,
      });
    } catch (e) {
      setEstado({ texto: "", nota: mensajeTraductor(e), tono: "warn", ocupado: false });
    }
  };

  return (
    <div className="space-y-3 border-t border-slate-100 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={traducir} disabled={estado.ocupado || sinTraductor}>
          Traducir al inglés
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void copiar(fichaMarkdown(f))}>
          Copiar ficha en español
        </Button>
        <span className={cx("text-xs", estado.tono === "warn" ? "text-amber-700" : "text-slate-500")} role="status">
          {sinTraductor ? "Tu navegador no incluye traductor y no hay sesión iniciada: copia el texto y tradúcelo aparte." : estado.nota}
        </span>
      </div>
      {estado.texto && (
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow>Versión en inglés</Eyebrow>
            <Button variant="ghost" size="sm" onClick={() => void copiar(estado.texto)}>
              Copiar
            </Button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{estado.texto}</pre>
        </div>
      )}
    </div>
  );
}

function FichaForm({ f, n, ph, onChange, onDelete }: { f: Ficha; n: number; ph: string; onChange(p: Partial<Ficha>): void; onDelete(): void }) {
  const ev = evaluarFicha(f);
  const campo = (k: Exclude<keyof Ficha, "id">, tipo: "input" | "area", label: string, placeholder: string) => {
    const regla = (REGLAS_FICHA as Record<string, (typeof REGLAS_FICHA)[ClaveRegla]>)[k];
    const ayuda = !regla ? "Opcional" : undefined;
    const pie = regla ? <Contador f={f} k={k as ClaveRegla} /> : undefined;
    return (
      <div>
        {tipo === "area" ? (
          <Textarea label={label} rows={3} placeholder={placeholder} ayuda={ayuda} value={f[k]} onChange={(e) => onChange({ [k]: e.target.value })} />
        ) : (
          <Input label={label} placeholder={placeholder} ayuda={ayuda} value={f[k]} onChange={(e) => onChange({ [k]: e.target.value })} />
        )}
        {pie}
      </div>
    );
  };
  return (
    <fieldset className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <legend className="rounded-full bg-brand-900 px-4 py-1 text-sm font-semibold text-white">Proyecto {n}</legend>
      {campo("titulo", "input", REGLAS_FICHA.titulo.etiqueta, ph)}
      <div className="grid gap-6 sm:grid-cols-2">
        {campo("contexto", "area", REGLAS_FICHA.contexto.etiqueta, PLACEHOLDERS.contexto)}
        {campo("objetivo", "area", REGLAS_FICHA.objetivo.etiqueta, PLACEHOLDERS.objetivo)}
        {campo("rol", "area", REGLAS_FICHA.rol.etiqueta, PLACEHOLDERS.rol)}
        {campo("acciones", "area", REGLAS_FICHA.acciones.etiqueta, PLACEHOLDERS.acciones)}
        {campo("herr", "input", "Herramientas o métodos", PLACEHOLDERS.herr)}
        {campo("resultado", "area", REGLAS_FICHA.resultado.etiqueta, PLACEHOLDERS.resultado)}
        {campo("evidencia", "input", REGLAS_FICHA.evidencia.etiqueta, PLACEHOLDERS.evidencia)}
        {campo("competencias", "input", "Competencias demostradas", PLACEHOLDERS.competencias)}
      </div>
      <p role="status" className={cx("rounded-lg px-4 py-2.5 text-sm", ev.completa ? "bg-emerald-50 text-emerald-800" : !ev.vacia ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-500")}>
        {ev.vacia ? "Ficha sin empezar." : ev.completa ? "Ficha completa: cumple los mínimos de cada campo." : `Faltan por completar: ${ev.faltan.join(", ")}.`}
      </p>
      <Traduccion f={f} />
      <div>
        <Button variant="ghost" size="sm" className="text-rose-700 hover:bg-rose-50" onClick={onDelete}>
          Eliminar este proyecto
        </Button>
      </div>
    </fieldset>
  );
}

/** Texto de la regla de avance (la hoja siguiente exige una ficha completa). */
export function textoPuerta(fs: Ficha[], esAdmin: boolean) {
  const r = evaluarProyectos(fs);
  if (esAdmin && r.completas === 0) return "Cuenta de administración: puedes recorrer las hojas sin completar fichas. A quien construye su portafolio sí se le pide una ficha entera para continuar.";
  if (r.completas === 1) return "Una ficha cumple los mínimos: ya puedes continuar.";
  if (r.completas > 1) return `${r.completas} fichas cumplen los mínimos: ya puedes continuar.`;
  if (r.total === 0) return "Añade una ficha de proyecto para continuar.";
  if (r.primera?.vacia) return "Para continuar, completa una ficha entera. Ninguna tiene contenido todavía.";
  return `Para continuar, completa una ficha entera. En la primera falta: ${r.primera?.faltan.join(", ")}.`;
}

export function Proyectos() {
  const { c, set } = useBorrador();
  const { esAdmin } = useAuth();
  const [aviso, setAviso] = useState("");
  const a = areaDe(c);
  const ph = a?.ph ?? "Un nombre que se entienda sin explicación";
  const esEst = c.etapa === "estudiante";
  const r = evaluarProyectos(c.proyectos);
  const abierta = esAdmin || r.completas > 0;
  const hay = c.proyectos.some(fichaConTexto);

  const cambiar = (i: number, p: Partial<Ficha>) => set((x) => ({ proyectos: x.proyectos.map((f, j) => (j === i ? { ...f, ...p } : f)) }));

  const descargar = async () => {
    try {
      await descargarPDF(armarProyectos(c), "proyectos-portafolio.pdf", "Proyectos y evidencias");
      setAviso("PDF descargado.");
    } catch {
      setAviso("No se pudo generar el PDF en este navegador.");
    }
  };

  return (
    <div className="space-y-10">
      <Encabezado paso="Paso 4 de 6 · Sección 3" titulo="Proyectos y evidencias" pregunta="¿Cómo demuestras lo que dices?" />
      <Prosa>Es el núcleo del portafolio y donde debe estar el 70 % del peso. Para un portafolio conciso, tres proyectos bien contados valen más que diez enumerados.</Prosa>

      <section className="space-y-5">
        <h3 className="text-2xl">¿Qué cuenta como evidencia en tu programa?</h3>
        {a ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-brand-600 bg-brand-50 p-6">
              <Eyebrow>Empieza por aquí</Eyebrow>
              <h4 className="mt-1 text-lg">{esEst ? "Como estudiante" : "Con trayectoria"}</h4>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">{(esEst ? a.estudiante : a.graduado).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <Eyebrow className="!text-slate-500">{esEst ? "Si ya tienes experiencia laboral" : "También cuenta tu etapa formativa"}</Eyebrow>
              <h4 className="mt-1 text-lg">Evidencia complementaria</h4>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">{(esEst ? a.graduado : a.estudiante).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        ) : (
          <Nota titulo="Selecciona tu programa">Aquí aparecerán los tipos de evidencia propios de tu disciplina, diferenciados según tu etapa.</Nota>
        )}
        {a && <Aviso titulo="Antes de publicar en tu área:">{a.aviso}</Aviso>}
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl">¿Cómo elegir cuáles incluir?</h3>
        <Prosa>Cuando tengas más experiencias que espacio, evalúa cada una con estos ocho criterios y quédate con las tres que mejor los cumplan.</Prosa>
        <Tabla
          cabeza={["Criterio", "Pregunta que debes hacerte"]}
          filas={[
            ["Pertinencia", "¿Se relaciona con el objetivo que persigo hoy?"],
            ["Participación", "¿Puedo explicar con claridad cuál fue mi aporte individual?"],
            ["Evidencia", "¿Tengo un producto, soporte o muestra que lo respalde?"],
            ["Resultado", "¿Hubo un logro, cambio o aprendizaje demostrable?"],
            ["Representatividad", "¿Muestra una competencia importante para mi campo?"],
            ["Diversidad", "¿Aporta algo distinto frente a los demás proyectos?"],
            ["Actualidad", "¿Sigue vigente para mi objetivo actual?"],
            ["Confidencialidad", "¿Puedo presentarlo sin vulnerar información protegida?"],
          ]}
        />
      </section>

      <section className="space-y-5 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 sm:p-8">
        <Eyebrow>El campo «Evidencia»</Eyebrow>
        <h3 className="text-2xl">Va un enlace, no un archivo</h3>
        <Prosa>La evidencia es la prueba de que el proyecto existió: algo que quien te lea pueda <b>abrir por su cuenta</b> sin pedirte nada. Por eso se escribe como una dirección de internet.</Prosa>
        <Tabla
          cabeza={["Si tu evidencia es…", "El enlace que se espera"]}
          filas={[
            ["Código o un desarrollo técnico", "El repositorio en GitHub o GitLab, con su README."],
            ["Un documento, informe o plan", "El archivo en tu OneDrive de la Universidad, compartido para lectura."],
            ["Una pieza gráfica, audiovisual o de diseño", "Behance, Vimeo o YouTube como «no listado»."],
            ["Un artículo, ponencia o publicación", "El DOI, el repositorio institucional o la página de la revista."],
            ["Un producto ya publicado", "La dirección donde está funcionando."],
            ["Un reconocimiento o certificación", "La credencial verificable, o la publicación de la entidad que lo otorgó."],
          ]}
        />
        <h4 className="text-lg">¿Y si lo que tengo es un archivo en mi computador?</h4>
        <Prosa>Esta herramienta no sube archivos, y es a propósito: quien te lee abre tu trabajo desde un enlace, no desde tu disco duro. Lo que hay que hacer es convertirlo en enlace, y con tu cuenta de la Universidad ya puedes:</Prosa>
        <ol className="max-w-prose list-decimal space-y-2 pl-6 text-slate-600">
          <li>Sube el archivo a tu <b>OneDrive institucional</b> (entra a Office 365 con tu correo <span className="font-mono text-sm">@unisabana.edu.co</span>).</li>
          <li>Pulsa <b>Compartir</b> y elige un enlace de <b>solo lectura</b>. Si va a leerlo alguien de fuera de la Universidad, marca «Cualquier persona con el vínculo»; si lo dejas en «Solo personas de mi organización», un empleador no podrá abrirlo.</li>
          <li>Copia el enlace y pégalo aquí.</li>
        </ol>
        <Aviso titulo="Compruébalo antes de publicar.">
          Abre cada enlace en una ventana de incógnito, sin tu sesión iniciada. Un enlace que pide permiso es peor que no poner ninguno: quien lo encuentra cerrado casi nunca escribe para pedirlo. Y si el archivo tiene datos de una empresa, un cliente o un paciente, no lo compartas: describe el trabajo sin mostrarlo.
        </Aviso>
      </section>

      <section className="space-y-5">
        <h3 className="text-2xl">Redacta tus fichas</h3>
        <Prosa>Cada proyecto se cuenta igual: contexto, objetivo, tu rol, lo que hiciste, el resultado y la evidencia que lo respalda.</Prosa>
        <Prosa>
          Cada campo lleva un mínimo de palabras debajo. No es un trámite: por debajo de ese umbral la ficha no le dice nada a quien la lee. <b>Para pasar a la siguiente hoja necesitas al menos una ficha completa.</b> Las demás puedes dejarlas a medias: lo que falte aparecerá como marcador pendiente en tu portafolio, y eso es preferible a inventar.
        </Prosa>
        <div className="space-y-6">
          {c.proyectos.map((f, i) => (
            <FichaForm key={f.id} f={f} n={i + 1} ph={ph} onChange={(p) => cambiar(i, p)} onDelete={() => set((x) => ({ proyectos: x.proyectos.filter((_, j) => j !== i) }))} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={() => set((x) => ({ proyectos: [...x.proyectos, fichaVacia()] }))}>
            Añadir otro proyecto
          </Button>
          <span className="text-sm text-slate-500">
            {c.proyectos.length === 0 ? "Añade al menos un proyecto." : `${c.proyectos.length} ${c.proyectos.length === 1 ? "ficha creada" : "fichas creadas"} · recomendado: tres principales.`}
          </span>
        </div>
        <Alert tono={abierta ? "ok" : "info"}>{textoPuerta(c.proyectos, esAdmin)}</Alert>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
          <Button disabled={!hay} onClick={descargar}>
            Descargar proyectos (PDF)
          </Button>
          <Button variant="secondary" disabled={!hay} onClick={async () => setAviso((await copiar(armarProyectos(c))) ? "Proyectos copiados." : "No se pudo copiar: selecciona el texto manualmente.")}>
            Copiar proyectos
          </Button>
          <span className="text-sm text-slate-500" role="status">
            {aviso || (hay ? "Se descargan solo estas fichas; el portafolio completo está en la hoja «Tu portafolio»." : "Redacta al menos una ficha para poder descargarlas.")}
          </span>
        </div>
      </section>
    </div>
  );
}
