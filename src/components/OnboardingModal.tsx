"use client";

// Reine Präsentationskomponente - wann sie erscheint (erster Login vs. manuell
// über Einstellungen) entscheiden die Aufrufer, nicht diese Komponente selbst.
export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Willkommen bei Opa-Checkin</h2>
        <ul className="mb-4 flex flex-col gap-2 text-sm text-foreground-secondary">
          <li>
            • Opa drückt morgens beim Aufstehen und abends beim Zuschließen der
            Haustür auf seinen roten Knopf.
          </li>
          <li>
            • Unter <strong className="text-foreground">Heute</strong> siehst du sofort,
            ob er sich schon gemeldet hat.
          </li>
          <li>
            • Meldet er sich zu lange nicht, wird automatisch die Familie
            benachrichtigt - du musst nicht ständig nachschauen.
          </li>
          <li>
            • Mit <strong className="text-foreground">Opa erinnern</strong> kannst
            du jederzeit selbst einen Piepton bei ihm auslösen.
          </li>
          <li>
            • Unter <strong className="text-foreground">Verlauf</strong> siehst du
            die letzten Tage, unter <strong className="text-foreground">Einstellungen</strong>{" "}
            deine Benachrichtigungszeit und diese Einführung nochmal.
          </li>
        </ul>
        <button
          onClick={onClose}
          className="w-full rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
