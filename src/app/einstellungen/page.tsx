"use client";

import { useEffect, useState } from "react";
import { getPushSubscriptionStatus, subscribeToPush } from "@/lib/push";
import { CHANGELOG } from "@/lib/changelog";
import { useContact, useStartOnboarding, useUpdateContact } from "@/components/IdentityGate";

// Gemeinsame Bausteine für eine Strava-artige, gruppierte Einstellungs-Ansicht:
// eine kleine graue Großbuchstaben-Überschrift pro Gruppe, darunter eine Karte
// mit durch dünne Linien getrennten Zeilen - statt vieler einzelner Karten.
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
      {children}
    </h2>
  );
}

function Section({ children, dataOnboarding }: { children: React.ReactNode; dataOnboarding?: string }) {
  return (
    <div
      data-onboarding={dataOnboarding}
      className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
    >
      {children}
    </div>
  );
}

function KontaktUndAlarmBereich() {
  const contact = useContact();
  const updateContact = useUpdateContact();
  const [toleranceInput, setToleranceInput] = useState(String(contact.tolerance_hours));
  const [formError, setFormError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<"idle" | "active" | "subscribing" | "error">("idle");
  const [myTurns, setMyTurns] = useState<("morning" | "evening")[]>([]);
  const [respondStatus, setRespondStatus] = useState<"idle" | "sending" | "sent">("idle");

  // Echten Browser-Abo-Status prüfen, statt nur den lokalen Zustand seit dem
  // letzten Klick anzuzeigen - sonst sieht man nach einem Neuladen nie, ob
  // Benachrichtigungen wirklich aktiv sind.
  useEffect(() => {
    getPushSubscriptionStatus().then((isActive) => {
      if (isActive) setPushStatus("active");
    });
  }, []);

  useEffect(() => {
    const contactId = contact.id;
    let cancelled = false;

    async function checkTurn() {
      try {
        const response = await fetch("/api/incidents/status");
        if (!response.ok) return;
        const { incidents } = await response.json();
        if (!cancelled) {
          setMyTurns(
            (incidents ?? [])
              .filter((i: { contactId: string; responded: boolean }) => i.contactId === contactId && !i.responded)
              .map((i: { type: "morning" | "evening" }) => i.type)
          );
        }
      } catch {
        // Status ist informativ, kein Blocker
      }
    }

    checkTurn();
    const intervalId = setInterval(checkTurn, 30_000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [contact]);

  async function handleSaveSettings() {
    const tolerance_hours = Number(toleranceInput);
    if (!tolerance_hours || tolerance_hours <= 0) {
      setFormError("Bitte eine gültige Stundenzahl eingeben.");
      return;
    }
    const response = await fetch("/api/contacts/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contact.id, tolerance_hours }),
    });
    if (response.ok) {
      updateContact({ ...contact, tolerance_hours });
      setFormError(null);
    } else {
      setFormError("Speichern hat nicht geklappt. Versuch es noch einmal.");
    }
  }

  async function handleSubscribe() {
    setPushStatus("subscribing");
    try {
      await subscribeToPush(contact.id);
      setPushStatus("active");
    } catch {
      setPushStatus("error");
    }
  }

  async function handleRespond(type: "morning" | "evening", response: "met_opa" | "could_not_reach") {
    setRespondStatus("sending");
    const res = await fetch("/api/incidents/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contact.id, type, response }),
    });
    if (res.ok) {
      setRespondStatus("sent");
      setMyTurns((prev) => prev.filter((t) => t !== type));
    } else {
      setRespondStatus("idle");
      setFormError("Rückmeldung hat nicht geklappt. Versuch es noch einmal.");
    }
  }

  const buttonClass = "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium";
  const inputClass = "rounded-xl border border-border bg-card p-2";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <SectionHeader>Profil</SectionHeader>
        <Section>
          <div className="flex items-center justify-between gap-4 p-4">
            <span className="text-sm font-medium">Angemeldet als</span>
            <span className="text-sm text-foreground-secondary">{contact.name}</span>
          </div>
        </Section>
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionHeader>Erinnerungszeit</SectionHeader>
        <Section>
          <div className="flex flex-col gap-2 p-4">
            <label className="text-sm text-foreground-secondary">
              Wie viele Stunden nach Sonnenuntergang willst du benachrichtigt werden, wenn Opa sich abends nicht
              gemeldet hat?
            </label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={toleranceInput}
              onChange={(e) => setToleranceInput(e.target.value)}
              className={inputClass}
            />
            {formError && <p className="text-sm text-error">{formError}</p>}
            <button onClick={handleSaveSettings} className={`${buttonClass} mt-1`}>
              Speichern
            </button>
          </div>
        </Section>
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionHeader>Benachrichtigungen</SectionHeader>
        <Section dataOnboarding="notifications">
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm font-medium">Push-Benachrichtigungen</div>
              <div className="text-xs text-foreground-secondary">
                Damit du benachrichtigt wirst, wenn Opa sich nicht meldet.
              </div>
            </div>
            {pushStatus === "active" ? (
              <span className="rounded-full bg-success-bg px-3 py-1 text-xs font-medium text-success-text">
                Aktiv
              </span>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={pushStatus === "subscribing"}
                className={`${buttonClass} shrink-0`}
              >
                {pushStatus === "subscribing"
                  ? "Wird aktiviert…"
                  : pushStatus === "error"
                  ? "Erneut versuchen"
                  : "Aktivieren"}
              </button>
            )}
          </div>
        </Section>
      </div>

      {myTurns.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionHeader>Rückmeldung ausstehend</SectionHeader>
          <div className="flex flex-col gap-3">
            {myTurns.map((type) => (
              <div key={type} className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-center">
                <p className="font-medium">
                  Opa hat sich {type === "morning" ? "heute Morgen" : "heute Abend"} noch nicht gemeldet. Bitte prüfen
                  und zurückmelden.
                </p>
                <button
                  onClick={() => handleRespond(type, "met_opa")}
                  disabled={respondStatus === "sending"}
                  className="rounded-full bg-success-text px-4 py-2 text-sm font-medium text-white"
                >
                  Ich habe ihn getroffen
                </button>
                <button
                  onClick={() => handleRespond(type, "could_not_reach")}
                  disabled={respondStatus === "sending"}
                  className={buttonClass}
                >
                  Ich konnte ihn nicht erreichen
                </button>
              </div>
            ))}
            {respondStatus === "sent" && <p className="text-sm text-success-text">Danke, Rückmeldung gespeichert.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

type PublicContact = { name: string; tolerance_hours: number };

function FamilieBereich() {
  const [contacts, setContacts] = useState<PublicContact[] | null>(null);

  useEffect(() => {
    fetch("/api/contacts/list")
      .then((response) => response.json())
      .then((data) => setContacts(data.contacts ?? []))
      .catch(() => setContacts([]));
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeader>Familie</SectionHeader>
      <Section>
        {contacts === null ? (
          <div className="p-4 text-sm text-foreground-secondary">Lade…</div>
        ) : contacts.length === 0 ? (
          <div className="p-4 text-sm text-foreground-secondary">Noch niemand angemeldet.</div>
        ) : (
          contacts.map((c, index) => (
            <div key={c.name + index} className="flex items-center justify-between gap-4 p-4">
              <span className="text-sm font-medium">{c.name}</span>
              <span className="text-sm text-foreground-secondary">{c.tolerance_hours}h nach Sonnenuntergang</span>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function SoFunktioniertsBereich() {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeader>So funktioniert's</SectionHeader>
      <Section>
        <p className="p-4 text-sm text-foreground-secondary">
          Opa drückt morgens beim Aufstehen und abends beim Abschließen auf seinen roten Knopf. Ein Druck vor 12 Uhr
          zählt als "Morgens", danach als "Abends".
        </p>
        <p className="p-4 text-sm text-foreground-secondary">
          Fehlt eine Meldung – morgens ab 11 Uhr, abends ab deiner eingestellten Zeit nach Sonnenuntergang –,
          benachrichtigen wir automatisch die Familie, beginnend mit der kürzesten eingestellten Zeit.
        </p>
        <p className="p-4 text-sm text-foreground-secondary">
          Reagiert niemand innerhalb von 60 Minuten, geht die Benachrichtigung automatisch an die nächste Person
          weiter.
        </p>
      </Section>
    </div>
  );
}

function ErsteSchritteUndVersionBereich() {
  const startOnboarding = useStartOnboarding();
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeader>Erste Schritte &amp; Version</SectionHeader>
      <Section>
        <button
          onClick={startOnboarding}
          className="flex items-center justify-between gap-4 p-4 text-left text-sm font-medium"
        >
          Erste Schritte erneut ansehen
          <span className="text-foreground-secondary">›</span>
        </button>
        <button
          onClick={() => setShowChangelog((v) => !v)}
          className="flex items-center justify-between gap-4 p-4 text-left text-sm font-medium"
        >
          Version {CHANGELOG[0].version}
          <span className="text-foreground-secondary">{showChangelog ? "︿" : "﹀"}</span>
        </button>
        {showChangelog && (
          <div className="flex flex-col gap-3 p-4 text-sm text-foreground-secondary">
            {CHANGELOG.map((entry) => (
              <div key={entry.version}>
                <div className="font-medium text-foreground">
                  {entry.version} · {entry.date}
                </div>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {entry.changes.map((change, i) => (
                    <li key={i}>• {change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export default function EinstellungenPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <KontaktUndAlarmBereich />
      <FamilieBereich />
      <SoFunktioniertsBereich />
      <ErsteSchritteUndVersionBereich />
    </main>
  );
}
