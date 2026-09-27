"use client";

import { useEffect, useState } from "react";
import { getPushSubscriptionStatus, subscribeToPush } from "@/lib/push";
import { getBerlinTimeLabel } from "@/lib/press";
import { CHANGELOG } from "@/lib/changelog";
import { PRESS_LABEL } from "@/lib/naming";
import { useContact, useLogout, useStartOnboarding, useUpdateContact } from "@/components/IdentityGate";

// Gemeinsame Bausteine für eine Strava-artige, gruppierte Einstellungs-Ansicht:
// jede Gruppe ist standardmäßig zugeklappt, zeigt aber schon im zugeklappten
// Zustand eine kurze Zusammenfassung (z.B. den aktuellen Status) - so sieht
// man das Wichtigste auf einen Blick, ohne extra aufklappen zu müssen.
function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  dataOnboarding,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  dataOnboarding?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div data-onboarding={dataOnboarding} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
      <button onClick={() => setIsOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">{title}</span>
        <span className="flex items-center gap-2 text-sm text-foreground-secondary">
          {summary}
          <span>{isOpen ? "︿" : "﹀"}</span>
        </span>
      </button>
      {isOpen && <div className="flex flex-col divide-y divide-border border-t border-border">{children}</div>}
    </div>
  );
}

// Einfacher An/Aus-Schalter (statt Checkbox), gut mit dem Daumen bedienbar.
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

// Eine Zeile "Titel + Erklärung links, Schalter rechts".
function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-foreground-secondary">{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

type MySettings = {
  notifications_enabled: boolean;
  notify_on_missed_checkin: boolean;
  missed_checkin_timing_mode: "automatic" | "fixed";
  missed_checkin_fixed_time: string | null;
  notify_on_every_press: boolean;
  tolerance_hours: number;
};

