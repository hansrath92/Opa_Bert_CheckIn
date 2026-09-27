-- Persönliche Benachrichtigungs-Einstellungen pro Kontakt (statt zentraler
-- Eskalationskette am Abend). Nach der Lektion aus früheren Projekten:
-- erst ohne NOT NULL anlegen, bestehende Zeilen befüllen, dann NOT NULL setzen.

-- Master-Schalter: aus = diese Person bekommt gar keine Benachrichtigungen mehr
alter table contacts add column if not exists notifications_enabled boolean default true;
-- Benachrichtigung, wenn Opa sich nicht meldet (abends pro Person, morgens Kette)
alter table contacts add column if not exists notify_on_missed_checkin boolean default true;
-- 'automatic' = Sonnenuntergang + tolerance_hours, 'fixed' = missed_checkin_fixed_time
alter table contacts add column if not exists missed_checkin_timing_mode text default 'automatic';
-- Feste Uhrzeit (Berliner Zeit), nur relevant bei timing_mode = 'fixed'
alter table contacts add column if not exists missed_checkin_fixed_time time;
-- Opt-in: Push bei JEDEM Knopfdruck, nicht nur im Alarmfall
alter table contacts add column if not exists notify_on_every_press boolean default false;

update contacts set notifications_enabled = true where notifications_enabled is null;
update contacts set notify_on_missed_checkin = true where notify_on_missed_checkin is null;
update contacts set missed_checkin_timing_mode = 'automatic' where missed_checkin_timing_mode is null;
update contacts set notify_on_every_press = false where notify_on_every_press is null;

alter table contacts alter column notifications_enabled set not null;
alter table contacts alter column notify_on_missed_checkin set not null;
alter table contacts alter column missed_checkin_timing_mode set not null;
alter table contacts alter column notify_on_every_press set not null;

alter table contacts drop constraint if exists contacts_missed_checkin_timing_mode_check;
alter table contacts add constraint contacts_missed_checkin_timing_mode_check
  check (missed_checkin_timing_mode in ('automatic', 'fixed'));
