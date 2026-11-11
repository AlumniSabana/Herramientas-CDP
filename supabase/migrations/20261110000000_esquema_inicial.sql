-- ══════════════════════════════════════════════════════════════
--  HERRAMIENTAS DEL CDP · ESQUEMA COMPLETO (instalación desde cero)
--  Centro de Desarrollo Profesional · Universidad de La Sabana
--
--  Reemplaza a todos los scripts sueltos anteriores (portafolios.sql,
--  revisiones.sql, portafolio-contenido.sql, panel-funciones.sql,
--  seguridad-confirmacion.sql). Se corre UNA vez, completo, en
--  Supabase → SQL Editor, sobre un proyecto vacío. Es idempotente:
--  repetirlo no borra datos.
--
--  Modelo de privacidad (no cambia respecto a la versión anterior):
--    · cada persona solo lee y escribe lo suyo (RLS);
--    · el borrador del portafolio (portafolios.contenido) lo lee
--      únicamente su dueño, ni siquiera el administrador;
--    · el administrador entra por vistas que solo exponen métricas;
--    · el audio nunca llega a la base.
-- ══════════════════════════════════════════════════════════════

-- ── 1 · PERFILES ──────────────────────────────────────────────
create table if not exists public.perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  correo          text not null,
  nombre          text not null default '',
  facultad        text not null default '',
  programa        text not null default '',
  rol             text not null default 'usuario' check (rol in ('usuario', 'admin')),
  acuerdo_version text,
  acuerdo_fecha   timestamptz,
  creado_en       timestamptz not null default now(),
  ultimo_acceso   timestamptz
);

-- ── 2 · ¿QUIÉN ES ADMINISTRADOR? ──────────────────────────────
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;
revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- ── 3 · REGISTRO: dominio institucional, acuerdo y perfil ─────
create or replace function public.validar_registro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email !~* '@unisabana\.edu\.co$' then
    raise exception 'Debes utilizar un correo institucional @unisabana.edu.co';
  end if;
  if coalesce(new.raw_user_meta_data->>'acuerdo_version', '') = '' then
    raise exception 'Debes aceptar el acuerdo de confidencialidad.';
  end if;
  return new;
end;
$$;

-- El perfil nace al CONFIRMAR el correo, no al registrarse: quien
-- nunca confirmó no aparece en ningún consolidado.
create or replace function public.crear_perfil_confirmado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  insert into public.perfiles (id, correo, nombre, facultad, programa, acuerdo_version, acuerdo_fecha)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'nombre',   ''),
    coalesce(new.raw_user_meta_data->>'facultad', ''),
    coalesce(new.raw_user_meta_data->>'programa', ''),
    new.raw_user_meta_data->>'acuerdo_version',
    coalesce(nullif(new.raw_user_meta_data->>'acuerdo_fecha', '')::timestamptz, now())
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_validar_registro on auth.users;
create trigger al_validar_registro
  before insert on auth.users
  for each row execute function public.validar_registro();

drop trigger if exists al_confirmar_correo on auth.users;
create trigger al_confirmar_correo
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.crear_perfil_confirmado();

drop trigger if exists al_crear_usuario_confirmado on auth.users;
create trigger al_crear_usuario_confirmado
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.crear_perfil_confirmado();

-- ── 4 · ESTUDIO DE PITCH: rondas ──────────────────────────────
-- Una fila por práctica. Solo texto y cifras; NUNCA audio ni video.
create table if not exists public.rondas (
  id                  uuid primary key default gen_random_uuid(),
  usuario_id          uuid not null references auth.users(id) on delete cascade,
  creada_en           timestamptz not null default now(),
  tipo                text,
  tipo_nombre         text,
  duracion_objetivo   integer,
  duracion_real       integer,
  modo                text,
  puntaje             integer,
  palabras            integer,
  ppm                 integer,
  muletillas_total    integer,
  muletillas_top      jsonb not null default '[]'::jsonb,
  secciones_cubiertas integer,
  secciones_total     integer,
  dimensiones         jsonb not null default '[]'::jsonb,
  ejercicio           jsonb,
  visual              jsonb,
  transcripcion       text not null default '',
  observaciones       text
);
create index if not exists rondas_usuario_idx on public.rondas (usuario_id, creada_en desc);

