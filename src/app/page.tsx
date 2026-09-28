"use client";

import { useEffect, useState } from "react";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";
import { formatRelativeDayLabel } from "@/lib/days";
import { OPA_PHONE_NUMBER } from "@/lib/opa";
import { PRESS_LABEL } from "@/lib/naming";
import { useContact } from "@/components/IdentityGate";
import SevenDayOverview from "@/components/SevenDayOverview";

type Press = {
  type: "morning" | "evening";
  created_at: string;
};

type NamedEvent = { created_at: string; contact_name: string };

type Incident = {
  type: "morning" | "evening";
  // Morgens max. ein Name (Kette), abends evtl. mehrere (jeder zu seiner Zeit)
  contactNames: string[];
  // Wer für DIESEN Vorfall schon benachrichtigt wurde und noch nicht
  // geantwortet hat - nur diese Personen dürfen entwarnen/rückmelden.
  pendingContactIds: string[];
};

// Zustand einer einzelnen Guten-Morgen/Gute-Nacht-Zeile in der Status-Kachel -
// unabhängig vom Gesamtzustand der Kachel, jede Zeile hat ihre eigene Farbe.
type RowState = "done" | "waiting" | "missed" | "neutral";

const ROW_COLORS: Record<RowState, { text: string; bg: string }> = {
  done: { text: "text-success-text", bg: "bg-success-bg" },
  waiting: { text: "text-info", bg: "bg-info-bg" },
  missed: { text: "text-warning", bg: "bg-warning-bg" },
  neutral: { text: "text-foreground-secondary", bg: "bg-neutral-bg" },
};

function SunGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}

// Icon im Kopf der Status-Kachel - eines pro Gesamtzustand.
function StateGlyph({ state }: { state: "done" | "waiting" | "alarm" | "reminder" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {state === "done" && <path d="M20 6 9 17l-5-5" />}
      {state === "waiting" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </>
      )}
      {state === "alarm" && (
        <>
          <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.28 2.25h17.8A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </>
      )}
      {state === "reminder" && (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </>
      )}
    </svg>
  );
}

// Eine der beiden "weißen Zeilen" (Guten Morgen / Gute Nacht) innerhalb der
// Status-Kachel - Icon in farbigem Quadrat, Wert rechts in derselben Farbe.
function StatusRow({ icon, label, value, state }: { icon: React.ReactNode; label: string; value: string; state: RowState }) {
  const colors = ROW_COLORS[state];
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card p-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}>{icon}</div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className={`whitespace-nowrap text-sm font-semibold ${colors.text}`}>{value}</span>
    </div>
  );
}

