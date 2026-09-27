"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPushSubscriptionStatus, subscribeToPush } from "@/lib/push";
import { getBerlinTimeLabel } from "@/lib/press";
import { CHANGELOG } from "@/lib/changelog";
import { PRESS_LABEL } from "@/lib/naming";
import { ThemePreference, applyTheme, getStoredTheme } from "@/lib/theme";
import { useContact, useLogout, useStartOnboarding, useUpdateContact } from "@/components/IdentityGate";
import CollapsibleSection, { expandSection } from "@/components/CollapsibleSection";

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
    <CollapsibleSection id="meine-benachrichtigungen" title="Meine Benachrichtigungen" dataOnboarding="notifications" summary={summary}>
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

// Nach zwei verpassten Heartbeats (Pi sendet alle 5 Minuten) gilt er als offline.
const PI_OFFLINE_THRESHOLD_MINUTES = 10;

// Zeigt, ob der Pi bei Opa gerade online ist ("Lebenszeichen" des Pi selbst,
// unabhängig von Knopfdrücken). Vorher stand das auf "Heute" oben rechts,
// jetzt nur noch hier in den Einstellungen.
function PiStatusBereich() {
  const [piLastSeenAt, setPiLastSeenAt] = useState<Date | null>(null);
  // "Jetzt" wird bei jedem Poll mit-gespeichert statt Date.now() beim Rendern
  // aufzurufen - so bleibt die Berechnung unten eine reine Funktion des States.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.from("pi_heartbeat").select("last_seen_at").eq("id", 1).maybeSingle();
      if (cancelled) return;
      if (data) setPiLastSeenAt(new Date(data.last_seen_at));
      setNow(new Date());
    }

    load();
    const intervalId = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const piMinutesAgo = piLastSeenAt && now ? (now.getTime() - piLastSeenAt.getTime()) / (60 * 1000) : null;
  const isPiOnline = piMinutesAgo !== null && piMinutesAgo < PI_OFFLINE_THRESHOLD_MINUTES;

  return (
    <CollapsibleSection
      title="Pi bei Opa"
      dataOnboarding="pi-status"
      summary={
        piLastSeenAt === null ? undefined : isPiOnline ? (
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">Online</span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">Offline</span>
        )
      }
    >
      <div className="p-4 text-sm text-foreground-secondary">
        {piLastSeenAt === null
          ? "Lade…"
          : `Zuletzt gemeldet um ${getBerlinTimeLabel(piLastSeenAt, { seconds: true })} Uhr${
              isPiOnline ? "" : " – seit mehr als 10 Minuten kein Lebenszeichen mehr."
            }`}
      </div>
    </CollapsibleSection>
  );
}

