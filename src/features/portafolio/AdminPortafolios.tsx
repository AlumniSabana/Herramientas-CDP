import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, mensajeDeError } from "@/lib/supabase";
import { Alert, Badge, Button, Card, Cargando, Eyebrow, Input, PageHeader, Select, Vacio, cx } from "@/components/ui";
import { fechaCorta, revisionDesdeFila } from "./logica";
import { RevisionVista } from "./piezas";
import type { FilaAdmin, FilaRevisionAdmin } from "./tipos";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function Kpi({ n, t }: { n: string | number; t: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-3xl font-semibold text-brand-900">{n}</p>
      <p className="mt-1 text-sm text-slate-500">{t}</p>
    </div>
  );
}

export default function AdminPortafolios() {
  const [filas, setFilas] = useState<FilaAdmin[] | null>(null);
  const [revs, setRevs] = useState<FilaRevisionAdmin[]>([]);
  const [error, setError] = useState("");
  const [fac, setFac] = useState("");
  const [prog, setProg] = useState("");
  const [busca, setBusca] = useState("");
  const [centro, setCentro] = useState(false);
  const [abierta, setAbierta] = useState<{ usuario: string; id: string } | null>(null);

  const cargar = useCallback(async () => {
    setError("");
    const [p, r] = await Promise.all([
      supabase.from("portafolios_admin").select("*").order("actualizado_en", { ascending: false }),
      supabase.from("revisiones_admin").select("*").order("creado_en", { ascending: false }),
    ]);
    if (p.error) {
      setError(mensajeDeError(p.error));
      setFilas([]);
      return;
    }
    setFilas((p.data ?? []) as FilaAdmin[]);
    // Las revisiones son un extra: si fallan, el consolidado se sigue viendo.
    setRevs(r.error ? [] : ((r.data ?? []) as FilaRevisionAdmin[]));
  }, []);
  useEffect(() => void cargar(), [cargar]);

  const personas = useMemo(() => (filas ?? []).filter((x) => centro || !x.es_admin), [filas, centro]);
  const vista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return personas.filter((x) => (!fac || x.facultad === fac) && (!prog || x.programa === prog) && (!q || `${x.nombre} ${x.correo}`.toLowerCase().includes(q)));
  }, [personas, fac, prog, busca]);

  const revsDe = useCallback((id: string) => revs.filter((r) => r.usuario_id === id), [revs]);
  const facultades = [...new Set(personas.map((x) => x.facultad).filter(Boolean))].sort();
  const programas = [...new Set(personas.filter((x) => !fac || x.facultad === fac).map((x) => x.programa).filter(Boolean))].sort();

  const n = vista.length;
  const prom = (f: (x: FilaAdmin) => number) => (n ? vista.reduce((a, x) => a + (Number(f(x)) || 0), 0) / n : 0);
  const porPrograma = useMemo(() => {
    const g = new Map<string, { n: number; sec: number; fic: number; pdf: number }>();
    vista.forEach((x) => {
      const k = x.programa || "Sin programa";
      const e = g.get(k) ?? { n: 0, sec: 0, fic: 0, pdf: 0 };
      e.n++;
      e.sec += x.hojas_completas;
      e.fic += x.fichas_completas;
      if (x.descargado) e.pdf++;
      g.set(k, e);
    });
    return [...g.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [vista]);

  const exportar = () => {
    const cab = ["Correo", "Nombre", "Facultad", "Programa", "Área", "Etapa", "Objetivo", "Secciones completas", "Fichas escritas", "Fichas completas", "Descargó el PDF", "Pidió revisión con IA", "Empezó", "Última actividad"];
    const filasCsv = vista.map((x) => [x.correo, x.nombre, x.facultad, x.programa, x.area, x.etapa, x.objetivo, x.hojas_completas, x.fichas_total, x.fichas_completas, x.descargado ? "Sí" : "No", revsDe(x.usuario_id).length ? "Sí" : "No", fechaCorta(x.creado_en), fechaCorta(x.actualizado_en)]);
    // BOM para que Excel abra bien los acentos.
    const blob = new Blob(["﻿" + [cab, ...filasCsv].map((f) => f.map(csv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "portafolios-cdp.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };

  if (!filas) return <Cargando texto="Cargando el consolidado…" />;

  const abiertas = abierta ? revsDe(abierta.usuario) : [];
  const elegida = abierta ? (abiertas.find((r) => r.id === abierta.id) ?? abiertas[0]) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administración · CDP"
        titulo="Consolidado del portafolio"
        descripcion="Personas que han abierto un portafolio con la sesión iniciada. Del portafolio se registra el avance, nunca el texto. De las segundas opiniones sí se ve el contenido: pulsa «Ver» en la fila de cada quien."
        acciones={
          <>
            <Button onClick={exportar} disabled={!n}>
              Exportar a CSV
            </Button>
            <Button variant="secondary" onClick={() => void cargar()}>
              Actualizar
            </Button>
          </>
        }
      />

      {error && (
        <Alert tono="error">
          No se pudo leer el consolidado: {error}. Comprueba que corriste la migración completa en Supabase (vista «portafolios_admin») y que tu cuenta tiene rol «admin».
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi n={n} t="Personas" />
        <Kpi n={new Set(vista.map((x) => x.programa).filter(Boolean)).size} t="Programas" />
        <Kpi n={`${prom((x) => x.hojas_completas).toFixed(1)} de 5`} t="Secciones promedio" />
        <Kpi n={prom((x) => x.fichas_completas).toFixed(1)} t="Fichas promedio" />
        <Kpi n={vista.filter((x) => x.descargado).length} t="Descargaron el PDF" />
        <Kpi n={new Set(vista.filter((x) => revsDe(x.usuario_id).length).map((x) => x.usuario_id)).size} t="Pidieron segunda opinión" />
      </div>

      <Card className="grid items-end gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Select label="Facultad" value={fac} onChange={(e) => { setFac(e.target.value); setProg(""); }}>
          <option value="">Todas</option>
          {facultades.map((f) => <option key={f}>{f}</option>)}
        </Select>
        <Select label="Programa" value={prog} onChange={(e) => setProg(e.target.value)}>
          <option value="">Todos</option>
          {programas.map((f) => <option key={f}>{f}</option>)}
        </Select>
        <Input label="Buscar" placeholder="Nombre o correo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-700">
          <input type="checkbox" className="size-4 accent-brand-900" checked={centro} onChange={(e) => setCentro(e.target.checked)} />
          Incluir cuentas del Centro
        </label>
      </Card>

      {n === 0 ? (
        <Vacio titulo="Nadie ha empezado un portafolio todavía">Cuando alguien abra su portafolio con la sesión iniciada, aparecerá aquí su avance.</Vacio>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-brand-50 text-brand-900">
              <tr>
                {["Persona", "Facultad", "Programa", "Etapa", "Secciones", "Fichas", "PDF", "Segunda opinión", "Última vez"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {vista.map((x) => {
                const rs = revsDe(x.usuario_id);
                return (
                  <tr key={x.usuario_id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-brand-900">{x.nombre || x.correo}</p>
                      <p className="text-xs text-slate-500">{x.correo}</p>
                    </td>
                    <td className="px-4 py-3">{x.facultad || "—"}</td>
                    <td className="px-4 py-3">{x.programa || "—"}</td>
                    <td className="px-4 py-3">{x.etapa || "—"}</td>
                    <td className="px-4 py-3">{x.hojas_completas} de 5</td>
                    <td className="px-4 py-3">{x.fichas_completas} de {x.fichas_total}</td>
                    <td className="px-4 py-3">{x.descargado ? <Badge tono="ok">Sí</Badge> : <Badge tono="neutro">No</Badge>}</td>
                    <td className="px-4 py-3">
                      {rs.length ? (
                        <Button size="sm" variant="secondary" onClick={() => setAbierta({ usuario: x.usuario_id, id: rs[0].id })}>
                          Ver ({rs.length})
                        </Button>
                      ) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{fechaCorta(x.actualizado_en)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {elegida && (
        <Card className="space-y-5 border-brand-300">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl">{elegida.nombre || elegida.correo}</h3>
              <p className="text-sm text-slate-500">{[elegida.correo, elegida.programa].filter(Boolean).join(" · ")}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setAbierta(null)}>
              Cerrar
            </Button>
          </div>
          {abiertas.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {abiertas.map((r) => (
                <button key={r.id} onClick={() => setAbierta({ usuario: r.usuario_id, id: r.id })} className={cx("rounded-lg border px-3 py-1.5 text-sm", r.id === elegida.id ? "border-brand-900 bg-brand-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-400")}>
                  {fechaCorta(r.creado_en)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Pedida el {fechaCorta(elegida.creado_en)}</p>
          )}
          <RevisionVista d={revisionDesdeFila(elegida)} tuyo={false} />
        </Card>
      )}

      <section className="space-y-4">
        <h3 className="text-2xl">Por programa</h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50 text-brand-900">
              <tr>
                {["Programa", "Personas", "Secciones promedio", "Fichas promedio", "Descargaron PDF"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {porPrograma.length ? (
                porPrograma.map(([k, p]) => (
                  <tr key={k}>
                    <td className="px-4 py-3 font-medium text-brand-900">{k}</td>
                    <td className="px-4 py-3">{p.n}</td>
                    <td className="px-4 py-3">{(p.sec / p.n).toFixed(1)}</td>
                    <td className="px-4 py-3">{(p.fic / p.n).toFixed(1)}</td>
                    <td className="px-4 py-3">{p.pdf}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-4 py-6 text-slate-500">Sin datos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Card className="space-y-3 bg-brand-50/60">
        <Eyebrow>Qué contiene y qué no</Eyebrow>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
          Cada fila es el avance de una persona: su programa, cuántas secciones lleva y cuántas fichas de proyecto ha escrito. <b>No hay una sola palabra de su portafolio.</b> El texto sí está guardado, en su cuenta, pero las políticas de la base de datos solo se lo devuelven a ella: en esta tabla se cuenta, no se lee. Si necesitas leer el trabajo de alguien, pídeselo.
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
          <b>Las segundas opiniones sí se pueden abrir</b>, con «Ver» en la fila de cada quien, porque sirven para preparar la asesoría. Ten presente que la instrucción le pide al modelo citar entre comillas las palabras del estudiante, así que una observación puede traer frases sueltas de su portafolio. Está avisado en pantalla antes de que nadie pida la revisión.
        </p>
        <p className="text-xs text-slate-500">El archivo exportado contiene datos personales: guárdalo donde corresponda y no lo reenvíes por correo.</p>
      </Card>
    </div>
  );
}
