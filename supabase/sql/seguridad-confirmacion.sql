-- ============================================================
-- SOLO CUENTAS CONFIRMADAS
-- Estudio de Pitch — Alumni Sabana
-- ------------------------------------------------------------
-- QUE ARREGLA
--   Hoy el perfil se crea en el mismo instante en que alguien pulsa
--   «crear cuenta», ANTES de confirmar el correo. Por eso el panel
--   del CDP muestra cuentas «Waiting for verification»: correos
--   inventados @unisabana.edu.co que nadie confirmo nunca.
--
--   Despues de correr esto, la regla pasa a ser simple:
--   UNA FILA EN «perfiles» = UNA CUENTA CONFIRMADA.
--   El panel de administracion no necesita filtrar nada.
--
-- QUE NO TOCA
--   No cambia la estructura de «perfiles» ni de «rondas», no toca
--   las politicas RLS, ni la vista de administracion, ni la Edge
--   Function. Solo cambia CUANDO se crea la fila del perfil.
--
-- DONDE SE CORRE
--   Panel de Supabase → SQL Editor → New query → pegar → RUN.
--   Es idempotente: se puede correr las veces que haga falta.
-- ============================================================


-- ------------------------------------------------------------
-- 1. VALIDACION AL REGISTRARSE
--    Se queda igual que antes —dominio institucional y acuerdo—
--    pero YA NO crea el perfil. Esta es la barrera que de verdad
--    cuenta: el navegador siempre se puede saltar, esto no.
-- ------------------------------------------------------------
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


-- ------------------------------------------------------------
-- 2. CREACION DEL PERFIL, SOLO AL CONFIRMAR
--    Se dispara cuando Supabase escribe email_confirmed_at, que es
--    justo el momento en que la persona abre el enlace del correo
--    o escribe el codigo.
-- ------------------------------------------------------------
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
    coalesce(nullif(new.raw_user_meta_data->>'acuerdo_fecha','')::timestamptz, now())
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


-- ------------------------------------------------------------
-- 3. CAMBIAR LOS DISPARADORES
-- ------------------------------------------------------------
-- Fuera el antiguo, que creaba el perfil al registrarse.
drop trigger if exists al_crear_usuario on auth.users;

-- Valida dominio y acuerdo antes de dejar crear la cuenta.
drop trigger if exists al_validar_registro on auth.users;
create trigger al_validar_registro
  before insert on auth.users
  for each row execute function public.validar_registro();

-- Crea el perfil cuando el correo queda confirmado.
drop trigger if exists al_confirmar_correo on auth.users;
create trigger al_confirmar_correo
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.crear_perfil_confirmado();

-- Por si el proyecto tuviera activado el auto-confirm: entonces la
-- cuenta nace ya confirmada y no hay UPDATE que disparar.
drop trigger if exists al_crear_usuario_confirmado on auth.users;
create trigger al_crear_usuario_confirmado
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.crear_perfil_confirmado();


-- ------------------------------------------------------------
-- 4. LIMPIEZA DE LO QUE YA ESTABA
--    Primero MIRA lo que se va a borrar. Ejecuta solo esta consulta,
--    revisa la lista, y si estas de acuerdo corre el bloque 5.
-- ------------------------------------------------------------
select
  p.correo,
  p.nombre,
  p.creado_en,
  (select count(*) from public.rondas r where r.usuario_id = p.id) as rondas_guardadas
from public.perfiles p
join auth.users u on u.id = p.id
where u.email_confirmed_at is null
order by p.creado_en;


-- ------------------------------------------------------------
-- 5. BORRAR LOS PERFILES SIN CONFIRMAR
--    DESCOMENTA para ejecutarlo, cuando ya revisaste la lista de
--    arriba. Se protege a quien tenga rondas guardadas: si aparece
--    alguien asi, revisalo a mano antes de borrar nada.
-- ------------------------------------------------------------
-- delete from public.perfiles p
--  using auth.users u
--  where u.id = p.id
--    and u.email_confirmed_at is null
--    and not exists (select 1 from public.rondas r where r.usuario_id = p.id);


-- ------------------------------------------------------------
-- 6. COMPROBACION
--    «pendientes_en_perfiles» debe quedar en 0.
--    Las cuentas sin confirmar siguen existiendo en auth.users
--    —eso lo gestiona Supabase, no nosotros— pero ya no ensucian
--    el panel del CDP.
-- ------------------------------------------------------------
select
  (select count(*) from public.perfiles)                                  as perfiles,
  (select count(*) from auth.users where email_confirmed_at is not null)  as usuarios_confirmados,
  (select count(*) from auth.users where email_confirmed_at is null)      as usuarios_pendientes,
  (select count(*) from public.perfiles p join auth.users u on u.id = p.id
    where u.email_confirmed_at is null)                                   as pendientes_en_perfiles;
