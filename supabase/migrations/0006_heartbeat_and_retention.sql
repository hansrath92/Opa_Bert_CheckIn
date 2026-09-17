-- Retention von 3 auf 7 Tage erhöhen, damit der "Verlauf"-Tab eine Woche zeigen kann
select cron.unschedule('delete-old-presses');
select cron.schedule(
  'delete-old-presses',
  '0 3 * * *',
  $$ delete from presses where created_at < now() - interval '7 days' $$
);

-- Pi-Heartbeat: eine einzige Zeile (feste ID), die bei jedem Heartbeat überschrieben wird.
-- Zeigt an, ob der Pi noch "lebt", unabhängig von echten Knopfdrücken.
create table if not exists pi_heartbeat (
  id int primary key default 1,
  last_seen_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into pi_heartbeat (id, last_seen_at) values (1, now())
  on conflict (id) do nothing;

alter table pi_heartbeat enable row level security;
-- Öffentlich lesbar (Dashboard zeigt den Status ohne Login), Schreiben nur serverseitig
create policy "Pi-Heartbeat ist öffentlich lesbar"
  on pi_heartbeat for select
  using (true);
