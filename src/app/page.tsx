"use client";

import { useEffect, useState } from "react";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";
import { formatRelativeDayLabel } from "@/lib/days";
import { OPA_PHONE_NUMBER } from "@/lib/opa";
import { PRESS_LABEL } from "@/lib/naming";
import { useContact } from "@/components/IdentityGate";
import CollapsibleSection from "@/components/CollapsibleSection";
import SevenDayOverview from "@/components/SevenDayOverview";

type Press = {
  type: "morning" | "evening";
  created_at: string;
};

type StandDown = { created_at: string };

type Incident = {
  type: "morning" | "evening";
  // Morgens max. ein Name (Kette), abends evtl. mehrere (jeder zu seiner Zeit)
  contactNames: string[];
  // Wer für DIESEN Vorfall schon benachrichtigt wurde und noch nicht
  // geantwortet hat - nur diese Personen dürfen entwarnen/rückmelden.
  pendingContactIds: string[];
};

// Zeigt den heutigen Druck, oder - falls noch keiner da ist - den letzten
// bekannten (z.B. früh morgens noch die "Gute Nacht" von gestern Abend),
// damit die Familie auch dann Kontext hat, wann zuletzt ein Lebenszeichen kam.
function StatusCard({ label, press, lastPress }: { label: string; press: Press | null; lastPress: Press | null }) {
  const todayKey = getBerlinDateKey(new Date());
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-card p-5">
      <span className="shrink-0 whitespace-nowrap text-lg font-medium">{label}</span>
      {press ? (
        <span className="whitespace-nowrap rounded-full bg-success-bg px-3 py-1 text-lg font-semibold text-success-text">
          ✓ {getBerlinTimeLabel(new Date(press.created_at))} Uhr
        </span>
      ) : lastPress ? (
        <span className="whitespace-nowrap text-right text-sm text-foreground-secondary">
          Zuletzt gedrückt:
          <br />
          {formatRelativeDayLabel(getBerlinDateKey(new Date(lastPress.created_at)), todayKey)},{" "}
          {getBerlinTimeLabel(new Date(lastPress.created_at))} Uhr
        </span>
      ) : (
        <span className="whitespace-nowrap text-lg text-foreground-secondary">Noch nicht gemeldet</span>
      )}
    </div>
  );
}

