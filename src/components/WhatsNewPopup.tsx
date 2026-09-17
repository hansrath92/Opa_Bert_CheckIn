"use client";

import { useEffect, useState } from "react";
import { CURRENT_VERSION, ChangelogEntry, getChangesSince } from "@/lib/changelog";

const STORAGE_KEY = "opa-checkin-last-seen-version";

export default function WhatsNewPopup() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);

    // Ganz neue Person: still merken, kein "Was ist neu"-Popup für alte Versionen zeigen.
    if (lastSeen === null) {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
      return;
    }

    const relevant = getChangesSince(lastSeen);
    if (relevant.length > 0) setEntries(relevant);
  }, []);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setEntries(null);
  }

  if (!entries) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Was ist neu</h2>
        <ul className="mb-4 flex flex-col gap-2 text-sm text-foreground-secondary">
          {entries.flatMap((entry) => entry.changes).map((change, i) => (
            <li key={i}>• {change}</li>
          ))}
        </ul>
        <button
          onClick={handleClose}
          className="w-full rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
