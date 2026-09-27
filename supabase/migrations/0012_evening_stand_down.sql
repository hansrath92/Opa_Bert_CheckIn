-- "Entwarnung": Familie kann bei aktivem Abend-Alarm bestätigen "Alles in
-- Ordnung - nur nicht gedrückt", ohne dass Opa wirklich gedrückt hat.

-- Eigenes Feld statt evening_press_time zu missbrauchen: eine Entwarnung ist
-- KEIN echter Knopfdruck (Verlauf/Heute sollen das nicht als "✓ gedrückt"
-- anzeigen), stoppt aber genau wie ein echter Druck den Piepser bei Opa.
alter table daily_status add column if not exists evening_stood_down_at timestamptz;

-- Protokoll für den Verlauf-Tab, analog zu buzzer_triggers ("Erinnert von").
create table if not exists evening_stand_downs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id),
  created_at timestamptz not null default now()
);
alter table evening_stand_downs enable row level security;
-- Keine Policies -> nur serverseitig über die API-Routen zugänglich (wie buzzer_triggers)

-- Neuer erlaubter Wert für die Rückmeldung eines Eskalationsschritts.
alter table incident_contacts drop constraint if exists incident_contacts_response_check;
alter table incident_contacts add constraint incident_contacts_response_check
  check (response in ('met_opa', 'could_not_reach', 'stood_down'));