export default function Home() {
  const contact = useContact();
  const [presses, setPresses] = useState<Press[]>([]);
  const [standDowns, setStandDowns] = useState<StandDown[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);
  const [reminderStatus, setReminderStatus] = useState<"idle" | "sending">("idle");
  const [buzzerActiveSince, setBuzzerActiveSince] = useState<Date | null>(null);
  const [metOpaStatus, setMetOpaStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [standDownStatus, setStandDownStatus] = useState<"idle" | "sending">("idle");
  const [myDeadline, setMyDeadline] = useState<Date | null>(null);
  // "Jetzt" wird bei jedem Poll mit-gespeichert statt Date.now() beim Rendern
  // aufzurufen - so bleibt der Vergleich mit myDeadline unten eine reine
  // Funktion des States (siehe react-hooks/purity).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Presses + Entwarnungen kommen beide aus /api/verlauf (dieselbe Quelle
      // wie der Verlauf-Tab) - daily_status/evening_stand_downs sind per RLS
      // nicht direkt vom Client lesbar, nur serverseitig über diese Route.
      try {
        const verlaufResponse = await fetch("/api/verlauf");
        if (verlaufResponse.ok) {
          const { presses: freshPresses, standDowns: freshStandDowns } = await verlaufResponse.json();
          if (!cancelled) {
            setPresses(freshPresses ?? []);
            setStandDowns(freshStandDowns ?? []);
          }
        } else if (!cancelled) {
          setError("Laden fehlgeschlagen");
        }
      } catch {
        if (!cancelled) setError("Laden fehlgeschlagen");
      }

      if (cancelled) return;
      setLastUpdated(new Date());
      setNow(new Date());
      setIsInitialLoading(false);

      try {
        const statusResponse = await fetch("/api/incidents/status");
        if (statusResponse.ok) {
          const { incidents } = await statusResponse.json();
          setOpenIncidents(incidents ?? []);
        }
      } catch {
        // Eskalationsstatus ist informativ, ein Fehler hier blockiert die Hauptanzeige nicht
      }

      try {
        const buzzerResponse = await fetch("/api/buzzer-live-status");
        if (buzzerResponse.ok) {
          const { shouldBuzz, activeSince } = await buzzerResponse.json();
          setBuzzerActiveSince(shouldBuzz && activeSince ? new Date(activeSince) : null);
        }
      } catch {
        // Live-Status ist informativ, ein Fehler hier blockiert die Hauptanzeige nicht
      }

      // Persönliche Abend-Deadline GENAU dieses eingeloggten Nutzers (aus
      // seinen eigenen Benachrichtigungs-Einstellungen, automatisch oder fest).
      try {
        const scheduleResponse = await fetch(`/api/reminder-schedule?contact_id=${encodeURIComponent(contact.id)}`);
        if (scheduleResponse.ok) {
          const { myDeadline: deadline } = await scheduleResponse.json();
          setMyDeadline(deadline ? new Date(deadline) : null);
        }
      } catch {
        // Nur informativ, kein Blocker
      }
    }

    load();
    const intervalId = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [contact.id]);

  async function handleMetOpa(type: "morning" | "evening") {
    setMetOpaStatus("sending");
    try {
      const response = await fetch("/api/incidents/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contact.id, type, response: "met_opa" }),
      });
      if (response.ok) {
        setOpenIncidents((prev) => prev.filter((i) => i.type !== type));
      }
      setMetOpaStatus("idle");
    } catch {
      setMetOpaStatus("idle");
    }
  }

  // "Entwarnung": nur für den Abend-Alarm, siehe /api/incidents/stand-down.
  async function handleStandDown() {
    setStandDownStatus("sending");
    try {
      const response = await fetch("/api/incidents/stand-down", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contact.id }),
      });
      if (response.ok) {
        setOpenIncidents((prev) => prev.filter((i) => i.type !== "evening"));
        // Piepser bei Opa ist jetzt aus - optimistisch sofort anzeigen, der
        // nächste 30-Sekunden-Poll bestätigt es.
        setBuzzerActiveSince(null);
      }
      setStandDownStatus("idle");
    } catch {
      setStandDownStatus("idle");
    }
  }

  async function handleRemindOpa() {
    const nextActive = !isBuzzerActive;
    setReminderStatus("sending");
    try {
      const response = await fetch("/api/buzzer-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contact.id, active: nextActive }),
      });
      if (response.ok) {
        // Optimistisch sofort anzeigen, der nächste 30-Sekunden-Poll bestätigt/korrigiert.
        setBuzzerActiveSince(nextActive ? new Date() : null);
      }
      setReminderStatus("idle");
    } catch {
      setReminderStatus("idle");
    }
  }

  const todayKey = getBerlinDateKey(new Date());
  const todaysPresses = presses.filter((p) => getBerlinDateKey(new Date(p.created_at)) === todayKey);
  const morning = todaysPresses.find((p) => p.type === "morning") ?? null;
  const evening = todaysPresses.find((p) => p.type === "evening") ?? null;
  // Neuester Druck je Typ, egal an welchem Tag - als Rückfall, wenn heute
  // noch keiner da ist (siehe StatusCard).
  const lastMorningPress = presses.find((p) => p.type === "morning") ?? null;
  const lastEveningPress = presses.find((p) => p.type === "evening") ?? null;

  const hasOpenIncident = openIncidents.length > 0;
  const isBuzzerActive = buzzerActiveSince !== null;
  // "Gute Nacht" ist erst dann wirklich überfällig, wenn auch der Cron einen
  // Alarm eröffnet hat (hasOpenIncident) - bis dahin (auch nach der eigenen
  // Deadline, wegen der 15-Minuten-Prüflücke) zeigen wir noch die Wartezeit.
  const deadlinePending = !evening && !hasOpenIncident && myDeadline !== null && now !== null && now < myDeadline;

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Heute</h1>
        <p className="text-xs text-foreground-secondary">Angemeldet als {contact.name}</p>
      </div>

      {isInitialLoading ? (
        <p className="text-lg text-foreground-secondary">Lade…</p>
      ) : lastUpdated === null ? (
        <p className="text-lg text-foreground-secondary">
          Verbindung fehlgeschlagen — erneuter Versuch läuft automatisch
        </p>
      ) : (
        <>
          {/* Alarm-Zustand deutlich sichtbar: grün = alles gut, blau = Erinnerung läuft gerade
              bei Opa (noch keine Eskalation, kein Alarm), orange = Alarm/wartet auf Rückmeldung */}
          <div
            data-onboarding="status"
            className={`rounded-[var(--radius-tile)] p-4 text-center font-medium ${
              hasOpenIncident
                ? "bg-warning-bg text-warning"
                : isBuzzerActive
                ? "bg-info-bg text-info"
                : "bg-success-bg text-success-text"
            }`}
          >
            {hasOpenIncident ? (
              "Opa hat sich noch nicht gemeldet"
            ) : isBuzzerActive ? (
              <>
                Opa wurde um {buzzerActiveSince && getBerlinTimeLabel(buzzerActiveSince)} Uhr erinnert und wird alle
                20 Sek. mit einem Piepton erinnert zu drücken.
                <div className="mt-1 text-sm font-normal opacity-80">
                  Hier nochmals antippen zum Stoppen der Erinnerung
                </div>
              </>
            ) : deadlinePending ? (
              <>
                {PRESS_LABEL.evening} kommt noch
                <div className="mt-1 text-xs font-normal opacity-80">
                  {PRESS_LABEL.evening} zählt bis {myDeadline && getBerlinTimeLabel(myDeadline)} Uhr. Er meldet sich
                  bestimmt gleich.
                </div>
              </>
            ) : (
              "Alles in Ordnung"
            )}
          </div>

          {/* Aufklappbarer Tages-Verlauf, zusätzlich zum separaten Verlauf-Tab -
              zeigt jeden heutigen Druck einzeln mit Uhrzeit. */}
          {todaysPresses.length > 0 && (
            <CollapsibleSection title={`Heute ${todaysPresses.length}x gedrückt – Verlauf`} dataOnboarding="today-history">
              {[...todaysPresses]
                .sort((a, b) => a.created_at.localeCompare(b.created_at))
                .map((press, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 p-4">
                    <span className="text-sm font-medium">{PRESS_LABEL[press.type]}</span>
                    <span className="text-sm text-foreground-secondary">
                      {getBerlinTimeLabel(new Date(press.created_at))} Uhr
                    </span>
                  </div>
                ))}
            </CollapsibleSection>
          )}

          {hasOpenIncident ? (
            <>
              <a
                href={`tel:${OPA_PHONE_NUMBER}`}
                data-onboarding="call"
                className="flex min-h-[56px] items-center justify-center gap-2 bg-accent p-4 text-lg font-semibold text-white active:bg-accent-hover"
                style={{ borderRadius: "var(--radius-card)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Opa anrufen
              </a>

              {!evening && (
                <button
                  data-onboarding="remind"
                  onClick={handleRemindOpa}
                  disabled={reminderStatus === "sending"}
                  className={`min-h-[56px] p-4 text-center text-lg font-medium text-white ${
                    isBuzzerActive ? "bg-warning" : "bg-accent active:bg-accent-hover"
                  }`}
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  {reminderStatus === "sending"
                    ? "Wird ausgelöst…"
                    : isBuzzerActive
                    ? "Antippen zum Stoppen der Erinnerung"
                    : "Opa erinnern"}
                </button>
              )}

              {openIncidents.map((incident) => (
                <div
                  key={incident.type}
                  className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-warning/40 bg-warning-bg p-4 text-center"
                >
                  <div>
                    <p className="font-medium">Benachrichtigt: {incident.contactNames.join(", ")}</p>
                    <p className="text-sm text-foreground-secondary">wartet auf Rückmeldung</p>
                  </div>
                  {/* Jeder darf das melden, nicht nur der gerade kontaktierte Kontakt -
                      falls zufällig jemand anderes bei Opa vorbeischaut. */}
                  <button
                    onClick={() => handleMetOpa(incident.type)}
                    disabled={metOpaStatus === "sending"}
                    className="min-h-[56px] rounded-[var(--radius-card)] bg-success-text px-4 py-2 text-sm font-medium text-white"
                  >
                    Ich habe ihn getroffen
                  </button>
                  {/* "Entwarnung": nur abends, und nur für Personen, die für DIESEN
                      Alarm auch wirklich schon benachrichtigt wurden. */}
                  {incident.type === "evening" && incident.pendingContactIds.includes(contact.id) && (
                    <button
                      onClick={handleStandDown}
                      disabled={standDownStatus === "sending"}
                      className="min-h-[56px] rounded-[var(--radius-card)] border border-warning bg-card px-4 py-2 text-sm font-medium text-warning"
                    >
                      {standDownStatus === "sending" ? "Wird gesendet…" : "Alles in Ordnung – nur nicht gedrückt"}
                    </button>
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              <SevenDayOverview presses={presses} standDowns={standDowns} />

              <div data-onboarding="press-cards" className="flex flex-col gap-4">
                <StatusCard label={PRESS_LABEL.morning} press={morning} lastPress={lastMorningPress} />
                <StatusCard label={PRESS_LABEL.evening} press={evening} lastPress={lastEveningPress} />
              </div>

              {!evening && (
                <button
                  data-onboarding="remind"
                  onClick={handleRemindOpa}
                  disabled={reminderStatus === "sending"}
                  className={`min-h-[56px] p-4 text-center text-lg font-medium ${
                    isBuzzerActive
                      ? "bg-warning text-white"
                      : "border border-border bg-card"
                  }`}
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  {reminderStatus === "sending"
                    ? "Wird ausgelöst…"
                    : isBuzzerActive
                    ? "Antippen zum Stoppen der Erinnerung"
                    : "Opa erinnern"}
                </button>
              )}
            </>
          )}

          <div className="flex flex-col items-center gap-1 text-sm text-foreground-secondary">
            <span>Zuletzt aktualisiert: {getBerlinTimeLabel(lastUpdated, { seconds: true })} Uhr</span>
            {error && <span>Aktualisierung fehlgeschlagen, versuche es weiter automatisch</span>}
          </div>

          {/* Dezent, ganz unten: nur ein farbiger Rand, kein ausgefüllter Button -
              im Alarm-Zustand steht oben stattdessen die auffällige Variante. */}
          {!hasOpenIncident && (
            <a
              href={`tel:${OPA_PHONE_NUMBER}`}
              data-onboarding="call"
              className="flex min-h-[56px] items-center justify-center gap-2 border-2 border-accent bg-card p-4 text-lg font-semibold text-accent"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Opa anrufen
            </a>
          )}
        </>
      )}
    </main>
  );
}
