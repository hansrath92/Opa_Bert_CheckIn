"use client";

import { ChangelogEntry } from "@/lib/changelog";

// Reine Präsentationskomponente - die Logik, WANN sie erscheint (Versions-
// Vergleich, localStorage), steckt in AppPopups.tsx.
export default function WhatsNewModal({
  entries,
  onClose,
}: {
  entries: ChangelogEntry[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Was ist neu</h2>
        <ul className="mb-4 flex flex-col gap-2 text-sm text-foreground-secondary">
          {entries.flatMap((entry) => entry.changes).map((change, i) => (
            <li key={i}>• {change}</li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="min-h-[56px] w-full rounded-[var(--radius-card)] bg-accent px-4 py-2 text-sm font-medium text-white active:bg-accent-hover"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
