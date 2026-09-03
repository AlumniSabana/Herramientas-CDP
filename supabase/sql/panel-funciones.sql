-- ══════════════════════════════════════════════════════════════
--  SOLO LAS DOS FUNCIONES DEL PANEL
--  Para correr aparte si el script completo se corta.
--
--  Requiere que ya existan public.es_admin() y las cuatro tablas.
--  Es idempotente: se puede correr las veces que haga falta.
-- ══════════════════════════════════════════════════════════════

drop view if exists public.portafolios_admin;
drop function if exists public.portafolios_admin();

create function public.portafolios_admin()
returns table (
  usuario_id       uuid,
  correo           text,
  nombre           text,
  facultad         text,
  programa         text,
  area             text,
  etapa            text,
  objetivo         text,
  hojas_completas  integer,
  fichas_total     bigint,
  fichas_completas bigint,
  descargado       boolean,
  revisado_ia      boolean,
  es_admin         boolean,
  creado_en        timestamptz,
  actualizado_en   timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  with sec as (
    select
      s.portafolio_id,
      max(s.contenido) filter (where s.tipo = 'programa_nombre') as programa,
      max(s.contenido) filter (where s.tipo = 'facultad')        as facultad,
      max(s.contenido) filter (where s.tipo = 'area')            as area,
      bool_or(s.tipo = '_descargado' and coalesce(s.contenido, '') <> '') as descargado,
      bool_or(s.tipo in ('valor', 'campo')           and coalesce(s.contenido, '') <> '') as hay_identidad,
      bool_or(s.tipo in ('perfil', 'capacidades')    and coalesce(s.contenido, '') <> '') as hay_perfil,
      bool_or(s.tipo in ('logros', 'testimonio')     and coalesce(s.contenido, '') <> '') as hay_impacto,
      bool_or(s.tipo in ('correo', 'linkedin', 'cta') and coalesce(s.contenido, '') <> '') as hay_contacto
    from public.secciones_portafolio s
    group by s.portafolio_id
  ),
  proy as (
    select
      x.portafolio_id,
      count(*) as fichas_total,
      -- «Completa» aquí es más laxo que en pantalla: la interfaz
      -- exige un mínimo de palabras por casilla y en SQL solo se
      -- comprueba que no estén vacías.
      count(*) filter (
        where coalesce(x.nombre, '')     <> ''
          and coalesce(x.contexto, '')   <> ''
          and coalesce(x.objetivo, '')   <> ''
          and coalesce(x.rol, '')        <> ''
          and coalesce(x.acciones, '')   <> ''
          and coalesce(x.resultados, '') <> ''
          and coalesce(x.evidencia, '')  <> ''
      ) as fichas_completas
    from public.proyectos x
    group by x.portafolio_id
  )
  select
    p.usuario_id,
    f.correo,
    f.nombre,
    coalesce(nullif(s.facultad, ''), f.facultad) as facultad,
    coalesce(nullif(s.programa, ''), f.programa) as programa,
    s.area,
    p.etapa,
    p.objetivo,
    (   (case when coalesce(p.titulo, '') <> '' or coalesce(s.hay_identidad, false) then 1 else 0 end)
      + (case when coalesce(s.hay_perfil,   false) then 1 else 0 end)
      + (case when coalesce(pr.fichas_total, 0) > 0 then 1 else 0 end)
      + (case when coalesce(s.hay_impacto,  false) then 1 else 0 end)
      + (case when coalesce(s.hay_contacto, false) then 1 else 0 end)
    )::integer as hojas_completas,
    coalesce(pr.fichas_total, 0)     as fichas_total,
    coalesce(pr.fichas_completas, 0) as fichas_completas,
    coalesce(s.descargado, false)    as descargado,
    exists (select 1 from public.revisiones_ia r where r.portafolio_id = p.id) as revisado_ia,
    -- Las cuentas del propio Centro se marcan, no se esconden: quien
    -- administra necesita verse a sí mismo para saber que el guardado
    -- funciona. No cuentan como personas atendidas, y de eso se
    -- encarga la interfaz.
    coalesce(f.rol, 'usuario') = 'admin' as es_admin,
    p.creado_en,
    p.actualizado_en
  from public.portafolios p
  join public.perfiles f on f.id = p.usuario_id
  left join sec  s  on s.portafolio_id  = p.id
  left join proy pr on pr.portafolio_id = p.id
  where public.es_admin()
  order by p.actualizado_en desc;
$$;

revoke all on function public.portafolios_admin() from public, anon;
grant execute on function public.portafolios_admin() to authenticated;

-- ── LAS REVISIONES, CON NOMBRE Y PROGRAMA ─────────────────────
-- Mismo problema y misma solución. Cruza cada segunda opinión con
-- el perfil de quien la pidió, para que el consolidado no tenga que
-- hacer dos consultas y casarlas a mano.
drop view if exists public.revisiones_admin;
drop function if exists public.revisiones_admin();

create function public.revisiones_admin()
returns table (
  id            uuid,
  usuario_id    uuid,
  portafolio_id uuid,
  correo        text,
  nombre        text,
  facultad      text,
  programa      text,
  resultado     jsonb,
  es_admin      boolean,
  creado_en     timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id,
    r.usuario_id,
    r.portafolio_id,
    f.correo,
    f.nombre,
    coalesce(f.facultad, '') as facultad,
    coalesce(f.programa, '') as programa,
    r.resultado,
    coalesce(f.rol, 'usuario') = 'admin' as es_admin,
    r.creado_en
  from public.revisiones_ia r
  join public.perfiles f on f.id = r.usuario_id
  where public.es_admin()
  order by r.creado_en desc;
$$;

revoke all on function public.revisiones_admin() from public, anon;
grant execute on function public.revisiones_admin() to authenticated;

notify pgrst, 'reload schema';
