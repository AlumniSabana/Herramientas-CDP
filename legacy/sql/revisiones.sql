-- ══════════════════════════════════════════════════════════════
--  SEGUNDAS OPINIONES DEL PORTAFOLIO
--  Centro de Desarrollo Profesional · Universidad de La Sabana
--
--  QUÉ GUARDA
--  Lo que el modelo de inteligencia artificial respondió cuando
--  alguien pidió una revisión de su portafolio: el veredicto, la
--  prioridad y las observaciones por ficha y por sección.
--
--  QUÉ NO GUARDA
--  El borrador del portafolio. Esa sigue siendo la promesa que la
--  herramienta hace en pantalla, y sigue siendo cierta: el texto
--  que la persona escribe no sale de su navegador. Lo que se guarda
--  aquí es la RESPUESTA, no la pregunta.
--
--  Hay un matiz que conviene tener presente antes de tocar esta
--  tabla: la instrucción que recibe el modelo le pide citar las
--  palabras del estudiante cuando señala un problema, así que una
--  observación puede contener frases sueltas de su portafolio. No
--  es el borrador, pero tampoco es texto anónimo. Por eso esta
--  tabla es estrictamente privada: solo la lee su dueño. Ni
--  siquiera el administrador, que sí puede ver el avance en
--  «portafolios» y las rondas del Pitch, tiene acceso a esto.
--  Si algún día el Centro necesita leerlas, no basta con añadir
--  una política: hay que decírselo antes a quien las escribe.
--
--  POR QUÉ SE GUARDAN
--  Antes la revisión vivía solo en la pantalla y desaparecía al
--  recargar. Quien quería releerla gastaba otra petición para
--  recibir lo mismo, y comparar la de hoy con la de hace dos
--  semanas (que es donde de verdad se ve si el portafolio mejoró)
--  era imposible.
--
--  El script es idempotente: se puede correr las veces que haga
--  falta sobre una instalación existente, sin perder datos.
--
--  REQUISITO PREVIO
--  Necesita la función public.es_admin(), que crea el script
--  «portafolios.sql». Corre aquel primero si aún no lo has hecho.
-- ══════════════════════════════════════════════════════════════

-- ── LA TABLA ──────────────────────────────────────────────────
create table if not exists public.revisiones (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,

  -- El resumen, en columnas propias porque es lo que se lista sin
  -- tener que abrir la revisión entera.
  veredicto    text,
  listo        boolean not null default false,
  prioridad    text,
  fichas       integer not null default 0 check (fichas >= 0),

  -- Las observaciones por ficha y por sección. Va en JSON a
  -- propósito: la forma de la respuesta la decide la Edge Function
  -- «revisar-portafolio», y no tiene sentido migrar la tabla cada
  -- vez que allí se añada un campo.
  detalle      jsonb not null default '{}'::jsonb,

  creada_en    timestamptz not null default now()
);

comment on table public.revisiones is
  'Revisiones con IA del portafolio. Guarda la respuesta del modelo, nunca el borrador. Privada: solo la lee su dueño.';

create index if not exists revisiones_usuario_idx
  on public.revisiones (usuario_id, creada_en desc);

-- ── SOLO SE GUARDAN LAS DIEZ ÚLTIMAS ──────────────────────────
-- Un portafolio se revisa cinco o seis veces mientras se escribe.
-- Guardar todas las de siempre no le sirve a nadie y convierte la
-- tabla en un archivo de texto ajeno que hay que custodiar. Diez
-- alcanzan de sobra para ver la evolución.
create or replace function public.revisiones_podar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.revisiones r
   where r.usuario_id = new.usuario_id
     and r.id not in (
       select id from public.revisiones
        where usuario_id = new.usuario_id
        order by creada_en desc
        limit 10
     );
  return null;
end;
$$;

drop trigger if exists revisiones_podar on public.revisiones;
create trigger revisiones_podar
  after insert on public.revisiones
  for each row execute function public.revisiones_podar();

-- ── PERMISOS ──────────────────────────────────────────────────
alter table public.revisiones enable row level security;

drop policy if exists revisiones_leer_propio    on public.revisiones;
drop policy if exists revisiones_insertar_propio on public.revisiones;
drop policy if exists revisiones_borrar_propio  on public.revisiones;
-- Por si una versión anterior de este script hubiera dejado una
-- política de administrador: aquí no la hay, y conviene que no
-- quede rastro de ella.
drop policy if exists revisiones_leer_admin     on public.revisiones;

create policy revisiones_leer_propio on public.revisiones
  for select to authenticated
  using (usuario_id = auth.uid());

create policy revisiones_insertar_propio on public.revisiones
  for insert to authenticated
  with check (usuario_id = auth.uid());

-- Poder borrarlas es parte del derecho a retirar sus datos que la
-- herramienta le promete a cada persona en el acuerdo.
create policy revisiones_borrar_propio on public.revisiones
  for delete to authenticated
  using (usuario_id = auth.uid());

-- No hay política de actualización: una revisión es lo que el
-- modelo respondió ese día. Si cambia, deja de ser eso.

revoke all on public.revisiones from anon;
grant select, insert, delete on public.revisiones to authenticated;

-- ── COMPROBACIÓN ──────────────────────────────────────────────
-- Al terminar deberías ver la tabla y exactamente tres políticas.
--
--   select policyname, cmd
--     from pg_policies
--    where tablename = 'revisiones'
--    order by policyname;
--
--   select count(*) from public.revisiones;
