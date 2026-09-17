-- Die "incidents"-Tabelle wurde mit einer älteren Zwischenversion der Migration
-- angelegt (nur "unique(date_key)", keine "type"-Spalte). Das holen wir hier nach,
-- ohne den (unbekannten, automatisch generierten) alten Constraint-Namen zu erraten.
do $$
declare
  old_constraint_name text;
begin
  select conname into old_constraint_name
  from pg_constraint
  where conrelid = 'incidents'::regclass
    and contype = 'u'
    and array_length(conkey, 1) = 1;

  if old_constraint_name is not null then
    execute format('alter table incidents drop constraint %I', old_constraint_name);
  end if;
end $$;

alter table incidents add column if not exists type text check (type in ('morning', 'evening'));
alter table incidents alter column type set not null;
alter table incidents add constraint incidents_date_key_type_key unique (date_key, type);
