"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";
import { OPA_PHONE_NUMBER } from "@/lib/opa";
import { PRESS_LABEL } from "@/lib/naming";
import { useContact } from "@/components/IdentityGate";

// Anzeige-Startwert für das "Gute Nacht"-Zeitfenster (Redesign v2, Abschnitt 6:
// "Zeitlogik-Hybrid"). Rein informativ/fest gewählt - die Backend-Regel dahinter
// bleibt unverändert die dynamische Sonnenuntergangs+Toleranz-Berechnung, die
// Endzeit unten kommt entsprechend live von /api/reminder-schedule.
const EVENING_WINDOW_DISPLAY_START = "17:00";

type Press = {
  id: string;
  type: "morning" | "evening";
  created_at: string;
};

type Incident = {
  type: "morning" | "evening";
  // Morgens max. ein Name (Kette), abends evtl. mehrere (jeder zu seiner Zeit)
  contactNames: string[];
  // Wer für DIESEN Vorfall schon benachrichtigt wurde und noch nicht
  // geantwortet hat - nur diese Personen dürfen entwarnen/rückmelden.
  pendingContactIds: string[];
};

function StatusCard({ label, press }: { label: string; press: Press | null }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-card p-5">
      <span className="shrink-0 whitespace-nowrap text-lg font-medium">{label}</span>
      {press ? (
        <span className="whitespace-nowrap rounded-full bg-success-bg px-3 py-1 text-lg font-semibold text-success-text">
          ✓ {getBerlinTimeLabel(new Date(press.created_at))} Uhr
        </span>
      ) : (
        <span className="whitespace-nowrap text-lg text-foreground-secondary">Noch nicht gemeldet</span>
      )}
    </div>
  );
}

export default function Home() {
  const contact = useContact();
  const [morning, setMorning] = useState<Press | null>(null);
  const [evening, setEvening] = useState<Press | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);
  const [reminderStatus, setReminderStatus] = useState<"idle" | "sending">("idle");
  const [buzzerActiveSince, setBuzzerActiveSince] = useState<Date | null>(null);
  const [metOpaStatus, setMetOpaStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [standDownStatus, setStandDownStatus] = useState<"idle" | "sending">("idle");
  const [eveningWindowEnd, setEveningWindowEnd] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from("presses")
        .select("id, type, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setIsInitialLoading(false);
        return;
      }

      const todayKey = getBerlinDateKey(new Date());
      const todaysRows = ((data ?? []) as Press[]).filter(
        (row) => getBerlinDateKey(new Date(row.created_at)) === todayKey
      );
      setMorning(todaysRows.find((row) => row.type === "morning") ?? null);
      setEvening(todaysRows.find((row) => row.type === "evening") ?? null);
      setLastUpdated(new Date());
      setError(null);
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

      // Pi-Online-Status wird nicht mehr hier auf "Heute" angezeigt, sondern
      // nur noch in den Einstellungen (siehe PiStatusBereich dort) - deshalb
      // wird der Heartbeat auf dieser Seite gar nicht mehr abgefragt.

      try {
        const buzzerResponse = await fetch("/api/buzzer-live-status");
        if (buzzerResponse.ok) {
          const { shouldBuzz, activeSince } = await buzzerResponse.json();
          setBuzzerActiveSince(shouldBuzz && activeSince ? new Date(activeSince) : null);
        }
      } catch {
        // Live-Status ist informativ, ein Fehler hier blockiert die Hauptanzeige nicht
      }

      // Für die "Gute Nacht zählt zwischen ... und ..."-Anzeige: früheste
      // heutige Abend-Deadline (gleiche Quelle wie "Erinnerungszeiten heute"
      // in den Einstellungen, dort schon aufsteigend sortiert).
      try {
        const scheduleResponse = await fetch("/api/reminder-schedule");
        if (scheduleResponse.ok) {
          const { schedule } = await scheduleResponse.json();
          setEveningWindowEnd(schedule?.[0]?.deadline ? new Date(schedule[0].deadline) : null);
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
  }, []);

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

  const hasOpenIncident = openIncidents.length > 0;
  const isBuzzerActive = buzzerActiveSince !== null;

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
            {hasOpenIncident
              ? "Achtung: Meldung fehlt"
              : isBuzzerActive
              ? "Opa wird erinnert"
              : "Alles in Ordnung"}
            {isBuzzerActive && !hasOpenIncident && buzzerActiveSince && (
              <div className="mt-1 text-xs font-normal opacity-80">
                Erinnerung aktiv seit {getBerlinTimeLabel(buzzerActiveSince)} Uhr
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <StatusCard label={PRESS_LABEL.morning} press={morning} />
            <StatusCard label={PRESS_LABEL.evening} press={evening} />
          </div>

          {/* Zeitlogik-Hybrid: die Regel dahinter bleibt exakt die dynamische
              Sonnenuntergang+Toleranz-Berechnung (unverändert im Backend) -
              hier nur als konkretes, verständliches Zeitfenster gezeigt. */}
          {!evening && eveningWindowEnd && (
            <p className="text-center text-sm text-foreground-secondary">
              {PRESS_LABEL.evening} zählt zwischen {EVENING_WINDOW_DISPLAY_START} und{" "}
              {getBerlinTimeLabel(eveningWindowEnd)} Uhr
            </p>
          )}

          <a
            href={`tel:${OPA_PHONE_NUMBER}`}
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
              className={`min-h-[56px] p-4 text-center text-lg font-medium ${
                isBuzzerActive ? "border border-info bg-info-bg text-info" : "border border-border bg-card"
              }`}
              style={{ borderRadius: "var(--radius-card)" }}
            >
              {reminderStatus === "sending"
                ? "Wird ausgelöst…"
                : isBuzzerActive
                ? "Opa wird erinnert – antippen zum Stoppen"
                : "Opa erinnern"}
            </button>
          )}

          {openIncidents.map((incident) => (
            <div
              key={incident.type}
              className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-warning/40 bg-warning-bg p-4 text-center"
            >
              <div>
                <p className="font-medium">
                  {incident.type === "morning" ? PRESS_LABEL.morning : PRESS_LABEL.evening}: {incident.contactNames.join(", ")}{" "}
                  {incident.contactNames.length > 1 ? "wurden" : "wurde"} kontaktiert
                </p>
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

          <div className="flex flex-col items-center gap-1 text-sm text-foreground-secondary">
            <span>Zuletzt aktualisiert: {getBerlinTimeLabel(lastUpdated, { seconds: true })} Uhr</span>
            {error && <span>Aktualisierung fehlgeschlagen, versuche es weiter automatisch</span>}
          </div>
        </>
      )}
    </main>
  );
}
