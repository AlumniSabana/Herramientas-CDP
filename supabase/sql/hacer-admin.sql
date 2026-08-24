-- ============================================================
-- NOMBRAR ADMINISTRADOR DEL CDP
-- Estudio de Pitch — Alumni Sabana
-- ============================================================
--
-- DONDE SE CORRE:  panel de Supabase → SQL Editor → New query
--                  pegar todo → RUN
--
-- ANTES DE CORRERLO, un requisito que no se puede saltar:
--   la cuenta desarrolloprofesional@unisabana.edu.co tiene que
--   HABERSE REGISTRADO YA en la pagina y CONFIRMADO el correo.
--   El rol se guarda en una fila de «perfiles» que solo existe
--   despues del registro. Si no se ha registrado, el paso 2 no
--   encuentra a quien promover y avisa.
--
-- Es idempotente: se puede correr las veces que haga falta.
-- ============================================================


-- ------------------------------------------------------------
-- 1. VER QUIEN HAY HOY Y CON QUE ROL
--    Sirve para confirmar que la cuenta ya se registro.
-- ------------------------------------------------------------
select
  correo,
  nombre,
  facultad,
  programa,
  rol,
  creado_en,
  ultimo_acceso
from public.perfiles
order by creado_en;


-- ------------------------------------------------------------
-- 2. PROMOVER LA CUENTA DEL CDP
-- ------------------------------------------------------------
update public.perfiles
   set rol = 'admin'
 where lower(correo) = 'desarrolloprofesional@unisabana.edu.co';

-- Avisa si no encontro la cuenta, en vez de fallar en silencio.
do $$
declare n int;
begin
  select count(*) into n
    from public.perfiles
   where lower(correo) = 'desarrolloprofesional@unisabana.edu.co'
     and rol = 'admin';
  if n = 0 then
    raise warning 'La cuenta desarrolloprofesional@unisabana.edu.co todavia no existe en «perfiles». Registrala primero en la pagina, confirma el correo y vuelve a correr este script.';
  else
    raise notice 'Listo: desarrolloprofesional@unisabana.edu.co quedo como administrador.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 3. COMPROBAR EL RESULTADO
--    Debe aparecer «admin» en la fila del CDP.
-- ------------------------------------------------------------
select correo, nombre, rol
  from public.perfiles
 order by (rol = 'admin') desc, correo;


-- ------------------------------------------------------------
-- 4. QUE VA A VER ESA CUENTA
--    Una fila por persona registrada, con sus rondas.
--    Las personas que se registraron pero no han practicado
--    aparecen con 0 rondas: por eso el LEFT JOIN.
-- ------------------------------------------------------------
select
  p.correo,
  p.nombre,
  p.programa,
  p.rol,
  count(r.id)                              as rondas,
  round(avg(r.puntaje))                    as puntaje_promedio,
  count(r.observaciones)                   as con_observaciones_ia,
  count(nullif(r.transcripcion, ''))       as con_transcripcion,
  max(r.creada_en)                         as ultima_practica
from public.perfiles p
left join public.rondas r on r.usuario_id = p.id
group by p.correo, p.nombre, p.programa, p.rol
order by rondas desc, p.correo;


-- ============================================================
-- 5. SI ALGUN DIA HAY QUE QUITARLE EL ROL A ALGUIEN
--    Descomenta y ajusta el correo. Ojo: no te quites el rol a
--    ti mismo sin dejar otra cuenta con «admin», o nadie podra
--    volver a entrar al panel sin pasar por aqui.
-- ============================================================
-- update public.perfiles set rol = 'usuario'
--  where lower(correo) = 'correo.a.degradar@unisabana.edu.co';
