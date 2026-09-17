-- Die einfache "alerts"-Tabelle wird durch das Eskalationssystem unten ersetzt
drop table if exists alerts;

-- WICHTIG: "contacts" existiert schon seit Migration 0001 mit einer öffentlichen
-- Lese-Regel (war ok, solange nur "name" drin stand). Jetzt kommen PINs dazu ->
-- die alte Regel muss weg, sonst könnte jeder alle PINs auslesen.
drop policy if exists "Contacts sind öffentlich lesbar" on contacts;

-- Bestehende Tabelle um PIN (Identifikation) und individuelle Toleranz-Zeit erweitern
alter table contacts add column if not exists pin text unique;
alter table contacts alter column pin set not null;
alter table contacts add column if not exists tolerance_hours numeric not null default 2;
-- Keine Policies mehr -> nur serverseitig über API-Routen zugänglich (PINs dürfen nie öffentlich lesbar sein)

-- Push-Abonnements jetzt einem Kontakt zugeordnet, damit gezielt einzelne Personen benachrichtigt werden können
alter table push_subscriptions
  add column if not exists contact_id uuid references contacts(id) on delete cascade;

-- Ein Incident pro Tag UND Typ (morgens vor 11 Uhr / abends nach Sonnenuntergang+Toleranz),
-- damit ein verpasster Morgen-Druck einen verpassten Abend-Druck am selben Tag nicht blockiert
create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  date_key text not null,
  type text not null check (type in ('morning', 'evening')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  unique (date_key, type)
);
alter table incidents enable row level security;

-- Eskalations-Verlauf: wer wurde wann kontaktiert, hat er/sie reagiert
create table if not exists incident_contacts (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  notified_at timestamptz not null default now(),
  responded_at timestamptz,
  response text check (response in ('met_opa', 'could_not_reach'))
);
alter table incident_contacts enable row level security;
