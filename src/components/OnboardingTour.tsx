"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type Step = {
  path: string;
  target: string;
  title: string;
  description: string;
};

// Jeder Schritt zeigt auf ein echtes Element (data-onboarding="...") auf der
// jeweiligen Seite - der Rundgang navigiert wirklich dorthin, statt nur ein
// Text-Popup über der aktuellen Seite zu zeigen.
const STEPS: Step[] = [
  {
    path: "/",
    target: "status",
    title: "Heute",
    description: "Hier siehst du auf einen Blick, ob Opa sich heute schon gemeldet hat.",
  },
  {
    path: "/",
    target: "remind",
    title: "Opa erinnern",
    description: "Mit diesem Button löst du jederzeit selbst eine Erinnerung bei Opa zuhause aus.",
  },
  {
    path: "/verlauf",
    target: "verlauf-list",
    title: "Verlauf",
    description: "Hier siehst du die letzten sieben Tage auf einen Blick, inklusive aller Erinnerungen.",
  },
  {
    path: "/einstellungen",
    target: "notifications",
    title: "Benachrichtigungen",
    description: "Hier aktivierst du Push-Benachrichtigungen und findest diesen Rundgang jederzeit wieder.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };
const SPOTLIGHT_PADDING = 8;

export default function OnboardingTour({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Zur passenden Seite navigieren, sobald ein Schritt das verlangt.
  useEffect(() => {
    if (pathname !== step.path) {
      router.push(step.path);
    }
  }, [step.path, pathname, router]);

  // Zielelement suchen und vermessen, sobald wir auf der richtigen Seite sind.
  // Kein Treffer (z.B. weil der "Opa erinnern"-Button gerade ausgeblendet ist) ->
  // rect bleibt null, die Erklär-Leiste zeigt dann einfach ohne Spotlight an.
  useEffect(() => {
    if (pathname !== step.path) {
      setRect(null);
      return;
    }

    let cancelled = false;

    function measure() {
      const el = document.querySelector(`[data-onboarding="${step.target}"]`);
      if (!el) {
        if (!cancelled) setRect(null);
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "auto" });
      const r = el.getBoundingClientRect();
      if (!cancelled) setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    // Kurze Verzögerung, damit die Seite nach der Navigation fertig gerendert hat.
    const timeoutId = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener("resize", measure);
    };
  }, [pathname, step.path, step.target]);

  function next() {
    if (isLast) {
      onClose();
    } else {
      setRect(null);
      setStepIndex((i) => i + 1);
    }
  }

  return (
    <>
      {rect ? (
        <div
          className="fixed"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            borderRadius: 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
            pointerEvents: "none",
            zIndex: 51,
          }}
        />
      ) : (
        <div className="fixed inset-0 z-50 bg-black/70" />
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-[52] flex flex-col gap-3 rounded-t-2xl border-t border-border bg-card p-6"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <h2 className="text-lg font-semibold">{step.title}</h2>
        <p className="text-sm text-foreground-secondary">{step.description}</p>

        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: i === stepIndex ? "var(--accent)" : "var(--border)" }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} className="p-2 text-sm text-foreground-secondary">
            Überspringen
          </button>
          <button onClick={next} className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white">
            {isLast ? "Fertig" : "Weiter"}
          </button>
        </div>
      </div>
    </>
  );
}
