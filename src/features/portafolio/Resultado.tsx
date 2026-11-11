import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, cx } from "@/components/ui";
import { useBorrador } from "./Borrador";
import { armar, hojasCompletas, portafolioVacio } from "./logica";
import { Encabezado, Prosa, copiar } from "./piezas";
import { descargarPDF } from "./pdf";
import { hayTraductorLocal, mensajeTraductor, traducirMarkdown } from "./traductor";

export function Resultado() {
  const { c, marcarDescargado } = useBorrador();
  const { session } = useAuth();
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const n = hojasCompletas(c);
  const vacio = portafolioVacio(c);
  const md = armar(c);
  const hayIA = Boolean(session);
  const archivo = (s: string) => (c.nombre.trim() ? `${c.nombre.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${s}` : `portafolio-${s}`);

  const pdf = async (texto: string, nombre: string, titulo: string) => {
    try {
      await descargarPDF(texto, nombre, titulo);
      marcarDescargado();
      setNota(`Descargado: ${nombre}`);
      setAviso(false);
    } catch {
      setNota("No se pudo generar el PDF en este navegador.");
      setAviso(true);
    }
  };

  const ingles = async () => {
    const local = hayTraductorLocal();
    setOcupado(true);
    setAviso(false);
    setNota(local ? "Preparando el traductor… la primera vez el navegador descarga el modelo." : "Traduciendo con inteligencia artificial… puede tardar medio minuto.");
    try {
      const en = await traducirMarkdown(md, hayIA, (p) => setNota(`Descargando el modelo de traducción… ${p} %`), (p) => local && setNota(`Traduciendo… ${p} %`));
      await pdf(en, "my-portfolio.pdf", "Professional portfolio");
      setNota(local ? "Traducción automática hecha en tu equipo. Revísala antes de enviarla." : "Traducción automática. Revísala antes de enviarla: la máquina no conoce tu trabajo.");
    } catch (e) {
      setNota(mensajeTraductor(e));
      setAviso(true);
    }
    setOcupado(false);
  };

  return (
    <div className="space-y-8">
      <Encabezado paso="Tu resultado" titulo="Tu portafolio" />
      <Prosa>Este es el texto que has construido, listo para copiar en la plataforma que elijas. Los marcadores entre corchetes señalan lo que aún falta confirmar: déjalos visibles mientras no tengas el dato real.</Prosa>
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-brand-900">{n} de 5 secciones</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(n / 5) * 100}%` }} />
        </div>
      </div>
      <p className="max-w-prose text-sm text-slate-500">La traducción al inglés la hace tu propio navegador cuando lo trae, sin que el texto salga de tu equipo. Si no lo trae, la hace la inteligencia artificial de la Universidad y para eso necesitas tu cuenta abierta.</p>
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl">Vista previa</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled={vacio} onClick={async () => { setAviso(false); setNota((await copiar(md)) ? "Copiado al portapapeles." : "No se pudo copiar. Selecciona el texto manualmente."); }}>
              Copiar
            </Button>
            <Button disabled={vacio} onClick={() => pdf(md, `${archivo("portafolio")}.pdf`, c.nombre.trim() || "Portafolio profesional")}>
              Descargar PDF
            </Button>
            <Button variant="secondary" disabled={vacio || ocupado} onClick={ingles}>
              Descargar en inglés (PDF)
            </Button>
          </div>
        </div>
        {nota && <p role="status" className={cx("text-sm", aviso ? "text-amber-700" : "text-slate-600")}>{nota}</p>}
        <pre className={cx("max-h-[640px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-5 font-sans text-sm leading-relaxed", vacio ? "text-slate-400" : "text-slate-800")}>
          {vacio ? "Completa las hojas anteriores y tu portafolio aparecerá aquí." : md}
        </pre>
      </Card>
    </div>
  );
}
