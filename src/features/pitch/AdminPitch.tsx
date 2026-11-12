/* Consolidado del Estudio de Pitch (solo administración).
   El navegador oculta el panel, pero quien manda es la base: las vistas rondas_admin y perfiles_admin
   devuelven cero filas a quien no tiene el rol. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, cx, Cargando, Vacio } from "@/components/ui";
import { FACULTADES } from "@/lib/catalogo";
import { mmss, semaforoNivel, type NivelSem } from "./analisis";
import { cargarConsolidado, type Consolidado, type RondaAdmin } from "./datos";
import Diagnostico from "./Diagnostico";
import { exportarCSV } from "./exportar";
import { FichaRonda, fechaCorta, Semaforo } from "./piezas";
import { Rosca } from "./Rosca";

type Persona = {
  correo: string; nombre: string; facultad: string; programa: string;
  rondas: RondaAdmin[]; total: number; ultimo: number | null; promedio: number | null;
};

// Los nombres se escribieron por separado en el registro y en las rondas: se comparan sin tildes ni mayúsculas.
const norm = (t: string) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const igual = (a: string, b: string) => norm(a) === norm(b);

function armarPersonas(c: Consolidado): Persona[] {
  const por = new Map<string, Persona>();
  c.usuarios.forEach((u) => por.set(u.correo.toLowerCase(), { correo: u.correo, nombre: u.nombre || "", facultad: u.facultad || "", programa: u.programa || "", rondas: [], total: 0, ultimo: null, promedio: null }));
  c.rondas.forEach((r) => {
    const k = String(r.correo || "").toLowerCase();
    if (!k) return;
    if (!por.has(k)) por.set(k, { correo: r.correo, nombre: r.nombre || "", facultad: r.facultad || "", programa: r.programa || "", rondas: [], total: 0, ultimo: null, promedio: null });
    por.get(k)!.rondas.push(r);
  });
  return [...por.values()]
    .map((p) => {
      p.rondas.sort((a, b) => String(b.creada_en).localeCompare(String(a.creada_en)));
      p.total = p.rondas.length;
      p.ultimo = p.total ? Number(p.rondas[0].puntaje) : null;
      // Se clasifica por el promedio, no por la última ronda: una mala tarde no la vuelve prioridad.
      p.promedio = p.total ? Math.round(p.rondas.reduce((a, x) => a + (Number(x.puntaje) || 0), 0) / p.total) : null;
      return p;
    })
    .sort((a, b) => b.total - a.total || a.correo.localeCompare(b.correo));
}

const resumen = (l: Persona[]) => {
  const rondas = l.reduce((a, p) => a + p.total, 0);
  const suma = l.reduce((a, p) => a + p.rondas.reduce((s, r) => s + (Number(r.puntaje) || 0), 0), 0);
  return { personas: l.length, activas: l.filter((p) => p.total > 0).length, rondas, prom: rondas ? Math.round(suma / rondas) : null };
};

const FILTROS: { k: NivelSem; t: string }[] = [
  { k: "revisa", t: "Prioridad" },
  { k: "ajusta", t: "Ajustable" },
  { k: "bien", t: "Sólido" },
  { k: "nada", t: "Sin practicar" },
];
const VALOR_FILTRO: Record<NivelSem, number | null> = { revisa: 30, ajusta: 60, bien: 90, nada: null };

type Pestana = "personas" | "programas" | "diagnostico";

export default function AdminPitch() {
  const [datos, setDatos] = useState<Consolidado | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>("personas");
  const [filtro, setFiltro] = useState<Set<NivelSem>>(new Set());
  const [abierta, setAbierta] = useState<string | null>(null);
  const [rondaAbierta, setRondaAbierta] = useState<string | null>(null);
  const [fac, setFac] = useState("");
  const [prog, setProg] = useState("");
  const [aviso, setAviso] = useState("");
  const [centro, setCentro] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setDatos(await cargarConsolidado(centro));
      setFac("");
      setProg("");
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "error desconocido");
    } finally {
      setCargando(false);
    }
  }, [centro]);
  useEffect(() => void cargar(), [cargar]);

  const personas = useMemo(() => (datos ? armarPersonas(datos) : []), [datos]);

  // El filtro clasifica personas; no toca los indicadores ni la rosca (un consolidado que cambiara sus totales al filtrar dejaría de serlo).
  const pasa = (p: number | null) => !filtro.size || filtro.has(semaforoNivel(p));
  const alternar = (k: NivelSem) => setFiltro((f) => { const n = new Set(f); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  if (cargando && !datos) return <Cargando texto="Cargando consolidado…" />;
  if (error && !datos) {
    return (
      <Alert tono="error">
        <strong>No se pudo cargar el consolidado:</strong> {error}
        <p className="mt-2"><strong>Qué revisar:</strong> que hayas corrido la migración completa en el editor SQL de Supabase (crea la vista <code>rondas_admin</code>) y que tu perfil tenga rol «admin».</p>
        <Button className="mt-4" variant="secondary" size="sm" onClick={() => void cargar()}>Reintentar</Button>
      </Alert>
    );
  }
  if (!datos) return null;

  const total = datos.rondas.length;
  const nPersonas = datos.usuarios.length || new Set(datos.rondas.map((r) => r.correo)).size;
  const prom = total ? Math.round(datos.rondas.reduce((a, r) => a + (Number(r.puntaje) || 0), 0) / total) : 0;
  const nFac = new Set(datos.rondas.map((r) => r.facultad).filter(Boolean)).size;

  const persona = abierta ? personas.find((p) => p.correo.toLowerCase() === abierta.toLowerCase()) : null;

  const exportar = () => {
    if (!datos.rondas.length) return setAviso("No hay rondas para exportar todavía.");
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    exportarCSV(datos.rondas, null, `estudio-de-pitch-consolidado-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.csv`);
    setAviso(`Archivo generado con ${datos.rondas.length} rondas. Contiene datos personales: guárdalo en la carpeta restringida del CDP y no lo reenvíes por correo.`);
  };

  const Filtro = (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filtrar por semáforo">
      <span className="text-sm text-slate-500">Semáforo:</span>
      {FILTROS.map((f) => (
        <button key={f.k} aria-pressed={filtro.has(f.k)} onClick={() => alternar(f.k)} className={cx("inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors", filtro.has(f.k) ? "border-brand-900 bg-brand-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-400")}>
          <span className={filtro.has(f.k) ? "rounded bg-white px-1" : ""}><Semaforo valor={VALOR_FILTRO[f.k]} cifra="" /></span>
          {f.t}
        </button>
      ))}
    </div>
  );

  /* ───── Detalle de una persona ───── */
  if (persona) {
    const ronda = persona.rondas.find((r) => r.id === rondaAbierta);
    return (
      <div className="space-y-8">
        <button className="text-sm font-semibold text-brand-600 hover:underline" onClick={() => { setAbierta(null); setRondaAbierta(null); }}>← Volver a la lista</button>
        <div>
          <h2 className="text-2xl">{persona.nombre || persona.correo}</h2>
          <p className="mt-1 text-sm text-slate-600">{persona.correo} · {persona.facultad || "Sin facultad"} · {persona.programa || "Sin programa"} · {persona.total} {persona.total === 1 ? "ronda" : "rondas"}</p>
        </div>
        {persona.rondas.length === 0 ? (
          <Vacio titulo="Esta persona todavía no ha practicado." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-brand-50 text-xs uppercase tracking-wider text-brand-800">
                <tr>{["Fecha", "Escenario", "Objetivo", "Real", "Ppm", "Muletillas", "Puntaje", ""].map((h, i) => <th key={i} className="px-4 py-4 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {persona.rondas.map((r) => (
                  <tr key={r.id} className={cx("cursor-pointer hover:bg-brand-50/60", rondaAbierta === r.id && "bg-brand-50")} onClick={() => setRondaAbierta(rondaAbierta === r.id ? null : r.id)}>
                    <td className="px-4 py-3 tabular-nums">{fechaCorta(r.creada_en)}</td>
                    <td className="px-4 py-3">{r.tipo_nombre || r.tipo}</td>
                    <td className="px-4 py-3 tabular-nums">{mmss(r.duracion_objetivo)}</td>
                    <td className="px-4 py-3 tabular-nums">{mmss(r.duracion_real)}</td>
                    <td className="px-4 py-3 tabular-nums">{r.ppm}</td>
                    <td className="px-4 py-3 tabular-nums">{r.muletillas_total}</td>
                    <td className="px-4 py-3"><Semaforo valor={r.puntaje} /></td>
                    <td className="px-4 py-3 font-semibold text-brand-600">{rondaAbierta === r.id ? "Cerrar" : "Leer"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ronda && <FichaRonda r={ronda} />}
      </div>
    );
  }

  /* ───── Por programa: facultades → programas → personas ───── */
  const gente = personas;
  const nombresFac = Object.keys(FACULTADES);
  gente.forEach((p) => { if (p.facultad && !nombresFac.some((x) => igual(x, p.facultad))) nombresFac.push(p.facultad); });

  const vistaProgramas = () => {
    const ruta = (
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-2 text-sm">
        {fac ? (
          <>
            <button className="font-semibold text-brand-600 hover:underline" onClick={() => { setFac(""); setProg(""); }}>Todas las facultades</button>
            <span aria-hidden className="text-slate-400">›</span>
            {prog ? (
              <>
                <button className="font-semibold text-brand-600 hover:underline" onClick={() => setProg("")}>{fac}</button>
                <span aria-hidden className="text-slate-400">›</span>
                <span className="font-semibold text-brand-900">{prog}</span>
              </>
            ) : (
              <span className="font-semibold text-brand-900">{fac}</span>
            )}
          </>
        ) : (
          <span className="font-semibold text-brand-900">Todas las facultades</span>
        )}
      </nav>
    );

    // Nivel 3: personas del programa
    if (fac && prog) {
      const todos = gente.filter((p) => igual(p.programa, prog));
      const dentro = todos.filter((p) => pasa(p.promedio));
      const r = resumen(dentro);
      return (
        <div className="space-y-6">
          {ruta}
          {Filtro}
          {filtro.size > 0 && <p className="text-sm text-slate-500">Mostrando {dentro.length} de {todos.length} {todos.length === 1 ? "persona" : "personas"}</p>}
          <p className="text-sm text-slate-600">{dentro.length ? `${r.personas} ${r.personas === 1 ? "persona registrada" : "personas registradas"}, ${r.activas} con al menos una ronda.` : "Este programa aparece porque está en la lista de la Universidad, no porque tenga a alguien inscrito en la herramienta."}</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-brand-50 text-xs uppercase tracking-wider text-brand-800">
                <tr>{["Persona", "Rondas", "Último puntaje", "Promedio", ""].map((h, i) => <th key={i} className="px-4 py-4 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dentro.length ? dentro.map((p) => (
                  <tr key={p.correo}>
                    <td className="px-4 py-3">{p.nombre || p.correo}<div className="text-xs text-slate-500">{p.correo}</div></td>
                    <td className="px-4 py-3 tabular-nums">{p.total}</td>
                    <td className="px-4 py-3"><Semaforo valor={p.ultimo} /></td>
                    <td className="px-4 py-3"><Semaforo valor={p.promedio} /></td>
                    <td className="px-4 py-3"><button className="font-semibold text-brand-600 hover:underline" onClick={() => setAbierta(p.correo)}>Ver reporte</button></td>
                  </tr>
                )) : <tr><td colSpan={5} className="px-4 py-6 text-slate-500">{todos.length ? "Nadie de este programa encaja con el semáforo elegido." : "Nadie de este programa se ha registrado todavía."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Nivel 2: programas de una facultad
    if (fac) {
      const programas = (FACULTADES[fac] ?? []).slice();
      gente.forEach((p) => { if (igual(p.facultad, fac) && p.programa && !programas.some((x) => igual(x, p.programa))) programas.push(p.programa); });
      return (
        <div className="space-y-6">
          {ruta}
          <p className="text-sm text-slate-600">Pulsa un programa para ver quién está inscrito y abrir su reporte.</p>
          <div className="grid gap-8 xl:grid-cols-[26rem_1fr]">
            <Rosca titulo={"Personas por programa · " + fac} datos={programas.map((n) => ({ nombre: n, clave: n, valor: gente.filter((p) => igual(p.programa, n)).length }))} alElegir={setProg} />
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="bg-brand-50 text-xs uppercase tracking-wider text-brand-800">
                  <tr>{["Programa", "Personas", "Con rondas", "Rondas", "Puntaje promedio"].map((h) => <th key={h} className="px-4 py-4 font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {programas.length ? programas.map((n) => {
                    const r = resumen(gente.filter((p) => igual(p.programa, n)));
                    return (
                      <tr key={n} tabIndex={0} onClick={() => setProg(n)} onKeyDown={(e) => e.key === "Enter" && setProg(n)} className={cx("cursor-pointer hover:bg-brand-50", !r.personas && "text-slate-400")}>
                        <td className="px-4 py-3 font-medium">{n}</td>
                        <td className="px-4 py-3 tabular-nums">{r.personas}</td>
                        <td className="px-4 py-3 tabular-nums">{r.activas}</td>
                        <td className="px-4 py-3 tabular-nums">{r.rondas}</td>
                        <td className="px-4 py-3"><Semaforo valor={r.prom} /></td>
                      </tr>
                    );
                  }) : <tr><td colSpan={5} className="px-4 py-6 text-slate-500">Esta facultad no tiene programas en la lista.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // Nivel 1: todas las facultades, tengan actividad o no (un programa en cero es información, no un hueco)
    const conAlguien = nombresFac.filter((n) => gente.some((p) => igual(p.facultad, n))).length;
    return (
      <div className="space-y-6">
        {ruta}
        <p className="text-sm text-slate-600">Están las {nombresFac.length} facultades, tengan actividad o no: {conAlguien} {conAlguien === 1 ? "tiene" : "tienen"} a alguien registrado. Pulsa una para ver sus programas.</p>
        <div className="grid gap-8 xl:grid-cols-[26rem_1fr]">
          <Rosca titulo="Personas por facultad" datos={nombresFac.map((n) => ({ nombre: n.replace(/^Facultad de /, "").replace(/^Escuela Internacional de /, "E. I. de "), clave: n, valor: gente.filter((p) => igual(p.facultad, n)).length }))} alElegir={(f) => { setFac(f); setProg(""); }} />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-brand-50 text-xs uppercase tracking-wider text-brand-800">
                <tr>{["Facultad", "Programas", "Personas", "Con rondas", "Rondas", "Puntaje promedio"].map((h) => <th key={h} className="px-4 py-4 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nombresFac.map((n) => {
                  const r = resumen(gente.filter((p) => igual(p.facultad, n)));
                  return (
                    <tr key={n} tabIndex={0} onClick={() => { setFac(n); setProg(""); }} onKeyDown={(e) => e.key === "Enter" && (setFac(n), setProg(""))} className={cx("cursor-pointer hover:bg-brand-50", !r.personas && "text-slate-400")}>
                      <td className="px-4 py-3 font-medium">{n}</td>
                      <td className="px-4 py-3 tabular-nums">{FACULTADES[n]?.length ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{r.personas}</td>
                      <td className="px-4 py-3 tabular-nums">{r.activas}</td>
                      <td className="px-4 py-3 tabular-nums">{r.rondas}</td>
                      <td className="px-4 py-3"><Semaforo valor={r.prom} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const visibles = personas.filter((p) => pasa(p.promedio));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <Badge>Estudio de Pitch</Badge>
          <h2 className="mt-3 text-3xl">Consolidado del servicio</h2>
          <p className="mt-2 text-sm text-slate-600">
            Personas que han iniciado sesión al menos una vez, hayan practicado o no. Las cuentas creadas pero nunca usadas no aparecen aquí.
            {datos.cuentasAdmin && !centro ? ` No se cuenta${datos.cuentasAdmin === 1 ? " la cuenta de administración." : ` las ${datos.cuentasAdmin} cuentas de administración.`}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="size-4 accent-brand-700" checked={centro} onChange={(e) => setCentro(e.target.checked)} />
            Incluir cuentas del Centro
          </label>
          <Button onClick={exportar}>Exportar todo (.csv)</Button>
          <Button variant="secondary" disabled={cargando} onClick={() => void cargar()}>{cargando ? "Actualizando…" : "Actualizar"}</Button>
        </div>
      </div>

      {datos.falloPerfiles && (
        <Alert tono="warn">
          <strong>La lista está incompleta.</strong> No se pudo leer la vista de perfiles ({datos.falloPerfiles}), así que solo aparecen las personas que ya practicaron. Vuelve a correr la migración completa: crea la vista <code>perfiles_admin</code>.
        </Alert>
      )}
      {error && <Alert tono="error">No se pudo actualizar: {error}</Alert>}
      {aviso && <Alert>{aviso}</Alert>}

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["Personas", nPersonas], ["Rondas", total], ["Facultades", nFac], ["Puntaje promedio", prom]].map(([k, v]) => (
          <Card key={k} className="p-6 sm:p-6">
            <dd className="text-4xl font-semibold tabular-nums text-brand-900">{v}</dd>
            <dt className="mt-1 text-sm text-slate-500">{k}</dt>
          </Card>
        ))}
      </dl>

      <div role="tablist" aria-label="Vistas del consolidado" className="flex gap-2 border-b border-slate-200">
        {([["personas", "Personas"], ["programas", "Por programa"], ["diagnostico", "Diagnóstico de IA"]] as [Pestana, string][]).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className={cx("-mb-px border-b-2 px-5 py-3 text-sm font-semibold transition-colors", pestana === k ? "border-brand-900 text-brand-900" : "border-transparent text-slate-500 hover:text-brand-700")}>{t}</button>
        ))}
      </div>

      {pestana === "personas" && (
        <div className="space-y-6">
          {Filtro}
          {filtro.size > 0 && <p className="text-sm text-slate-500">Mostrando {visibles.length} de {personas.length} {personas.length === 1 ? "persona" : "personas"}</p>}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-brand-50 text-xs uppercase tracking-wider text-brand-800">
                <tr>{["Persona", "Facultad", "Programa", "Rondas", "Último", "Promedio", ""].map((h, i) => <th key={i} className="px-4 py-4 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.length ? visibles.map((p) => (
                  <tr key={p.correo} className="cursor-pointer hover:bg-brand-50/60" onClick={() => setAbierta(p.correo)}>
                    <td className="px-4 py-3">{p.nombre || p.correo}<div className="text-xs text-slate-500">{p.correo}</div></td>
                    <td className="px-4 py-3">{p.facultad || "—"}</td>
                    <td className="px-4 py-3">{p.programa || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{p.total}</td>
                    <td className="px-4 py-3"><Semaforo valor={p.ultimo} /></td>
                    <td className="px-4 py-3"><Semaforo valor={p.promedio} /></td>
                    <td className="px-4 py-3"><button className="font-semibold text-brand-600 hover:underline" onClick={(e) => { e.stopPropagation(); setAbierta(p.correo); }}>Ver</button></td>
                  </tr>
                )) : <tr><td colSpan={7} className="px-4 py-6 text-slate-500">{personas.length ? "Nadie encaja con el semáforo elegido." : "Nadie se ha registrado todavía."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pestana === "programas" && vistaProgramas()}
      {pestana === "diagnostico" && <Diagnostico />}
    </div>
  );
}
