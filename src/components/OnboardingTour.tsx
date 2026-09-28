"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type Step = {
  path: string;
  // Fehlt target, ist der Schritt reine Erklärung ohne Spotlight auf ein
  // Element (z.B. Begrüßung/Abschluss) - die Anzeige dimmt dann einfach die
  // ganze Seite ab, ohne ein Loch hineinzuschneiden.
  target?: string;
  title: string;
  description: string;
};

// Ausführlicher, echter Rundgang durch die ganze App - jeder Schritt zeigt
// (wo möglich) auf ein echtes Element (data-onboarding="...") und navigiert
// wirklich dorthin. Ziel: eine komplett neue Person versteht danach, was die
// App macht, ohne vorher irgendwo nachfragen zu müssen.
const STEPS: Step[] = [
  {
    path: "/",
    title: "Willkommen bei Lebenszeichen",
    description:
      "Opa hat zuhause einen roten Knopf. Er drückt ihn morgens beim Aufstehen und abends beim Zuschließen. Diese App zeigt der Familie, ob er sich gemeldet hat - ganz ohne täglich anrufen zu müssen.",
  },
  {
    path: "/",
    target: "status",
    title: "Der Status auf einen Blick",
    description:
      "Grün: alles in Ordnung. Blau: Opa wird gerade per Knopfdruck an den Piepser erinnert. Orange: er hat sich nicht gemeldet, die Familie wurde schon benachrichtigt.",
  },
  {
    path: "/",
    target: "status",
    title: "Guten Morgen & Gute Nacht",
    description:
      "Ein Druck vor 12 Uhr zählt als \"Guten Morgen\", danach als \"Gute Nacht\". Die beiden Zeilen in der Kachel zeigen, ob und wann Opa heute schon gedrückt hat.",
  },
  {
    path: "/",
    target: "week-overview",
    title: "Die letzten 7 Tage",
    description:
      "Sonne = Guten Morgen, Mond = Gute Nacht. Grün gefüllt heißt gedrückt, gestrichelt orange heißt verpasst. Tippe auf einen Tag für die genaue Uhrzeit.",
  },
  {
    path: "/",
    target: "remind",
    title: "Opa erinnern",
    description:
      "Mit diesem Button löst du selbst jederzeit einen Piepton bei Opa zuhause aus - zusätzlich zur automatischen Erinnerung, die abends von selbst startet.",
  },
  {
    path: "/",
    target: "call",
    title: "Opa anrufen",
    description: "Ein direkter Anruf bei Opa ist immer nur einen Fingertipp entfernt.",
  },
  {
    path: "/",
    title: "Wenn eine Meldung fehlt",
    description:
      "Weißt du, dass es Opa gutgeht, er aber einfach nicht gedrückt hat (z.B. beim Arzt)? Dann gibst du \"Alles in Ordnung\" - das stoppt den Piepser und informiert auch alle anderen, die schon benachrichtigt wurden.",
  },
  {
    path: "/verlauf",
    target: "verlauf-list",
    title: "Verlauf-Tab",
    description:
      "Hier siehst du die letzten sieben Tage im Detail, inklusive aller manuellen Erinnerungen und Entwarnungen.",
  },
  {
    path: "/einstellungen",
    target: "notifications",
    title: "Meine Benachrichtigungen",
    description:
      "Hier aktivierst du Push-Nachrichten und stellst ganz für dich persönlich ein, ob und wann du benachrichtigt wirst, wenn Opa sich nicht meldet.",
  },
  {
    path: "/einstellungen",
    target: "pi-status",
    title: "Ist der Knopf online?",
    description: "Hier siehst du, ob das Gerät bei Opa gerade mit dem Internet verbunden ist.",
  },
  {
    path: "/einstellungen",
    target: "design",
    title: "Hell oder Dunkel",
    description: "Falls dir ein dunkles Design lieber ist als das helle, kannst du das hier umstellen.",
  },
  {
    path: "/einstellungen",
    title: "Das war's!",
    description:
      "Du findest diesen Rundgang jederzeit wieder unter Einstellungen → \"Erste Schritte erneut ansehen\".",
  },
];

type Rect = { top: number; left: number; width: number; height: number };
const SPOTLIGHT_PADDING = 8;

export default function OnboardingTour({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  // Erklär-Leiste klebt normalerweise unten - steht das erklärte Element
  // selbst in der unteren Bildschirmhälfte (z.B. "Opa erinnern"/"Opa
  // anrufen" ganz unten auf "Heute"), würde sie es sonst zudecken. Dann
  // zeigt sie stattdessen oben an.
  const [sheetOnTop, setSheetOnTop] = useState(false);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Zur passenden Seite navigieren, sobald ein Schritt das verlangt.
  useEffect(() => {
    if (pathname !== step.path) {
      router.push(step.path);
    }
  }, [step.path, pathname, router]);

  // Zielelement suchen und vermessen, sobald wir auf der richtigen Seite sind.
  // Kein target (reine Erklär-Folie) oder kein Treffer (z.B. weil der
  // "Opa erinnern"-Button gerade ausgeblendet ist) -> rect bleibt null, die
  // Erklär-Leiste zeigt dann einfach ohne Spotlight an, nur abgedunkelt.
  useEffect(() => {
    if (pathname !== step.path || !step.target) {
      setRect(null);
      setSheetOnTop(false);
      return;
    }

    let cancelled = false;
    const target = step.target;

    function measure() {
      const el = document.querySelector(`[data-onboarding="${target}"]`);
      if (!el) {
        if (!cancelled) {
          setRect(null);
          setSheetOnTop(false);
        }
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "auto" });
      const r = el.getBoundingClientRect();
      if (!cancelled) {
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        // Element-Mitte unterhalb der Bildschirm-Mitte -> Leiste nach oben,
        // sonst würde sie genau das erklärte Element überdecken.
        setSheetOnTop(r.top + r.height / 2 > window.innerHeight / 2);
      }
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
      setSheetOnTop(false);
      setStepIndex((i) => i + 1);
    }
  }

  function back() {
    if (stepIndex > 0) {
      setRect(null);
      setSheetOnTop(false);
      setStepIndex((i) => i - 1);
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
            borderRadius: 18,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
            pointerEvents: "none",
            zIndex: 51,
          }}
        />
      ) : (
        <div className="fixed inset-0 z-50 bg-black/70" />
      )}

      <div
        className={`fixed inset-x-0 z-[52] flex flex-col gap-3 border-border bg-card p-6 ${
          sheetOnTop
            ? "top-0 rounded-b-[var(--radius-tile)] border-b"
            : "bottom-0 rounded-t-[var(--radius-tile)] border-t"
        }`}
        style={
          sheetOnTop
            ? { paddingTop: "max(1.5rem, env(safe-area-inset-top))" }
            : { paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }
        }
      >
        <span className="text-xs font-medium text-foreground-secondary">
          Schritt {stepIndex + 1} von {STEPS.length}
        </span>
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
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button onClick={back} className="p-2 text-sm text-foreground-secondary">
                Zurück
              </button>
            )}
            <button onClick={onClose} className="p-2 text-sm text-foreground-secondary">
              Überspringen
            </button>
          </div>
          <button
            onClick={next}
            className="min-h-[56px] rounded-[var(--radius-card)] bg-accent px-6 py-3 text-sm font-medium text-white active:bg-accent-hover"
          >
            {isLast ? "Fertig" : "Weiter"}
          </button>
        </div>
      </div>
    </>
  );
}