export default function Home() {
  const contact = useContact();
  const [presses, setPresses] = useState<Press[]>([]);
  const [standDowns, setStandDowns] = useState<NamedEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);
  const [reminderStatus, setReminderStatus] = useState<"idle" | "sending">("idle");
  const [buzzerActiveSince, setBuzzerActiveSince] = useState<Date | null>(null);
  // Wann die Erinnerung zuletzt bewusst gestoppt wurde (falls heute schon mal
  // geschehen) - macht auf "Heute" transparent, dass sie nicht einfach
  // kommentarlos verschwunden, sondern gezielt beendet wurde.
  const [snoozedAt, setSnoozedAt] = useState<Date | null>(null);
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
      // Presses + Entwarnungen kommen aus /api/verlauf (dieselbe Quelle wie
      // der Verlauf-Tab) - evening_stand_downs ist per RLS nicht direkt vom
      // Client lesbar, nur serverseitig über diese Route.
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
          const { shouldBuzz, activeSince, snoozedAt: snoozed } = await buzzerResponse.json();
          setBuzzerActiveSince(shouldBuzz && activeSince ? new Date(activeSince) : null);
          setSnoozedAt(snoozed ? new Date(snoozed) : null);
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
        const now = new Date();
        setBuzzerActiveSince(nextActive ? now : null);
        setSnoozedAt(nextActive ? null : now);
      }
      setReminderStatus("idle");
    } catch {
      setReminderStatus("idle");
    }
  }

  const todayKey = getBerlinDateKey(new Date());
  const isToday = (iso: string) => getBerlinDateKey(new Date(iso)) === todayKey;

  const todaysPresses = presses.filter((p) => isToday(p.created_at));
  const morning = todaysPresses.find((p) => p.type === "morning") ?? null;
  const evening = todaysPresses.find((p) => p.type === "evening") ?? null;
  // Neuester Druck je Typ, egal an welchem Tag - als Rückfall für die
  // "Guten Morgen kommt noch"-Referenz auf den Vortag.
  const lastMorningPress = presses.find((p) => p.type === "morning") ?? null;
  const todayStandDown = standDowns.find((s) => isToday(s.created_at)) ?? null;

  const hasOpenIncident = openIncidents.length > 0;
  const morningIncidentOpen = openIncidents.some((i) => i.type === "morning");
  const eveningIncidentOpen = openIncidents.some((i) => i.type === "evening");
  const isBuzzerActive = buzzerActiveSince !== null;
  // "Gute Nacht" kommt erst dran, wenn "Guten Morgen" schon vorliegt - sonst
  // zeigte die Kachel direkt nach Mitternacht fälschlich schon den Abend-
  // Countdown an, obwohl der Morgen noch gar nicht passiert ist.
  const morningPending = !morning && !hasOpenIncident;
  // "Gute Nacht" ist erst dann wirklich überfällig, wenn auch der Cron einen
  // Alarm eröffnet hat (hasOpenIncident) - bis dahin (auch nach der eigenen
  // Deadline, wegen der 15-Minuten-Prüflücke) zeigen wir noch die Wartezeit.
  const deadlinePending = !evening && !hasOpenIncident && myDeadline !== null && now !== null && now < myDeadline;
  // Ein echter Druck NACH der eigenen Deadline gilt als "verspätet" - rein
  // clientseitig aus vorhandenen Daten hergeleitet, keine eigene Kennzeichnung
  // in der Datenbank nötig.
  const wasLatePress = evening !== null && myDeadline !== null && new Date(evening.created_at) > myDeadline;

  // Gesamtzustand der Kachel, bestimmt Hintergrund-/Textfarbe.
  const tileState: "alarm" | "reminder" | "waiting" | "done" = hasOpenIncident
    ? "alarm"
    : isBuzzerActive
    ? "reminder"
    : morningPending || deadlinePending
    ? "waiting"
    : "done";
  const tileColors = {
    alarm: { bg: "bg-warning-bg", text: "text-warning" },
    reminder: { bg: "bg-info-bg", text: "text-info" },
    waiting: { bg: "bg-info-bg", text: "text-info" },
    done: { bg: "bg-success-bg", text: "text-success-text" },
  }[tileState];
  const tileGlyph = tileState === "done" ? "done" : tileState === "reminder" ? "reminder" : tileState === "alarm" ? "alarm" : "waiting";

  // Zustand der "Guten Morgen"-Zeile.
  const morningRow: { state: RowState; value: string } = morning
    ? { state: "done", value: `${getBerlinTimeLabel(new Date(morning.created_at))} Uhr` }
    : morningIncidentOpen
    ? { state: "missed", value: "fehlt" }
    : { state: "waiting", value: "kommt noch" };

  // Zustand der "Gute Nacht"-Zeile.
  const eveningRow: { state: RowState; value: string } = evening
    ? { state: "done", value: `${getBerlinTimeLabel(new Date(evening.created_at))} Uhr` }
    : todayStandDown
    ? { state: "done", value: "Entwarnt" }
    : eveningIncidentOpen
    ? { state: "missed", value: "fehlt" }
    : deadlinePending && myDeadline
    ? { state: "waiting", value: `bis ${getBerlinTimeLabel(myDeadline)} Uhr` }
    : { state: "neutral", value: "-" };

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
          {/* Status-Kachel: Kopf (Icon + Titel + Untertext) und darunter zwei
              Zeilen für Guten Morgen/Gute Nacht, jede mit eigener Farbe -
              unabhängig vom Gesamtzustand der Kachel. */}
          <div
            data-onboarding="status"
            className={`flex flex-col gap-3 rounded-[var(--radius-tile)] p-4 ${tileColors.bg} ${tileColors.text}`}
          >
            <div className="flex items-start gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card">
                <StateGlyph state={tileGlyph} />
              </div>
              <div className="flex-1 pt-1">
                {hasOpenIncident ? (
                  <>
                    <p className="text-lg font-bold">Opa hat sich noch nicht gemeldet</p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {eveningIncidentOpen && myDeadline
                        ? `${PRESS_LABEL.evening} war bis ${getBerlinTimeLabel(myDeadline)} Uhr fällig.`
                        : `${PRESS_LABEL.morning} fehlt seit heute Morgen.`}
                    </p>
                  </>
                ) : isBuzzerActive ? (
                  <>
                    <p className="text-lg font-bold">
                      Opa wurde um {buzzerActiveSince && getBerlinTimeLabel(buzzerActiveSince)} Uhr erinnert und wird
                      alle 20 Sek. mit einem Piepton erinnert zu drücken.
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">Hier nochmals antippen zum Stoppen der Erinnerung</p>
                  </>
                ) : morningPending ? (
                  <>
                    <p className="text-lg font-bold">{PRESS_LABEL.morning} kommt noch.</p>
                    {lastMorningPress && (
                      <p className="mt-0.5 text-sm text-foreground">
                        {formatRelativeDayLabel(getBerlinDateKey(new Date(lastMorningPress.created_at)), todayKey)} hat
                        er sich um {getBerlinTimeLabel(new Date(lastMorningPress.created_at))} Uhr gemeldet.
                      </p>
                    )}
                  </>
                ) : deadlinePending ? (
                  <>
                    <p className="text-lg font-bold">{PRESS_LABEL.evening} kommt noch.</p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {PRESS_LABEL.evening} zählt bis {myDeadline && getBerlinTimeLabel(myDeadline)} Uhr. Er meldet
                      sich bestimmt gleich.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold">Alles in Ordnung</p>
                    {todayStandDown ? (
                      <p className="mt-0.5 text-sm text-foreground">
                        Entwarnung von {todayStandDown.contact_name} um {getBerlinTimeLabel(new Date(todayStandDown.created_at))}{" "}
                        Uhr.
                      </p>
                    ) : wasLatePress ? (
                      <p className="mt-0.5 text-sm text-foreground">
                        Opa hat sich um {getBerlinTimeLabel(new Date(evening!.created_at))} Uhr gemeldet.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <StatusRow icon={<SunGlyph />} label={PRESS_LABEL.morning} value={morningRow.value} state={morningRow.state} />
            <StatusRow icon={<MoonGlyph />} label={PRESS_LABEL.evening} value={eveningRow.value} state={eveningRow.state} />

            {/* Transparent machen, DASS und WANN eine Erinnerung bewusst gestoppt
                wurde - sonst wirkt es, als wäre "Erinnerung aktiv" kommentarlos
                verschwunden. Bei Entwarnung steht der Grund schon oben, hier nicht
                nochmal doppelt erwähnen. */}
            {snoozedAt && !isBuzzerActive && !todayStandDown && (
              <p className="text-center text-xs opacity-80">
                Erinnerung wurde um {getBerlinTimeLabel(snoozedAt)} Uhr zurückgesetzt.
              </p>
            )}
          </div>

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
                      className="min-h-[56px] rounded-[var(--radius-card)] px-4 py-2 text-sm font-semibold text-accent underline"
                    >
                      {standDownStatus === "sending" ? "Wird gesendet…" : "Alles in Ordnung – nur nicht gedrückt"}
                    </button>
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              {!evening && (
                <button
                  data-onboarding="remind"
                  onClick={handleRemindOpa}
                  disabled={reminderStatus === "sending"}
                  className={`min-h-[56px] p-4 text-center text-lg font-medium ${
                    isBuzzerActive ? "bg-warning text-white" : "border border-border bg-card"
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

              <SevenDayOverview presses={presses} standDowns={standDowns} />
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