// "Meine Benachrichtigungen": Jede Person sieht und ändert hier NUR ihre
// eigenen Einstellungen (geladen/gespeichert über /api/contacts/settings mit
// der eigenen contact_id). Ersetzt die früheren Bereiche "Erinnerungszeit"
// und "Benachrichtigungen".
function MeineBenachrichtigungenBereich() {
  const contact = useContact();
  const updateContact = useUpdateContact();
  const [pushStatus, setPushStatus] = useState<"idle" | "active" | "subscribing" | "error">("idle");
  const [settings, setSettings] = useState<MySettings | null>(null);
  const [toleranceInput, setToleranceInput] = useState(String(contact.tolerance_hours));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  // Echten Browser-Abo-Status prüfen, statt nur den lokalen Zustand seit dem
  // letzten Klick anzuzeigen - sonst sieht man nach einem Neuladen nie, ob
  // Benachrichtigungen auf DIESEM Gerät wirklich aktiv sind.
  useEffect(() => {
    getPushSubscriptionStatus().then((isActive) => {
      if (isActive) setPushStatus("active");
    });
  }, []);

  // Eigene Einstellungen vom Server laden.
  useEffect(() => {
    fetch(`/api/contacts/settings?contact_id=${encodeURIComponent(contact.id)}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
          setToleranceInput(String(data.settings.tolerance_hours));
        } else {
          setFormError("Einstellungen konnten nicht geladen werden.");
        }
      })
      .catch(() => setFormError("Einstellungen konnten nicht geladen werden."));
  }, [contact.id]);

  async function handleSubscribe() {
    setPushStatus("subscribing");
    try {
      await subscribeToPush(contact.id);
      setPushStatus("active");
    } catch {
      setPushStatus("error");
    }
  }

  // Lokale Änderung merken - gespeichert wird erst mit "Speichern".
  function change(patch: Partial<MySettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaveState("idle");
  }

  async function handleSave() {
    if (!settings) return;
    const tolerance_hours = Number(toleranceInput);
    if (!tolerance_hours || tolerance_hours <= 0) {
      setFormError("Bitte eine gültige Stundenzahl eingeben.");
      return;
    }
    if (settings.missed_checkin_timing_mode === "fixed" && !settings.missed_checkin_fixed_time) {
      setFormError("Bitte eine Uhrzeit wählen.");
      return;
    }

    setSaveState("saving");
    setFormError(null);
    const response = await fetch("/api/contacts/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contact.id, ...settings, tolerance_hours }),
    });
    if (response.ok) {
      updateContact({ ...contact, tolerance_hours });
      setSaveState("saved");
    } else {
      const data = await response.json().catch(() => ({}));
      setFormError(data.error ?? "Speichern hat nicht geklappt. Versuch es noch einmal.");
      setSaveState("idle");
    }
  }

  const buttonClass = "min-h-[56px] rounded-[var(--radius-card)] border border-border bg-card px-4 py-2 text-sm font-medium";
  const inputClass = "rounded-xl border border-border bg-card p-2";

  const summary =
    settings === null ? undefined : settings.notifications_enabled ? (
      <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">An</span>
    ) : (
      <span className="text-xs">Aus</span>
    );

  return (
    <CollapsibleSection title="Meine Benachrichtigungen" dataOnboarding="notifications" summary={summary}>
      {/* Geräte-Ebene: Ohne Push-Abo auf diesem Gerät kommt keine Nachricht an,
          egal was unten eingestellt ist. */}
      <div className="flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-sm font-medium">Push auf diesem Gerät</div>
          <div className="text-xs text-foreground-secondary">Nötig, damit Nachrichten hier ankommen.</div>
        </div>
        {pushStatus === "active" ? (
          <span className="rounded-full bg-success-bg px-3 py-1 text-xs font-medium text-success-text">Aktiv</span>
        ) : (
          <button onClick={handleSubscribe} disabled={pushStatus === "subscribing"} className={`${buttonClass} shrink-0`}>
            {pushStatus === "subscribing" ? "Wird aktiviert…" : pushStatus === "error" ? "Erneut versuchen" : "Aktivieren"}
          </button>
        )}
      </div>

      {settings === null ? (
        <div className="p-4 text-sm text-foreground-secondary">{formError ?? "Lade…"}</div>
      ) : (
        <>
          <ToggleRow
            title="Benachrichtigungen erhalten"
            description="Hauptschalter – aus heißt: du bekommst gar keine Nachrichten."
            checked={settings.notifications_enabled}
            onChange={(value) => change({ notifications_enabled: value })}
          />

          {settings.notifications_enabled && (
            <>
              <ToggleRow
                title="Wenn Opa sich nicht meldet"
                description={`${PRESS_LABEL.evening} zu deiner eigenen Zeit. ${PRESS_LABEL.morning} (ab 11 Uhr) weiterhin nacheinander.`}
                checked={settings.notify_on_missed_checkin}
                onChange={(value) => change({ notify_on_missed_checkin: value })}
              />

              {settings.notify_on_missed_checkin && (
                <div className="flex flex-col gap-3 p-4">
                  <span className="text-sm font-medium">{PRESS_LABEL.evening}: benachrichtigen ab</span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="timing-mode"
                      checked={settings.missed_checkin_timing_mode === "automatic"}
                      onChange={() => change({ missed_checkin_timing_mode: "automatic" })}
                    />
                    Automatisch: Sonnenuntergang +
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={toleranceInput}
                      onChange={(e) => {
                        setToleranceInput(e.target.value);
                        change({ missed_checkin_timing_mode: "automatic" });
                      }}
                      className={`${inputClass} w-16`}
                    />
                    Std.
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="timing-mode"
                      checked={settings.missed_checkin_timing_mode === "fixed"}
                      onChange={() => change({ missed_checkin_timing_mode: "fixed" })}
                    />
                    Feste Uhrzeit:
                    <input
                      type="time"
                      min="12:00"
                      value={settings.missed_checkin_fixed_time ?? ""}
                      onChange={(e) =>
                        change({ missed_checkin_timing_mode: "fixed", missed_checkin_fixed_time: e.target.value || null })
                      }
                      className={inputClass}
                    />
                    Uhr
                  </label>
                </div>
              )}

              <ToggleRow
                title="Bei jedem Knopfdruck"
                description="Zusätzlich eine kurze Nachricht, sobald Opa drückt – auch wenn alles in Ordnung ist."
                checked={settings.notify_on_every_press}
                onChange={(value) => change({ notify_on_every_press: value })}
              />
            </>
          )}

          <div className="flex flex-col gap-2 p-4">
            {formError && <p className="text-sm text-error">{formError}</p>}
            <button onClick={handleSave} disabled={saveState === "saving"} className={buttonClass}>
              {saveState === "saving" ? "Wird gespeichert…" : saveState === "saved" ? "Gespeichert ✓" : "Speichern"}
            </button>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}

function KontaktUndAlarmBereich() {
  const contact = useContact();
  const logout = useLogout();
  const [formError, setFormError] = useState<string | null>(null);
  const [myTurns, setMyTurns] = useState<("morning" | "evening")[]>([]);
  const [respondStatus, setRespondStatus] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    const contactId = contact.id;
    let cancelled = false;

    async function checkTurn() {
      try {
        const response = await fetch("/api/incidents/status");
        if (!response.ok) return;
        const { incidents } = await response.json();
        if (!cancelled) {
          // Ich bin "dran", wenn ich benachrichtigt wurde und noch nicht
          // geantwortet habe (abends können das mehrere gleichzeitig sein).
          setMyTurns(
            (incidents ?? [])
              .filter((i: { pendingContactIds: string[] }) => i.pendingContactIds.includes(contactId))
              .map((i: { type: "morning" | "evening" }) => i.type)
          );
        }
      } catch {
        // Status ist informativ, kein Blocker
      }
    }

    checkTurn();
    const intervalId = setInterval(checkTurn, 30_000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [contact]);

  async function handleRespond(type: "morning" | "evening", response: "met_opa" | "could_not_reach") {
    setRespondStatus("sending");
    const res = await fetch("/api/incidents/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contact.id, type, response }),
    });
    if (res.ok) {
      setRespondStatus("sent");
      setMyTurns((prev) => prev.filter((t) => t !== type));
    } else {
      setRespondStatus("idle");
      setFormError("Rückmeldung hat nicht geklappt. Versuch es noch einmal.");
    }
  }

  const buttonClass = "min-h-[56px] rounded-[var(--radius-card)] border border-border bg-card px-4 py-2 text-sm font-medium";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 px-1">
        <p className="text-sm text-foreground-secondary">Angemeldet als {contact.name}</p>
        <button onClick={logout} className="text-sm text-foreground-secondary underline">
          Abmelden
        </button>
      </div>

      {/* Steht IMMER offen, unabhängig vom Zuklapp-Prinzip - eine ausstehende
          Rückmeldung ist dringend und darf nicht versteckt sein. */}
      {myTurns.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
            Rückmeldung ausstehend
          </span>
          <div className="flex flex-col gap-3">
            {myTurns.map((type) => (
              <div key={type} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-warning/40 bg-warning-bg p-4 text-center">
                <p className="font-medium">
                  Opa hat sich {type === "morning" ? "heute Morgen" : "heute Abend"} noch nicht gemeldet. Bitte prüfen
                  und zurückmelden.
                </p>
                <button
                  onClick={() => handleRespond(type, "met_opa")}
                  disabled={respondStatus === "sending"}
                  className="min-h-[56px] rounded-[var(--radius-card)] bg-success-text px-4 py-2 text-sm font-medium text-white"
                >
                  Ich habe ihn getroffen
                </button>
                <button
                  onClick={() => handleRespond(type, "could_not_reach")}
                  disabled={respondStatus === "sending"}
                  className={buttonClass}
                >
                  Ich konnte ihn nicht erreichen
                </button>
              </div>
            ))}
            {respondStatus === "sent" && <p className="text-sm text-success-text">Danke, Rückmeldung gespeichert.</p>}
            {formError && <p className="text-sm text-error">{formError}</p>}
          </div>
        </div>
      )}

      <MeineBenachrichtigungenBereich />
    </div>
  );
}

type ScheduleEntry = { name: string; mode: "automatic" | "fixed"; deadline: string };

function ErinnerungszeitenHeuteBereich() {
  const [schedule, setSchedule] = useState<ScheduleEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/reminder-schedule")
      .then((response) => response.json())
      .then((data) => setSchedule(data.schedule ?? []))
      .catch(() => setSchedule([]));
  }, []);

  return (
    <CollapsibleSection title="Erinnerungszeiten heute">
      {schedule === null ? (
        <div className="p-4 text-sm text-foreground-secondary">Lade…</div>
      ) : schedule.length === 0 ? (
        <div className="p-4 text-sm text-foreground-secondary">Niemand hat Abend-Benachrichtigungen aktiviert.</div>
      ) : (
        <>
          {schedule.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 p-4">
              <span className="text-sm font-medium">{entry.name}</span>
              <span className="text-sm text-foreground-secondary">
                {getBerlinTimeLabel(new Date(entry.deadline))} Uhr {entry.mode === "fixed" ? "(fest)" : "(automatisch)"}
              </span>
            </div>
          ))}
          <p className="p-4 text-xs text-foreground-secondary">
            Ab dieser Uhrzeit wird die Person benachrichtigt, falls Opa sich abends noch nicht gemeldet hat. Die
            Prüfung läuft alle 15 Minuten, es kann also bis zu 15 Minuten später werden.
          </p>
        </>
      )}
    </CollapsibleSection>
  );
}

type PublicContact = { name: string };

function FamilieBereich() {
  const [contacts, setContacts] = useState<PublicContact[] | null>(null);

  useEffect(() => {
    fetch("/api/contacts/list")
      .then((response) => response.json())
      .then((data) => setContacts(data.contacts ?? []))
      .catch(() => setContacts([]));
  }, []);

  return (
    <CollapsibleSection title="Familie" summary={contacts ? `${contacts.length}` : undefined}>
      {contacts === null ? (
        <div className="p-4 text-sm text-foreground-secondary">Lade…</div>
      ) : contacts.length === 0 ? (
        <div className="p-4 text-sm text-foreground-secondary">Noch niemand angemeldet.</div>
      ) : (
        contacts.map((c, index) => (
          // Nur Namen - wann wer benachrichtigt wird, steht unter "Erinnerungszeiten heute".
          <div key={c.name + index} className="p-4">
            <span className="text-sm font-medium">{c.name}</span>
          </div>
        ))
      )}
    </CollapsibleSection>
  );
}

function SoFunktioniertsBereich() {
  return (
    <CollapsibleSection title="So funktioniert's">
      <p className="p-4 text-sm text-foreground-secondary">
        Opa drückt morgens beim Aufstehen und abends beim Abschließen auf seinen roten Knopf. Ein Druck vor 12 Uhr
        zählt als „{PRESS_LABEL.morning}“, danach als „{PRESS_LABEL.evening}“.
      </p>
      <p className="p-4 text-sm text-foreground-secondary">
        Fehlt abends die Meldung, bekommt jede Person zu ihrer eigenen Zeit eine Nachricht (einstellbar unter „Meine
        Benachrichtigungen“). Meldet jemand „Ich habe ihn getroffen“, bekommen die übrigen keine mehr.
      </p>
      <p className="p-4 text-sm text-foreground-secondary">
        Fehlt morgens um 11 Uhr die Meldung, wird die Familie nacheinander benachrichtigt: Reagiert niemand innerhalb
        von 60 Minuten, geht es automatisch an die nächste Person weiter.
      </p>
    </CollapsibleSection>
  );
}

function ErsteSchritteUndVersionBereich() {
  const startOnboarding = useStartOnboarding();
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <CollapsibleSection title="Erste Schritte & Version" summary={`v${CHANGELOG[0].version}`}>
      <button onClick={startOnboarding} className="flex items-center justify-between gap-4 p-4 text-left text-sm font-medium">
        Erste Schritte erneut ansehen
        <span className="text-foreground-secondary">›</span>
      </button>
      <button
        onClick={() => setShowChangelog((v) => !v)}
        className="flex items-center justify-between gap-4 p-4 text-left text-sm font-medium"
      >
        Versionshistorie
        <span className="text-foreground-secondary">{showChangelog ? "︿" : "﹀"}</span>
      </button>
      {showChangelog && (
        <div className="flex flex-col gap-3 p-4 text-sm text-foreground-secondary">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <div className="font-medium text-foreground">
                {entry.version} · {entry.date}
              </div>
              <ul className="mt-1 flex flex-col gap-0.5">
                {entry.changes.map((change, i) => (
                  <li key={i}>• {change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

export default function EinstellungenPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-6">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <KontaktUndAlarmBereich />
      <ErinnerungszeitenHeuteBereich />
      <FamilieBereich />
      <SoFunktioniertsBereich />
      <ErsteSchritteUndVersionBereich />
    </main>
  );
}
