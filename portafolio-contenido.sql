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
-- el borrador del portafolio solo lo lee su dueño. El consolidado se
-- alimenta de la vista de más abajo, que cuenta filas y no devuelve
-- una sola palabra de lo que nadie escribió.

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
-- La vista se cayó al rehacer «portafolios» y el panel quedó en
-- blanco. Se reconstruye, pero calculando: antes las cifras las
-- mandaba el navegador en una tabla de métricas aparte, y una cifra
-- que manda el cliente puede quedar desfasada. Ahora salen del
-- contenido real, que es la única fuente que no puede mentir.
--
-- LO QUE NO DEVUELVE es una sola palabra del portafolio. Cuenta
-- fichas y secciones llenas; no expone su texto. Si algún día el
-- Centro necesita leerlos, no basta con ampliar esta vista: hay que
-- decírselo antes en pantalla a quien los escribe.
drop view if exists public.portafolios_admin;
create view public.portafolios_admin
with (security_invoker = true)
as
with sec as (
  select
    portafolio_id,
    max(contenido) filter (where tipo = 'programa_nombre') as programa,
    max(contenido) filter (where tipo = 'facultad')        as facultad,
    max(contenido) filter (where tipo = 'area')            as area,
    bool_or(tipo = '_descargado' and coalesce(contenido, '') <> '') as descargado,
    bool_or(tipo in ('valor', 'campo')       and coalesce(contenido, '') <> '') as hay_identidad,
    bool_or(tipo in ('perfil', 'capacidades') and coalesce(contenido, '') <> '') as hay_perfil,
    bool_or(tipo in ('logros', 'testimonio')  and coalesce(contenido, '') <> '') as hay_impacto,
    bool_or(tipo in ('correo', 'linkedin', 'cta') and coalesce(contenido, '') <> '') as hay_contacto
  from public.secciones_portafolio
  group by portafolio_id
),
proy as (
  select
    portafolio_id,
    count(*) as fichas_total,
    -- «Completa» aquí es más laxo que en pantalla: la interfaz exige
    -- un mínimo de palabras por casilla y en SQL solo se comprueba
    -- que no estén vacías. Sirve para el consolidado; no es la misma
    -- regla que le abre la puerta a la siguiente hoja.
    count(*) filter (
      where coalesce(nombre, '')     <> ''
        and coalesce(contexto, '')   <> ''
        and coalesce(objetivo, '')   <> ''
        and coalesce(rol, '')        <> ''
        and coalesce(acciones, '')   <> ''
        and coalesce(resultados, '') <> ''
        and coalesce(evidencia, '')  <> ''
    ) as fichas_completas
  from public.proyectos
  group by portafolio_id
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
  ) as hojas_completas,
  coalesce(pr.fichas_total, 0)     as fichas_total,
  coalesce(pr.fichas_completas, 0) as fichas_completas,
  coalesce(s.descargado, false)    as descargado,
  exists (select 1 from public.revisiones_ia r where r.portafolio_id = p.id) as revisado_ia,
  p.creado_en,
  p.actualizado_en
from public.portafolios p
join public.perfiles f on f.id = p.usuario_id
left join sec  s  on s.portafolio_id  = p.id
left join proy pr on pr.portafolio_id = p.id
where public.es_admin()
  and coalesce(f.rol, 'usuario') <> 'admin';

revoke all on public.portafolios_admin from anon;
grant select on public.portafolios_admin to authenticated;

-- ── LAS REVISIONES, CON NOMBRE Y PROGRAMA ─────────────────────
-- Cruza cada segunda opinión con el perfil de quien la pidió, para
-- que el consolidado no tenga que hacer dos consultas y casarlas a
-- mano. Solo devuelve filas a quien tiene rol de administración y
-- deja fuera las de las propias cuentas del Centro.
drop view if exists public.revisiones_admin;
create view public.revisiones_admin
with (security_invoker = true)
as
  select
    r.id,
    r.usuario_id,
    r.portafolio_id,
    f.correo,
    f.nombre,
    coalesce(f.facultad, '') as facultad,
    coalesce(f.programa, '') as programa,
    r.resultado,
    r.creado_en
  from public.revisiones_ia r
  join public.perfiles f on f.id = r.usuario_id
  where public.es_admin()
    and coalesce(f.rol, 'usuario') <> 'admin';

revoke all on public.revisiones_admin from anon;
grant select on public.revisiones_admin to authenticated;

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
--   select count(*) from public.portafolios_admin;
--   select count(*) from public.revisiones_admin;
--   -- desde una cuenta de administración, las dos sin error
