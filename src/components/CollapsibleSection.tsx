"use client";

import { useState } from "react";

// Gemeinsamer Baustein für zuklappbare Bereiche (Einstellungen, "Heute"):
// standardmäßig zugeklappt, zeigt aber schon zugeklappt eine kurze
// Zusammenfassung (z.B. den aktuellen Status) - so sieht man das Wichtigste
// auf einen Blick, ohne extra aufklappen zu müssen.
export default function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  dataOnboarding,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  dataOnboarding?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div data-onboarding={dataOnboarding} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
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
