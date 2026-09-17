-- Presses älter als 3 Tage automatisch löschen (täglich um 03:00 UTC = 05:00 Berlin Sommerzeit)
select cron.schedule(
  'delete-old-presses',
  '0 3 * * *',
  $$ delete from presses where created_at < now() - interval '3 days' $$
);
