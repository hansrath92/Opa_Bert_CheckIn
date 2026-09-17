"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getBerlinDateKey, getBerlinTimeLabel } from "@/lib/press";

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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-4 dark:border-white/15">
      <span className="text-lg font-medium">{label}</span>
      {press ? (
        <span className="text-xl font-semibold text-status-done">
          ✓ {getBerlinTimeLabel(new Date(press.created_at))} Uhr
        </span>
      ) : (
        <span className="text-lg text-status-pending">Noch nicht gemeldet</span>
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
    }

    load();
    const intervalId = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-semibold text-black dark:text-white">
        Opa-Checkin
      </h1>

      {isInitialLoading ? (
        <p className="text-lg text-status-pending">Lade…</p>
      ) : lastUpdated === null ? (
        <p className="text-lg text-status-pending">
          Verbindung fehlgeschlagen — erneuter Versuch läuft automatisch
        </p>
      ) : (
        <>
          <div className="flex w-full max-w-md flex-col gap-4">
            <StatusCard label="Morgens (aufgestanden)" press={morning} />
            <StatusCard label="Abends (Tür zu)" press={evening} />
          </div>

          {openIncidents.map((incident) => (
            <div
              key={incident.type}
              className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center"
            >
              <p className="font-medium">
                {incident.type === "morning" ? "Morgens" : "Abends"}: {incident.contactName} wurde kontaktiert
              </p>
              <p className="text-sm text-status-pending">wartet auf Rückmeldung</p>
            </div>
          ))}

          <div className="flex flex-col items-center gap-1 text-sm text-status-pending">
            <span>Zuletzt aktualisiert: {getBerlinTimeLabel(lastUpdated, { seconds: true })} Uhr</span>
            {error && <span>Aktualisierung fehlgeschlagen, versuche es weiter automatisch</span>}
          </div>

          <Link href="/kontakt" className="text-sm underline text-status-pending">
            Ich bin ein Kontakt
          </Link>
        </>
      )}
    </main>
  );
}