-- ── 5 · PORTAFOLIO ────────────────────────────────────────────
-- Una fila por persona. «contenido» es el borrador completo (privado);
-- el resto son métricas que sí puede ver el Centro.
create table if not exists public.portafolios (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null unique references auth.users(id) on delete cascade,
  contenido        jsonb not null default '{}'::jsonb,
  programa         text,
  facultad         text,
  area             text,
  etapa            text,
  objetivo         text,
  hojas_completas  integer not null default 0 check (hojas_completas between 0 and 5),
  fichas_total     integer not null default 0 check (fichas_total >= 0),
  fichas_completas integer not null default 0 check (fichas_completas >= 0),
  descargado       boolean not null default false,
  revisado_ia      boolean not null default false,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create or replace function public.tocar_actualizado()
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
  for each row execute function public.tocar_actualizado();

-- Segundas opiniones de la IA sobre el portafolio (se guardan las 10 últimas).
create table if not exists public.revisiones_ia (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  portafolio_id uuid references public.portafolios(id) on delete cascade,
  resultado     jsonb not null default '{}'::jsonb,
  creado_en     timestamptz not null default now()
);
create index if not exists revisiones_ia_usuario_idx on public.revisiones_ia (usuario_id, creado_en desc);

create or replace function public.revisiones_ia_podar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.revisiones_ia
   where usuario_id = new.usuario_id
     and id not in (
       select id from public.revisiones_ia
        where usuario_id = new.usuario_id
        order by creado_en desc
        limit 10
     );
  return null;
end;
$$;

drop trigger if exists revisiones_ia_podar on public.revisiones_ia;
create trigger revisiones_ia_podar
  after insert on public.revisiones_ia
  for each row execute function public.revisiones_ia_podar();


-- ── 5b · SI YA EXISTÍAN TABLAS DEL ESQUEMA ANTERIOR ───────────
-- «create table if not exists» no toca una tabla vieja, así que se
-- completan aquí las columnas que el esquema nuevo necesita.
alter table public.perfiles add column if not exists correo text;
alter table public.perfiles add column if not exists nombre text not null default '';
alter table public.perfiles add column if not exists facultad text not null default '';
alter table public.perfiles add column if not exists programa text not null default '';
alter table public.perfiles add column if not exists rol text not null default 'usuario';
alter table public.perfiles add column if not exists acuerdo_version text;
alter table public.perfiles add column if not exists acuerdo_fecha timestamptz;
alter table public.perfiles add column if not exists creado_en timestamptz not null default now();
alter table public.perfiles add column if not exists ultimo_acceso timestamptz;

alter table public.rondas add column if not exists creada_en timestamptz not null default now();
alter table public.rondas add column if not exists tipo text;
alter table public.rondas add column if not exists tipo_nombre text;
alter table public.rondas add column if not exists duracion_objetivo integer;
alter table public.rondas add column if not exists duracion_real integer;
alter table public.rondas add column if not exists modo text;
alter table public.rondas add column if not exists puntaje integer;
alter table public.rondas add column if not exists palabras integer;
alter table public.rondas add column if not exists ppm integer;
alter table public.rondas add column if not exists muletillas_total integer;
alter table public.rondas add column if not exists muletillas_top jsonb not null default '[]'::jsonb;
alter table public.rondas add column if not exists secciones_cubiertas integer;
alter table public.rondas add column if not exists secciones_total integer;
alter table public.rondas add column if not exists dimensiones jsonb not null default '[]'::jsonb;
alter table public.rondas add column if not exists ejercicio jsonb;
alter table public.rondas add column if not exists visual jsonb;
alter table public.rondas add column if not exists transcripcion text not null default '';
alter table public.rondas add column if not exists observaciones text;

alter table public.portafolios add column if not exists contenido jsonb not null default '{}'::jsonb;
alter table public.portafolios add column if not exists programa text;
alter table public.portafolios add column if not exists facultad text;
alter table public.portafolios add column if not exists area text;
alter table public.portafolios add column if not exists etapa text;
alter table public.portafolios add column if not exists objetivo text;
alter table public.portafolios add column if not exists hojas_completas integer not null default 0;
alter table public.portafolios add column if not exists fichas_total integer not null default 0;
alter table public.portafolios add column if not exists fichas_completas integer not null default 0;
alter table public.portafolios add column if not exists descargado boolean not null default false;
alter table public.portafolios add column if not exists revisado_ia boolean not null default false;
alter table public.portafolios add column if not exists creado_en timestamptz not null default now();
alter table public.portafolios add column if not exists actualizado_en timestamptz not null default now();

alter table public.revisiones_ia add column if not exists portafolio_id uuid;
alter table public.revisiones_ia add column if not exists resultado jsonb not null default '{}'::jsonb;
alter table public.revisiones_ia add column if not exists creado_en timestamptz not null default now();

-- El guardado hace upsert por usuario_id: tiene que ser único.
create unique index if not exists portafolios_usuario_uq on public.portafolios (usuario_id);

-- Las funciones del esquema anterior se retiran: ahora son vistas.
drop function if exists public.portafolios_admin();
drop function if exists public.revisiones_admin();

-- Lo que había escrito en las tablas viejas (secciones_portafolio y
-- proyectos) se pasa al borrador nuevo. Si no existen, no hace nada;
-- si algo falla, avisa y sigue: no bloquea la migración.
do $mig$
begin
  if to_regclass('public.secciones_portafolio') is not null and to_regclass('public.proyectos') is not null then
    begin
      update public.portafolios p set contenido = jsonb_build_object(
        'seleccion',    coalesce(m.d->>'programa', ''),
        'area',         coalesce(m.d->>'area', ''),
        'programa',     coalesce(m.d->>'programa_nombre', ''),
        'facultad',     coalesce(m.d->>'facultad', ''),
        'etapa',        coalesce(p.etapa, 'estudiante'),
        'objetivo',     coalesce(p.objetivo, 'practica'),
        'audiencia',    coalesce(m.d->>'audiencia', ''),
        'nombre',       coalesce(p.titulo, ''),
        'campo',        coalesce(m.d->>'campo', ''),
        'valor',        coalesce(m.d->>'valor', ''),
        'perfil',       coalesce(m.d->>'perfil', ''),
        'capacidades',  coalesce(m.d->>'capacidades', ''),
        'herramientas', coalesce(m.d->>'herramientas', ''),
        'formacion',    coalesce(m.d->>'formacion', ''),
        'logros',       coalesce(m.d->>'logros', ''),
        'testimonio',   coalesce(m.d->>'testimonio', ''),
        'correo',       coalesce(m.d->>'correo', ''),
        'linkedin',     coalesce(m.d->>'linkedin', ''),
        'otro',         coalesce(m.d->>'contacto_otro', ''),
        'cta',          coalesce(m.d->>'cta', ''),
        'check',        coalesce((nullif(m.d->>'_checklist', ''))::jsonb, '{}'::jsonb),
        'proyectos',    coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', x.id::text, 'titulo', coalesce(x.nombre, ''), 'contexto', coalesce(x.contexto, ''),
            'objetivo', coalesce(x.objetivo, ''), 'rol', coalesce(x.rol, ''), 'acciones', coalesce(x.acciones, ''),
            'herr', coalesce(x.herramientas, ''), 'resultado', coalesce(x.resultados, ''),
            'evidencia', coalesce(x.evidencia, ''), 'competencias', coalesce(x.competencias, '')
          ) order by x.orden)
          from public.proyectos x where x.portafolio_id = p.id
        ), '[]'::jsonb)
      )
      from (
        select p2.id as pid,
               (select jsonb_object_agg(s.tipo, s.contenido) from public.secciones_portafolio s where s.portafolio_id = p2.id) as d
          from public.portafolios p2
      ) m
      where m.pid = p.id and p.contenido = '{}'::jsonb and m.d is not null;
    exception when others then
      raise notice 'No se pudo copiar el borrador anterior: %', sqlerrm;
    end;
  end if;
