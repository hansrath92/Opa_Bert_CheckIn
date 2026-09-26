"use client";

import { useState } from "react";
import { isPushSupported, subscribeToPush } from "@/lib/push";

// Reine Präsentation + "Aktivieren"-Klick - die Logik, WANN das Popup
// erscheint (einmal pro Tag, nie zusammen mit anderen Popups), steckt in
// AppPopups.tsx.
export default function PushReminderModal({
  contactId,
  onClose,
}: {
  contactId: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "subscribing" | "error">("idle");

  // Ohne PushManager (typisch: iPhone, App nicht zum Home-Bildschirm
  // hinzugefügt) kann der Button nichts bewirken - dann stattdessen erklären,
  // was zu tun ist.
  const supported = isPushSupported();

  async function handleActivate() {
    setStatus("subscribing");
    try {
      await subscribeToPush(contactId);
      onClose();
    } catch {
      // Häufigster Grund: Berechtigung wurde im Browser abgelehnt/blockiert.
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Benachrichtigungen sind aus</h2>
        <p className="mb-4 text-sm text-foreground-secondary">
          Ohne Benachrichtigungen bekommst du keinen Alarm, wenn sich Opa nicht meldet.
        </p>
        {!supported && (
          <p className="mb-4 text-sm text-foreground-secondary">
            Auf dem iPhone: App über „Teilen“ → „Zum Home-Bildschirm“ hinzufügen, dort öffnen und in Einstellungen
            aktivieren.
          </p>
        )}
        {status === "error" && (
          <p className="mb-4 text-sm text-error">
            Hat nicht geklappt. Bitte Benachrichtigungen für diese Seite in den Browser-Einstellungen erlauben.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {supported && (
            <button
              onClick={handleActivate}
              disabled={status === "subscribing"}
              className="w-full rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              {status === "subscribing" ? "Wird aktiviert…" : "Jetzt aktivieren"}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
          >
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
