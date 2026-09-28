-- PINs dienen nur als Verwechslungs-Absicherung NACH der Namensauswahl
-- (siehe confirm-pin: geprüft wird gegen die PIN GENAU dieses einen, schon
-- ausgewählten Kontakts) - sie werden nie zum Nachschlagen einer Person
-- benutzt. Zwei Personen dürfen also dieselbe 4-stellige PIN haben.
--
-- Die alte "unique"-Regel stammt noch aus Migration 0004 (add column pin
-- text unique) - der Constraint-Name blieb beim Umbenennen der Spalte auf
-- pin_hash (Migration 0010) unverändert bei "contacts_pin_key". Zusätzlich
-- den pin_hash-basierten Namen mit entfernen, falls er doch abweicht.
alter table contacts drop constraint if exists contacts_pin_key;
alter table contacts drop constraint if exists contacts_pin_hash_key;
