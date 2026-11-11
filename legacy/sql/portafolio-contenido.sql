-- ══════════════════════════════════════════════════════════════
--  EL PORTAFOLIO PASA A VIVIR EN LA CUENTA
--  Centro de Desarrollo Profesional · Universidad de La Sabana
--
--  Este script NO crea las tablas: eso ya está hecho. Lo que hace
--  es completar lo que le falta al esquema para que el frontend
--  pueda trabajar contra él sin perder nada:
--
--    1. Dos columnas de «proyectos» que el formulario tiene y la
--       tabla no: «acciones» y «competencias».
--    2. Las políticas que faltan. Sin ellas hay dos operaciones que
--       devuelven 200 y no hacen nada, que es la peor forma de
--       fallar: nadie se entera.
--    3. Las políticas duplicadas, que se retiran. Cada tabla tiene
--       hoy dos juegos con nombres distintos porque el script de
--       creación se corrió dos veces.
--    4. La vista del consolidado, que se cayó al rehacer
--       «portafolios» y dejó el panel del CDP en blanco.
--
--  Es idempotente: se puede correr las veces que haga falta.
--
--  REQUISITO PREVIO: la función public.es_admin(), que crea
--  «portafolios.sql». Por si acaso, aquí se vuelve a definir.
-- ══════════════════════════════════════════════════════════════

-- ── 1 · LO QUE LE FALTA A «proyectos» ─────────────────────────
-- Cada ficha del formulario tiene nueve casillas y la tabla siete.
-- Las dos que faltaban no son accesorias: «acciones» es la casilla
-- con el mínimo de palabras más alto (quince), la que pregunta qué
-- decidió la persona y qué descartó, y es justo lo que distingue
-- una ficha que se sostiene de una lista de tareas.
alter table public.proyectos
  add column if not exists acciones     text not null default '',
  add column if not exists competencias text not null default '';

-- ── 2 · «actualizado_en» se pone solo ─────────────────────────
-- El frontend lo manda en cada guardado, pero un disparador es más
-- fiable que confiar en que todos los clientes se acuerden.
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

drop trigger if exists proyectos_tocar on public.proyectos;
create trigger proyectos_tocar
  before update on public.proyectos
  for each row execute function public.tocar_actualizado();

drop trigger if exists secciones_tocar on public.secciones_portafolio;
create trigger secciones_tocar
  before update on public.secciones_portafolio
  for each row execute function public.tocar_actualizado();

-- ── 3 · QUIÉN ES ADMINISTRADOR ────────────────────────────────
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

-- ── 4 · LAS POLÍTICAS ─────────────────────────────────────────
-- Se retiran los dos juegos que había y se deja uno solo, con
-- nombres explícitos. Tener dos políticas equivalentes no es
-- peligroso (se combinan con OR) pero hace imposible leer de un
-- vistazo quién puede hacer qué.
drop policy if exists "usuario puede crear su portafolio"      on public.portafolios;
drop policy if exists "usuario puede ver su portafolio"        on public.portafolios;
drop policy if exists "usuarios crean su propio portafolio"    on public.portafolios;
drop policy if exists "usuarios ven su propio portafolio"      on public.portafolios;
drop policy if exists "usuarios actualizan su propio portafolio" on public.portafolios;
drop policy if exists portafolios_ver     on public.portafolios;
drop policy if exists portafolios_crear   on public.portafolios;
drop policy if exists portafolios_editar  on public.portafolios;
drop policy if exists portafolios_borrar  on public.portafolios;

create policy portafolios_ver on public.portafolios
  for select to authenticated using (usuario_id = auth.uid());

create policy portafolios_crear on public.portafolios
  for insert to authenticated with check (usuario_id = auth.uid());

create policy portafolios_editar on public.portafolios
  for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ESTA FALTABA. Sin ella «Empezar de nuevo» devuelve 200 y no borra
