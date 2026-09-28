-- Bug: Sobald die automatische Buzzer-Bedingung (1h nach Sonnenuntergang)
-- einmal eingetreten war, blieb sie für den Rest des Tages "true" -
-- "Antippen zum Stoppen der Erinnerung" setzte nur buzzer_manually_triggered
-- zurück, wurde aber vom automatischen Zustand sofort wieder überstimmt.
-- Eigenes Feld für "bewusst manuell gestoppt" - bleibt gültig, bis jemand
-- den Buzzer wieder aktiv einschaltet (dann wird es zurückgesetzt) oder der
-- Tag wechselt (neue Zeile in daily_status).
alter table daily_status add column if not exists buzzer_snoozed_at timestamptz;
