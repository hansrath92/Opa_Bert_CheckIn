-- Kontakte sollen sich (oder andere) aus der Familie löschen können. Zwei der
-- bisherigen Fremdschlüssel auf contacts(id) hatten kein "on delete cascade"
-- (buzzer_triggers, evening_stand_downs) - ein Löschversuch wäre dort mit
-- einem Fremdschlüssel-Fehler gescheitert, sobald die Person schon einmal
-- "Opa erinnern" ausgelöst oder eine Entwarnung gegeben hatte. Mit dem
-- Verlauf-Eintrag verschwindet dann auch der Name aus der Anzeige - das ist
-- hier bewusst so gewählt (wie schon bei incident_contacts/push_subscriptions).
alter table buzzer_triggers drop constraint if exists buzzer_triggers_contact_id_fkey;
alter table buzzer_triggers add constraint buzzer_triggers_contact_id_fkey
  foreign key (contact_id) references contacts(id) on delete cascade;

alter table evening_stand_downs drop constraint if exists evening_stand_downs_contact_id_fkey;
alter table evening_stand_downs add constraint evening_stand_downs_contact_id_fkey
  foreign key (contact_id) references contacts(id) on delete cascade;
