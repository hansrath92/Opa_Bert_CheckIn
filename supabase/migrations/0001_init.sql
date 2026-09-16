-- Opa-Checkin: Grundtabellen für Phase 1 (MVP)

create table if not exists presses (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('morning', 'evening')),
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security aktivieren: das Dashboard darf lesen,
-- Schreiben passiert nur über die API-Route (mit Service-Role-Key, umgeht RLS).
alter table presses enable row level security;
alter table contacts enable row level security;

create policy "Presses sind öffentlich lesbar"
  on presses for select
  using (true);

create policy "Contacts sind öffentlich lesbar"
  on contacts for select
  using (true);
