-- Push-Subscriptions: Familie abonniert Benachrichtigungen über den Browser
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
-- Keine Policies -> Schreiben/Lesen nur serverseitig über /api/push/subscribe (Service-Role-Key)

-- Alerts: verhindert, dass an einem Tag mehrfach dieselbe Warnung verschickt wird
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table alerts enable row level security;
-- Keine Policies -> nur der Service-Role-Key (serverseitig) hat Zugriff