end
$mig$;

-- ── 6 · SEGURIDAD (RLS) ───────────────────────────────────────
alter table public.perfiles      enable row level security;
alter table public.rondas        enable row level security;
alter table public.portafolios   enable row level security;
alter table public.revisiones_ia enable row level security;

-- Se retiran todas las políticas previas (el esquema anterior dejaba
-- varias duplicadas y alguna le daba al administrador lectura del borrador).
do $pol$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
            where schemaname = 'public' and tablename in ('perfiles', 'rondas', 'portafolios', 'revisiones_ia')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end
$pol$;

-- perfiles: cada quien ve y toca lo suyo. El rol NO se puede cambiar
-- desde el cliente (ver los permisos por columna más abajo).
drop policy if exists perfiles_ver    on public.perfiles;
drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_ver    on public.perfiles for select to authenticated using (id = auth.uid());
create policy perfiles_editar on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- rondas
drop policy if exists rondas_ver    on public.rondas;
drop policy if exists rondas_crear  on public.rondas;
drop policy if exists rondas_editar on public.rondas;
drop policy if exists rondas_borrar on public.rondas;
create policy rondas_ver    on public.rondas for select to authenticated using (usuario_id = auth.uid());
create policy rondas_crear  on public.rondas for insert to authenticated with check (usuario_id = auth.uid());
create policy rondas_editar on public.rondas for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy rondas_borrar on public.rondas for delete to authenticated using (usuario_id = auth.uid());

