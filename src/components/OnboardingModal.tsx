"use client";

import { useState } from "react";

// Reine Präsentationskomponente - wann sie erscheint (automatisch nach dem
// Beitreten vs. manuell über Einstellungen) entscheiden die Aufrufer.
const STEPS = [
  {
    title: "Heute",
    description:
      "Hier siehst du auf einen Blick, ob Opa sich heute schon gemeldet hat - morgens und abends.",
  },
  {
    title: "Opa erinnern",
    description:
      "Mit diesem Button kannst du jederzeit selbst einen Piepton bei Opa zuhause auslösen.",
  },
  {
    title: "Verlauf",
    description: "Hier siehst du die letzten Tage auf einen Blick, inklusive aller Erinnerungen.",
  },
  {
    title: "Einstellungen",
    description:
      "Hier stellst du deine Benachrichtigungszeit ein - und findest diese Einführung jederzeit wieder.",
  },
];

export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-2 text-lg font-semibold">{STEPS[step].title}</h2>
        <p className="mb-5 text-sm text-foreground-secondary">{STEPS[step].description}</p>

        <div className="mb-5 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: i === step ? "var(--accent)" : "var(--border)" }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} className="p-2 text-sm text-foreground-secondary">
            Überspringen
          </button>
          <button
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white"
          >
            {isLast ? "Fertig" : "Weiter"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-foreground-secondary">
          {step + 1} von {STEPS.length}
        </p>
      </div>
    </div>
  );
}