-- nada, y el derecho a retirar sus datos que la herramienta le
-- promete a cada persona en el acuerdo deja de ser efectivo.
create policy portafolios_borrar on public.portafolios
  for delete to authenticated using (usuario_id = auth.uid());

-- El administrador NO aparece aquí, y esto sigue siendo deliberado:
-- el borrador del portafolio solo lo lee su dueño. Ni siquiera con
-- rol de administración se puede consultar «portafolios»,
-- «proyectos» o «secciones_portafolio» directamente.
--
-- El consolidado no las consulta: entra por la vista de más abajo,
-- que se ejecuta con los permisos de su dueño y por eso sí puede
-- contar filas. Esa vista es la única puerta, y lo que deja pasar
-- lo decide su SELECT: cifras y las tres etiquetas de agrupación,
-- ni una palabra de lo que nadie escribió.
--
-- OJO SI ALGUIEN LA REESCRIBE: con «security_invoker = true» la
-- vista pasa a ejecutarse con los permisos de quien pregunta, y
-- como el administrador no los tiene, devuelve cero filas sin dar
-- ningún error. La pantalla dice entonces «todavía nadie ha abierto
-- un portafolio», que es indistinguible de que la herramienta no
-- esté guardando nada. Pasó, y costó encontrarlo.

drop policy if exists "usuario administra sus proyectos"   on public.proyectos;
drop policy if exists "usuarios gestionan sus proyectos"   on public.proyectos;
drop policy if exists proyectos_propios on public.proyectos;

create policy proyectos_propios on public.proyectos
  for all to authenticated
  using (portafolio_id in (select id from public.portafolios where usuario_id = auth.uid()))
  with check (portafolio_id in (select id from public.portafolios where usuario_id = auth.uid()));

drop policy if exists "usuarios gestionan sus secciones" on public.secciones_portafolio;
drop policy if exists secciones_propias on public.secciones_portafolio;

create policy secciones_propias on public.secciones_portafolio
  for all to authenticated
  using (portafolio_id in (select id from public.portafolios where usuario_id = auth.uid()))
  with check (portafolio_id in (select id from public.portafolios where usuario_id = auth.uid()));

drop policy if exists "usuario ve sus revisiones"  on public.revisiones_ia;
drop policy if exists "usuarios ven sus revisiones" on public.revisiones_ia;
drop policy if exists revisiones_ver    on public.revisiones_ia;
drop policy if exists revisiones_crear  on public.revisiones_ia;
drop policy if exists revisiones_borrar on public.revisiones_ia;

create policy revisiones_ver on public.revisiones_ia
  for select to authenticated using (usuario_id = auth.uid());

-- ESTA TAMBIÉN FALTABA. La tabla solo tenía SELECT, así que nadie
-- podía guardar una segunda opinión: se pedía, se veía en pantalla
-- y se perdía al recargar.
create policy revisiones_crear on public.revisiones_ia
  for insert to authenticated with check (usuario_id = auth.uid());

create policy revisiones_borrar on public.revisiones_ia
  for delete to authenticated using (usuario_id = auth.uid());

-- ── EL CENTRO PUEDE LEER LAS SEGUNDAS OPINIONES ───────────────
-- Esta política sí es una excepción a la regla anterior, y conviene
-- entender exactamente qué abre.
--
-- Una revisión es lo que el modelo respondió, no el portafolio. Pero
-- la instrucción le pide citar entre comillas las palabras del
-- estudiante cuando señala un problema, así que una observación
-- puede contener frases sueltas de su texto. No es el borrador; no
-- es texto anónimo tampoco.
--
-- Se abre porque el Centro de Desarrollo Profesional atiende a esa
-- persona: llegar a la asesoría sabiendo qué le señaló la máquina
-- ahorra media sesión. Lo que NO se abre es el borrador: el
-- portafolio en sí sigue siendo ilegible para cualquiera que no sea
-- su dueño, y eso no cambia con esta política.
--
-- Está dicho en pantalla, en la hoja «Antes de publicar» y en el pie
-- de la herramienta, antes de que nadie pulse el botón. Si algún día
-- se retira esta política, hay que quitarlo de ahí también.
drop policy if exists revisiones_ver_admin on public.revisiones_ia;
create policy revisiones_ver_admin on public.revisiones_ia
  for select to authenticated using (public.es_admin());