-- portafolios: solo el dueño, también para el administrador.
drop policy if exists portafolios_ver    on public.portafolios;
drop policy if exists portafolios_crear  on public.portafolios;
drop policy if exists portafolios_editar on public.portafolios;
drop policy if exists portafolios_borrar on public.portafolios;
create policy portafolios_ver    on public.portafolios for select to authenticated using (usuario_id = auth.uid());
create policy portafolios_crear  on public.portafolios for insert to authenticated with check (usuario_id = auth.uid());
create policy portafolios_editar on public.portafolios for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy portafolios_borrar on public.portafolios for delete to authenticated using (usuario_id = auth.uid());

-- revisiones_ia: el dueño las ve, las crea y las borra.
drop policy if exists revisiones_ver    on public.revisiones_ia;
drop policy if exists revisiones_crear  on public.revisiones_ia;
drop policy if exists revisiones_borrar on public.revisiones_ia;
create policy revisiones_ver    on public.revisiones_ia for select to authenticated using (usuario_id = auth.uid());
create policy revisiones_crear  on public.revisiones_ia for insert to authenticated with check (usuario_id = auth.uid());
create policy revisiones_borrar on public.revisiones_ia for delete to authenticated using (usuario_id = auth.uid());

-- ── 7 · PERMISOS ──────────────────────────────────────────────
revoke all on public.perfiles, public.rondas, public.portafolios, public.revisiones_ia from anon;

grant select on public.perfiles to authenticated;
-- Solo estas columnas: «rol» queda fuera a propósito, o cualquiera se haría admin.
grant update (ultimo_acceso, nombre, facultad, programa) on public.perfiles to authenticated;
grant select, insert, update, delete on public.rondas        to authenticated;
grant select, insert, update, delete on public.portafolios   to authenticated;
grant select, insert, delete         on public.revisiones_ia to authenticated;

-- ── 8 · VISTAS DEL ADMINISTRADOR ──────────────────────────────
-- Se ejecutan con los permisos de su dueño (se saltan RLS) y se
-- filtran ellas mismas con es_admin(): quien no es admin recibe 0
-- filas. NO les pongas «security_invoker = true»: el consolidado
-- quedaría vacío sin dar ningún error.

drop view if exists public.perfiles_admin;
create view public.perfiles_admin as
  select p.id, p.correo, p.nombre, p.facultad, p.programa, p.rol, p.creado_en, p.ultimo_acceso
    from public.perfiles p
    join auth.users u on u.id = p.id
   where public.es_admin() and u.email_confirmed_at is not null;

drop view if exists public.rondas_admin;
create view public.rondas_admin as
  select r.*, p.correo, p.nombre, p.facultad, p.programa, (p.rol = 'admin') as es_admin
    from public.rondas r
    join public.perfiles p on p.id = r.usuario_id
   where public.es_admin();

-- Solo métricas: «contenido» (el borrador) no sale por aquí.
drop view if exists public.portafolios_admin;
create view public.portafolios_admin as
  select f.usuario_id, p.correo, p.nombre,
         coalesce(nullif(f.facultad, ''), p.facultad) as facultad,
         coalesce(nullif(f.programa, ''), p.programa) as programa,
         f.area, f.etapa, f.objetivo,
         f.hojas_completas, f.fichas_total, f.fichas_completas,
         f.descargado, f.revisado_ia, (p.rol = 'admin') as es_admin,
         f.creado_en, f.actualizado_en
    from public.portafolios f
    join public.perfiles p on p.id = f.usuario_id
   where public.es_admin();

-- El Centro puede leer qué le señaló la IA a cada persona (ver aviso en pantalla).
drop view if exists public.revisiones_admin;
create view public.revisiones_admin as
  select r.id, r.usuario_id, r.portafolio_id, p.correo, p.nombre, p.facultad, p.programa,
         r.resultado, (p.rol = 'admin') as es_admin, r.creado_en
    from public.revisiones_ia r
    join public.perfiles p on p.id = r.usuario_id
   where public.es_admin();

revoke all on public.perfiles_admin, public.rondas_admin, public.portafolios_admin, public.revisiones_admin from public, anon;
grant select on public.perfiles_admin, public.rondas_admin, public.portafolios_admin, public.revisiones_admin to authenticated;

notify pgrst, 'reload schema';

-- ── 9 · PRIMER ADMINISTRADOR ──────────────────────────────────
-- Después de que esa persona se registre y confirme su correo:
--
--   update public.perfiles set rol = 'admin'
--    where lower(correo) = 'desarrolloprofesional@unisabana.edu.co';
--
-- (Se corre desde el SQL Editor, que no pasa por los permisos por columna.)
