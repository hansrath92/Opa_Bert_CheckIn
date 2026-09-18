-- Zeitpunkt, an dem die automatische Buzzer-Bedingung (Sonnenuntergang + 1h,
-- kein Abend-Druck) an einem Tag erstmals zutrifft. Wird einmalig von
-- /api/buzzer-status gesetzt und dient als Startzeitpunkt für die Anzeige
-- "seit wann piept es" auf dem Dashboard und im Verlauf.
alter table daily_status add column if not exists auto_triggered_at timestamptz;
