"use client";

import { useEffect, useRef, useState } from "react";

// Ereignis, mit dem eine ANDERE Stelle der Seite eine bestimmte Sektion
// aufklappen und dorthin scrollen lassen kann (z.B. ein "Bearbeiten"-Link in
// "Erinnerungszeiten heute", der zur eigenen Zeile in "Meine
// Benachrichtigungen" springt) - dafür braucht die Sektion die `id`-Prop.
const EXPAND_SECTION_EVENT = "opa-checkin-expand-section";

export function expandSection(id: string) {
  window.dispatchEvent(new CustomEvent(EXPAND_SECTION_EVENT, { detail: id }));
}

// Gemeinsamer Baustein für zuklappbare Bereiche (Einstellungen, "Heute"):
// standardmäßig zugeklappt, zeigt aber schon zugeklappt eine kurze
// Zusammenfassung (z.B. den aktuellen Status) - so sieht man das Wichtigste
// auf einen Blick, ohne extra aufklappen zu müssen.
export default function CollapsibleSection({
  id,
  title,
  summary,
  defaultOpen = false,
  dataOnboarding,
  children,
}: {
  id?: string;
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  dataOnboarding?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);

  // Auf das Aufklapp-Ereignis von expandSection() reagieren, falls die
  // Sektion eine passende `id` hat.
  useEffect(() => {
    if (!id) return;
    function handle(event: Event) {
      if ((event as CustomEvent<string>).detail !== id) return;
      setIsOpen(true);
      // Erst nach dem Aufklappen scrollen (nächster Frame), damit die neue
      // Höhe der Sektion beim Scrollen schon berücksichtigt wird.
      requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    window.addEventListener(EXPAND_SECTION_EVENT, handle);
    return () => window.removeEventListener(EXPAND_SECTION_EVENT, handle);
  }, [id]);

  return (
    <div
      ref={rootRef}
      id={id}
      data-onboarding={dataOnboarding}
      className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card scroll-mt-4"
    >
      <button onClick={() => setIsOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">{title}</span>
        <span className="flex items-center gap-2 text-sm text-foreground-secondary">
          {summary}
          <span>{isOpen ? "︿" : "﹀"}</span>
        </span>
      </button>
      {isOpen && <div className="flex flex-col divide-y divide-border border-t border-border">{children}</div>}
    </div>
  );
}
