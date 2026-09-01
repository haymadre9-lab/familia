-- Ejecutar una sola vez en el SQL Editor, pestaña nueva y vacía.
-- Guarda los colores de los cuatro y el orden de la compra,
-- compartidos entre los dos móviles.

create table if not exists fam_ajustes (
  familia     uuid primary key,
  colores     jsonb not null default '{}'::jsonb,
  orden       text  not null default 'usuario',
  actualizado timestamptz not null default now()
);

alter table fam_ajustes enable row level security;

drop policy if exists fam_ajustes_todo on fam_ajustes;
create policy fam_ajustes_todo on fam_ajustes
  for all to authenticated
  using      (familia = fam_mi_familia())
  with check (familia = fam_mi_familia());

revoke all on fam_ajustes from anon;

insert into fam_ajustes (familia, colores)
select distinct familia,
  '{"Ian":"#45D6E8","Unax":"#FFB03B","Carlos":"#FF3D71","Miren":"#C86BFF"}'::jsonb
from fam_miembros
on conflict (familia) do nothing;

select * from fam_ajustes;
