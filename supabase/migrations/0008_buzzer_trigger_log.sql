-- Protokolliert jede einzelne manuelle Buzzer-Auslösung (statt nur eines
-- Booleans in daily_status), damit im Verlauf sichtbar ist, wer wann
-- erinnert hat - auch bei mehreren Auslösungen am selben Tag.
create table if not exists buzzer_triggers (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id),
  created_at timestamptz not null default now()
);

alter table buzzer_triggers enable row level security;
-- Keine Policies -> nur serverseitig über die API-Routen zugänglich (wie daily_status)
