-- PIN wird ab jetzt nur noch gehasht gespeichert (nie im Klartext), da das
-- Login-Modell auf Namensauswahl + PIN-Bestätigung umgestellt wird. Tabelle
-- ist aktuell leer (zum Testen geleert), daher reicht ein simpler Rename.
alter table contacts rename column pin to pin_hash;
