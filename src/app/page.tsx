"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";
import { OPA_PHONE_NUMBER } from "@/lib/opa";

// Nach zwei verpassten Heartbeats (Pi sendet alle 5 Minuten) gilt er als offline.
const PI_OFFLINE_THRESHOLD_MINUTES = 10;

type Press = {
  id: string;
  type: "morning" | "evening";
  created_at: string;
};

type Incident = {
  type: "morning" | "evening";
  contactName: string | null;
};

function StatusCard({ label, press }: { label: string; press: Press | null }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
      <span className="text-lg font-medium">{label}</span>
      {press ? (
        <span className="rounded-full bg-success-bg px-3 py-1 text-lg font-semibold text-success-text">
          ✓ {getBerlinTimeLabel(new Date(press.created_at))} Uhr
        </span>
      ) : (
        <span className="text-lg text-foreground-secondary">Noch nicht gemeldet</span>
      )}
    </div>
  );
}

export default function Home() {
  const [morning, setMorning] = useState<Press | null>(null);
  const [evening, setEvening] = useState<Press | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);
  const [piLastSeenAt, setPiLastSeenAt] = useState<Date | null>(null);
  const [reminderStatus, setReminderStatus] = useState<"idle" | "sending" | "sent">("idle");

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

      const { data: heartbeat } = await supabase
        .from("pi_heartbeat")
        .select("last_seen_at")
        .eq("id", 1)
        .maybeSingle();
      if (heartbeat) setPiLastSeenAt(new Date(heartbeat.last_seen_at));
    }

    load();
    const intervalId = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  async function handleRemindOpa() {
    setReminderStatus("sending");
    try {
      const response = await fetch("/api/buzzer-trigger", { method: "POST" });
      setReminderStatus(response.ok ? "sent" : "idle");
    } catch {
      setReminderStatus("idle");
    }
  }

  const hasOpenIncident = openIncidents.length > 0;
  const piMinutesAgo = piLastSeenAt ? (Date.now() - piLastSeenAt.getTime()) / (60 * 1000) : null;
  const isPiOnline = piMinutesAgo !== null && piMinutesAgo < PI_OFFLINE_THRESHOLD_MINUTES;

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Heute</h1>
        {piLastSeenAt && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isPiOnline ? "bg-success-bg text-success-text" : "bg-warning/10 text-warning"
            }`}
          >
            {isPiOnline ? "● Pi online" : "○ Pi offline"}
          </span>
        )}
      </div>

      {isInitialLoading ? (
        <p className="text-lg text-foreground-secondary">Lade…</p>
      ) : lastUpdated === null ? (
        <p className="text-lg text-foreground-secondary">
          Verbindung fehlgeschlagen — erneuter Versuch läuft automatisch
        </p>
      ) : (
        <>
          {/* Alarm-Zustand deutlich sichtbar: grün = alles gut, orange = wartet auf Rückmeldung */}
          <div
            className={`rounded-2xl p-4 text-center font-medium ${
              hasOpenIncident ? "bg-warning/10 text-warning" : "bg-success-bg text-success-text"
            }`}
          >
            {hasOpenIncident ? "Achtung: Meldung fehlt" : "Alles in Ordnung"}
          </div>

          <div className="flex flex-col gap-4">
            <StatusCard label="Morgens (aufgestanden)" press={morning} />
            <StatusCard label="Abends (Tür zu)" press={evening} />
          </div>

          <a
            href={`tel:${OPA_PHONE_NUMBER}`}
            className="flex items-center justify-center gap-2 bg-accent p-4 text-lg font-semibold text-white"
            style={{ borderRadius: "14px" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Opa anrufen
          </a>

          {!evening && (
            <button
              onClick={handleRemindOpa}
              disabled={reminderStatus === "sending"}
              className="rounded-2xl border border-border bg-card p-4 text-center text-lg font-medium"
              style={{ borderRadius: "14px" }}
            >
              {reminderStatus === "sent"
                ? "✓ Erinnerung ausgelöst"
                : reminderStatus === "sending"
                ? "Wird ausgelöst…"
                : "Opa erinnern (Piepton)"}
            </button>
          )}

          {openIncidents.map((incident) => (
            <div
              key={incident.type}
              className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-center"
            >
              <p className="font-medium">
                {incident.type === "morning" ? "Morgens" : "Abends"}: {incident.contactName} wurde kontaktiert
              </p>
              <p className="text-sm text-foreground-secondary">wartet auf Rückmeldung</p>
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