// Hell/Dunkel: Standard ist Hell, bis die Person hier explizit Dunkel wählt
// (siehe src/lib/theme.ts - keine automatische Systemerkennung mehr).
function DesignBereich() {
  const [theme, setTheme] = useState<ThemePreference>("light");

  // Erst nach dem Mounten den echten gespeicherten Wert lesen (localStorage
  // ist im Server-Rendering nicht verfügbar).
  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function choose(value: ThemePreference) {
    setTheme(value);
    applyTheme(value);
  }

  return (
    <CollapsibleSection title="Design" dataOnboarding="design" summary={theme === "dark" ? "Dunkel" : "Hell"}>
      <div className="flex flex-col gap-2 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="theme" checked={theme === "light"} onChange={() => choose("light")} />
          Hell
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="theme" checked={theme === "dark"} onChange={() => choose("dark")} />
          Dunkel
        </label>
      </div>
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
  const contact = useContact();
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
          {schedule.map((entry) => {
            const isMe = entry.name === contact.name;
            return (
              <div key={entry.name} className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm font-medium">{isMe ? `${entry.name} (Du)` : entry.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground-secondary">
                    {getBerlinTimeLabel(new Date(entry.deadline))} Uhr{" "}
                    {entry.mode === "fixed" ? "(fest)" : "(automatisch)"}
                  </span>
                  {/* Springt zu "Meine Benachrichtigungen" und klappt es auf - dort
                      kann jede Person nur ihre EIGENEN Zeiten ändern, deshalb gibt
                      es diesen Link nur bei der eigenen Zeile. */}
                  {isMe && (
                    <button
                      onClick={() => expandSection("meine-benachrichtigungen")}
                      className="shrink-0 text-sm font-medium text-accent underline"
                    >
                      Bearbeiten
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
  const startOnboarding = useStartOnboarding();

  return (
    <CollapsibleSection title="So funktioniert's">
      <button onClick={startOnboarding} className="flex items-center justify-between gap-4 p-4 text-left text-sm font-medium">
        Erste Schritte erneut ansehen
        <span className="text-foreground-secondary">›</span>
      </button>

      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm font-medium">Der Button bei Opa</p>
        <p className="text-sm text-foreground-secondary">
          Opa hat einen roten Knopf zuhause. Drückt er ihn morgens, zählt das als „{PRESS_LABEL.morning}“. Drückt er
          ihn abends, zählt das als „{PRESS_LABEL.evening}“. Mehr muss er nicht tun – kein Handy, keine App für ihn.
        </p>
      </div>

      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm font-medium">Wenn sich Opa nicht meldet</p>
        <p className="text-sm text-foreground-secondary">
          Fehlt die {PRESS_LABEL.evening}-Meldung zur erwarteten Zeit, passiert Folgendes:
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 text-sm text-foreground-secondary">
          <li>• Bei Opa zuhause piept ein kleiner Summer alle 20 Sekunden, um ihn ans Drücken zu erinnern</li>
          <li>• Du bekommst eine Nachricht auf dein Handy</li>
        </ul>
      </div>

      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm font-medium">Was du einstellen kannst</p>
        <p className="text-sm text-foreground-secondary">Unter „Meine Benachrichtigungen“ bestimmst du für dich selbst:</p>
        <ul className="mt-1 flex flex-col gap-0.5 text-sm text-foreground-secondary">
          <li>• Ob du überhaupt benachrichtigt werden willst</li>
          <li>• Ob deine Erinnerungszeit automatisch (an den Sonnenuntergang gekoppelt) oder fest sein soll</li>
          <li>• Ob du zusätzlich bei JEDEM Knopfdruck eine Nachricht willst, nicht nur im Alarmfall</li>
        </ul>
      </div>

      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm font-medium">Wenn eine Meldung fehlt – was du tun kannst</p>
        <ul className="mt-1 flex flex-col gap-0.5 text-sm text-foreground-secondary">
          <li>• <span className="font-medium text-foreground">Opa anrufen</span> – direkt aus der App</li>
          <li>
            • <span className="font-medium text-foreground">Opa erinnern</span> – löst sofort den Piepton bei ihm
            aus, auch außerhalb der üblichen Zeit
          </li>
          <li>
            • <span className="font-medium text-foreground">Alles in Ordnung</span> – falls du weißt, dass es ihm
            gut geht, er aber einfach nicht gedrückt hat (z.B. beim Arzt), gibst du Entwarnung – das informiert
            auch alle anderen
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm font-medium">Der Wochenüberblick</p>
        <p className="text-sm text-foreground-secondary">
          Sonne und Mond zeigen dir auf einen Blick, an welchen Tagen sich Opa pünktlich gemeldet hat – tippe auf
          einen Tag für Details.
        </p>
      </div>
    </CollapsibleSection>
  );
}

function VersionBereich() {
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <CollapsibleSection title="Version" summary={`v${CHANGELOG[0].version}`}>
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
      <PiStatusBereich />
      <ErinnerungszeitenHeuteBereich />
      <FamilieBereich />
      <DesignBereich />
      <SoFunktioniertsBereich />
      <VersionBereich />
    </main>
  );
}