revoke all on public.portafolios          from anon;
revoke all on public.proyectos            from anon;
revoke all on public.secciones_portafolio from anon;
revoke all on public.revisiones_ia        from anon;

grant select, insert, update, delete on public.portafolios          to authenticated;
grant select, insert, update, delete on public.proyectos            to authenticated;
grant select, insert, update, delete on public.secciones_portafolio to authenticated;
grant select, insert, delete         on public.revisiones_ia        to authenticated;

-- ── 5 · EL CONSOLIDADO DEL CDP ────────────────────────────────
-- POR QUÉ ESTO ES UNA FUNCIÓN Y NO UNA VISTA
--
-- Fueron dos vistas antes que esto, y las dos devolvían cero filas.
--
-- La primera llevaba «security_invoker = true», así que corría con
-- los permisos de quien preguntaba: como el administrador no tiene
-- lectura sobre «portafolios», solo alcanzaba su propia fila, que
-- después descartaba el filtro. La segunda quitó ese ajuste, pero
-- siguió igual: una vista sin «security_invoker» se ejecuta con los
-- permisos de su dueño para los GRANT, y aun así el RLS de las
-- tablas se sigue aplicando a quien consulta.
--
-- Lo comprobamos midiéndolo, no razonándolo: haciéndose pasar por
-- la cuenta de administración, «select count(*) from portafolios»
-- devolvía 1 de 2 filas. La vista no estaba saltando nada.
--
-- Una función «security definer» sí: todo lo de dentro se ejecuta
-- con los permisos de quien la definió, y eso está garantizado por
-- el lenguaje y no por cómo Postgres trate a los dueños de vistas.
-- La puerta la cierra el «if not es_admin() then return» de la
-- primera línea, y lo que deja pasar lo decide su SELECT: cifras y
-- las tres etiquetas de agrupación, ni una palabra de lo que nadie
-- escribió.
--
-- Las tablas siguen SIN política de lectura para administración: el
-- borrador no se lee ni con rol. Esta función es el único camino.

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

-- ── QUE LA API SE ENTERE ──────────────────────────────────────
-- PostgREST guarda en caché el esquema y no siempre recoge una
-- función recién creada. Mientras no lo haga, la API responde
-- «Could not find the function public.portafolios_admin without
-- parameters in the schema cache»: la función existe, pero la API
-- no la ve. Esto se lo dice.
notify pgrst, 'reload schema';

-- ── COMPROBACIÓN ──────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'proyectos' and column_name in ('acciones','competencias');
--   -- deben salir las dos
--
--   select tablename, policyname, cmd from pg_policies
--    where tablename in ('portafolios','proyectos','secciones_portafolio','revisiones_ia')
--    order by tablename, policyname;
--   -- una sola política por operación, sin duplicados
--
--   La comprobación que de verdad importa, haciéndose pasar por una
--   cuenta de administración. Los dos números tienen que coincidir:
--
--   begin;
--     select set_config('request.jwt.claims',
--       '{"sub":"EL-UUID-DE-LA-CUENTA-ADMIN","role":"authenticated"}', true);
--     set local role authenticated;
--     select (select count(*) from public.portafolios)          as en_la_tabla,
--            (select count(*) from public.portafolios_admin())  as en_la_funcion;
--   rollback;
--
--   Si «en_la_funcion» sale menor, la función no está saltando el
--   RLS y hay que mirar su «security definer». Pasó dos veces con
--   vistas, que es justamente por lo que esto ya no es una vista.
