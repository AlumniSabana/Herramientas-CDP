-- ══════════════════════════════════════════════════════════════
--  USO DE «CONSTRUYE TU PORTAFOLIO»
--  Centro de Desarrollo Profesional · Universidad de La Sabana
--
--  QUÉ GUARDA Y QUÉ NO
--  Guarda cuánto ha avanzado cada persona: su programa, su etapa,
--  cuántas hojas lleva completas y cuántas fichas de proyecto ha
--  escrito. NO guarda una sola palabra del borrador.
--
--  Esa distinción es la que sostiene la promesa que la herramienta
--  le hace al estudiante en pantalla: el texto de su portafolio no
--  sale de su navegador. Si algún día alguien añade aquí una
--  columna con el contenido, esa promesa deja de ser cierta y hay
--  que cambiarla en la interfaz antes que en la base.
--
--  La única cosa del portafolio que sí se guarda en el servidor
--  está en otra tabla, «revisiones» (script revisiones.sql): la
--  respuesta que devuelve la inteligencia artificial cuando alguien
--  pide una segunda opinión. Es la RESPUESTA, no el borrador, y no
--  la lee nadie más que su dueño, ni siquiera el administrador.
--  Está separada de esta tabla justamente para que la diferencia
--  siga siendo evidente al leer el esquema.
--
--  UNA FILA POR PERSONA, no por evento. Interesa en qué punto está
--  cada quien, no reconstruir su sesión minuto a minuto.
--
--  El script es idempotente: se puede correr sobre una instalación
--  existente las veces que haga falta, sin perder datos.
-- ══════════════════════════════════════════════════════════════

-- ── LA TABLA ──────────────────────────────────────────────────
create table if not exists public.portafolios (
  usuario_id        uuid primary key references auth.users(id) on delete cascade,

  -- Contexto declarado en la hoja «Tu programa»
  programa          text,
  facultad          text,
  area              text,
  etapa             text,
  objetivo          text,

  -- Avance. Las cinco secciones de la construcción del portafolio.
  hojas_completas   integer not null default 0 check (hojas_completas between 0 and 5),
  fichas_total      integer not null default 0 check (fichas_total >= 0),
  fichas_completas  integer not null default 0 check (fichas_completas >= 0),

  -- Hitos
  descargado        boolean not null default false,   -- generó el PDF
  revisado_ia       boolean not null default false,   -- pidió la revisión

  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

comment on table public.portafolios is
  'Avance de cada persona en «Construye tu portafolio». Métricas, nunca el texto del borrador.';

-- Columnas que pudieran faltar si la tabla se creó con una versión
-- anterior de este script.
alter table public.portafolios add column if not exists area          text;
alter table public.portafolios add column if not exists etapa         text;
alter table public.portafolios add column if not exists objetivo      text;
alter table public.portafolios add column if not exists revisado_ia   boolean not null default false;

create index if not exists portafolios_actualizado_idx
  on public.portafolios (actualizado_en desc);

-- ── «actualizado_en» se pone solo ─────────────────────────────
create or replace function public.portafolios_tocar()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists portafolios_tocar on public.portafolios;
create trigger portafolios_tocar
  before update on public.portafolios
  for each row execute function public.portafolios_tocar();

-- ── QUIÉN ES ADMINISTRADOR ────────────────────────────────────
-- Se consulta «perfiles», que es donde vive el rol. La función es
-- «security definer» para que la comprobación no dependa de las
-- políticas de «perfiles» y no se produzca una recursión.
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

-- ── PERMISOS ──────────────────────────────────────────────────
alter table public.portafolios enable row level security;

-- Cada quien ve y escribe SOLO su propia fila. El administrador
-- puede leer todas, pero no escribir en ninguna: el panel es para
-- mirar, no para editar el avance de nadie.
drop policy if exists portafolios_leer_propio      on public.portafolios;
drop policy if exists portafolios_leer_admin       on public.portafolios;
drop policy if exists portafolios_insertar_propio  on public.portafolios;
drop policy if exists portafolios_actualizar_propio on public.portafolios;
drop policy if exists portafolios_borrar_propio    on public.portafolios;

create policy portafolios_leer_propio on public.portafolios
  for select to authenticated
  using (usuario_id = auth.uid());

create policy portafolios_leer_admin on public.portafolios
  for select to authenticated
  using (public.es_admin());

create policy portafolios_insertar_propio on public.portafolios
  for insert to authenticated
  with check (usuario_id = auth.uid());

create policy portafolios_actualizar_propio on public.portafolios
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Que cada quien pueda borrar su propio rastro no es un lujo: es
-- parte del derecho a solicitar la eliminación de sus datos que la
-- herramienta le promete en el acuerdo.
create policy portafolios_borrar_propio on public.portafolios
  for delete to authenticated
  using (usuario_id = auth.uid());

-- Quien no ha iniciado sesión no puede tocar nada.
revoke all on public.portafolios from anon;
grant select, insert, update, delete on public.portafolios to authenticated;

-- ── VISTA PARA EL CONSOLIDADO ─────────────────────────────────
-- Cruza el avance con el perfil para tener nombre y correo en una
-- sola consulta. Solo devuelve filas a quien tenga rol de
-- administrador, y deja fuera a las propias cuentas de
-- administración: no son personas atendidas por el servicio.
drop view if exists public.portafolios_admin;
create view public.portafolios_admin
with (security_invoker = true)
as
  select
    p.usuario_id,
    f.correo,
    f.nombre,
    coalesce(nullif(p.facultad, ''), f.facultad) as facultad,
    coalesce(nullif(p.programa, ''), f.programa) as programa,
    p.area,
    p.etapa,
    p.objetivo,
    p.hojas_completas,
    p.fichas_total,
    p.fichas_completas,
    p.descargado,
    p.revisado_ia,
    p.creado_en,
    p.actualizado_en
  from public.portafolios p
  join public.perfiles f on f.id = p.usuario_id
  where public.es_admin()
    and coalesce(f.rol, 'usuario') <> 'admin';

revoke all on public.portafolios_admin from anon;
grant select on public.portafolios_admin to authenticated;

-- ── COMPROBACIÓN ──────────────────────────────────────────────
-- Al terminar deberías ver la tabla, las cinco políticas y la vista.
--
--   select tablename, policyname, cmd
--     from pg_policies
--    where tablename = 'portafolios'
--    order by policyname;
--
--   select count(*) from public.portafolios_admin;
