-- Ein Status pro Tag: Druckzeiten + ob die akustische Erinnerung manuell ausgelöst wurde
create table if not exists daily_status (
  date_key text primary key,
  morning_press_time timestamptz,
  evening_press_time timestamptz,
  buzzer_manually_triggered boolean not null default false
);

alter table daily_status enable row level security;
-- Keine Policies -> nur serverseitig über die API-Routen zugänglich
