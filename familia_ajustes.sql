-- ============================================================
--  familia · pestaña de Notas  (ejecutar entero, pestaña nueva)
-- ============================================================

-- 1. Campos nuevos
alter table fam_items add column if not exists reunion text;
alter table fam_items add column if not exists cuerpo  text;
alter table fam_items add column if not exists privada boolean not null default false;
alter table fam_items add column if not exists notificado_at timestamptz;

-- 2. 'nota' pasa a ser un tipo válido
alter table fam_items drop constraint if exists fam_items_tipo_check;
alter table fam_items add  constraint fam_items_tipo_check
  check (tipo in ('compra','casa','cole','salud','nota'));

-- 3. Privacidad de verdad: una nota privada sólo se la devuelve
--    la base de datos a quien la escribió. No es un filtro de pantalla.
drop policy if exists fam_items_todo on fam_items;
create policy fam_items_todo on fam_items
  for all to authenticated
  using      (familia = fam_mi_familia() and (privada = false or autor = auth.uid()))
  with check (familia = fam_mi_familia());

-- 4. Tipos de reunión editables, compartidos
alter table fam_ajustes add column if not exists reuniones jsonb
  not null default '["Pleno","Tráfico","Líneas","CSSL","Empleo","Nóminas"]'::jsonb;

update fam_ajustes
   set reuniones = '["Pleno","Tráfico","Líneas","CSSL","Empleo","Nóminas"]'::jsonb
 where reuniones is null or reuniones = '[]'::jsonb;

-- 5. Las novedades no delatan notas privadas ni la compra
create or replace function fam_novedades()
returns table (id text, familia uuid, autor uuid, texto text, persona text, tipo text, fecha date)
language sql security definer set search_path = public as $$
  select i.id, i.familia, i.autor, i.texto, i.persona, i.tipo, i.fecha
  from fam_items i
  where i.notificado_at is null
    and i.borrado = false
    and i.hecho = false
    and i.privada = false
    and i.tipo <> 'compra'
    and i.autor is not null
    and i.creado > now() - interval '6 hours'
  order by i.creado;
$$;

revoke all on function fam_novedades() from public, anon, authenticated;

-- 6. Nada viejo genera avisos de novedad
update fam_items set notificado_at = now() where notificado_at is null;

-- 7. Comprobación
select reuniones from fam_ajustes;
