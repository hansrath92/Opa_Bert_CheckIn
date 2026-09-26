"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import TabBar from "./TabBar";
import AppPopups from "./AppPopups";
import OnboardingTour from "./OnboardingTour";

export type Contact = { id: string; name: string; tolerance_hours: number };
type PublicContact = { id: string; name: string; tolerance_hours: number };

const STORAGE_KEY = "opa-checkin-contact";

type ContactContextValue = {
  contact: Contact;
  updateContact: (c: Contact) => void;
  startOnboarding: () => void;
  logout: () => void;
};
const ContactContext = createContext<ContactContextValue | null>(null);

// Von Seiten genutzt, die wissen müssen, wer gerade "eingeloggt" ist
// (z.B. für contact_id in einem API-Aufruf). Wirft, wenn außerhalb von
// IdentityGate genutzt, da es dort garantiert einen Kontakt gibt.
export function useContact(): Contact {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error("useContact() muss innerhalb von IdentityGate genutzt werden");
  return ctx.contact;
}

// Für Seiten, die nach einer Änderung (z.B. neue Toleranz-Stunden) den
// lokal gemerkten Kontakt aktuell halten wollen (State + localStorage).
export function useUpdateContact(): (c: Contact) => void {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error("useUpdateContact() muss innerhalb von IdentityGate genutzt werden");
  return ctx.updateContact;
}

// Startet den Erste-Schritte-Rundgang manuell erneut (z.B. Button in Einstellungen).
export function useStartOnboarding(): () => void {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error("useStartOnboarding() muss innerhalb von IdentityGate genutzt werden");
  return ctx.startOnboarding;
}

// Meldet den aktuellen Kontakt ab (localStorage löschen, zurück zur
// Namensauswahl) - z.B. Button in Einstellungen.
export function useLogout(): () => void {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error("useLogout() muss innerhalb von IdentityGate genutzt werden");
  return ctx.logout;
}

type Stage = "loading" | "chooser" | "pick" | "pin" | "join" | "ready";

const inputClass = "rounded-xl border border-border bg-card p-2";
const buttonClass = "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium";

export default function IdentityGate({ children }: { children: React.ReactNode }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [publicContacts, setPublicContacts] = useState<PublicContact[] | null>(null);
  const [selected, setSelected] = useState<PublicContact | null>(null);
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [toleranceInput, setToleranceInput] = useState("2");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingActive, setOnboardingActive] = useState(false);
  // Merkt sich, ob der Rundgang in dieser Sitzung schon lief - AppPopups zeigt
  // dann nicht direkt danach noch die Benachrichtigungs-Erinnerung.
  const [onboardingSeen, setOnboardingSeen] = useState(false);

  function startOnboarding() {
    setOnboardingActive(true);
    setOnboardingSeen(true);
  }

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setContact(JSON.parse(stored));
      setStage("ready");
    } else {
      setStage("chooser");
    }
  }, []);

  // Einmal pro App-Aufruf ein benanntes Event senden, damit im Vercel-
  // Dashboard sichtbar ist, wer (Name) die App wann genutzt hat - kombiniert
  // mit den automatischen Pageview-Daten (Zeit, Land) von <Analytics />.
  useEffect(() => {
    if (stage === "ready" && contact) {
      track("besuch", { name: contact.name });
    }
    // Nur bei Stage-Wechsel bzw. Kontakt-Wechsel (Login/Wechsel), nicht bei
    // jeder Detail-Änderung (z.B. Toleranz-Stunden speichern) erneut senden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, contact?.id]);

  function saveContact(c: Contact) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setContact(c);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setContact(null);
    setPin("");
    setFormError(null);
    setStage("chooser");
  }

  async function safeJson(response: Response): Promise<{ error?: string; contact?: Contact }> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function openPicker() {
    setFormError(null);
    setStage("pick");
    try {
      const response = await fetch("/api/contacts/list");
      const data = await response.json();
      setPublicContacts(data.contacts ?? []);
    } catch {
      setFormError("Liste konnte nicht geladen werden");
      setPublicContacts([]);
    }
  }

  function pickContact(c: PublicContact) {
    setSelected(c);
    setPin("");
    setFormError(null);
    setStage("pin");
  }

  async function confirmPin() {
    if (!selected) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contacts/confirm-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: selected.id, pin }),
      });
      const data = await safeJson(response);
      if (!response.ok || !data.contact) {
        setFormError(data.error ?? "PIN stimmt nicht");
        return;
      }
      saveContact(data.contact);
      setStage("ready");
    } catch {
      setFormError("Verbindung fehlgeschlagen, bitte erneut versuchen");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function join() {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contacts/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin, tolerance_hours: Number(toleranceInput) || 2 }),
      });
      const data = await safeJson(response);
      if (!response.ok || !data.contact) {
        setFormError(data.error ?? "Beitreten fehlgeschlagen");
        return;
      }
      saveContact(data.contact);
      setStage("ready");
      // Ganz neue Person -> Rundgang zeigen, sobald die Seite steht.
      startOnboarding();
    } catch {
      setFormError("Verbindung fehlgeschlagen, bitte erneut versuchen");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage === "loading") return null;

  if (stage === "ready" && contact) {
    return (
      <ContactContext.Provider
        value={{ contact, updateContact: saveContact, startOnboarding, logout }}
      >
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
        <TabBar />
        <AppPopups onboardingActive={onboardingActive} onboardingSeen={onboardingSeen} />
        {onboardingActive && <OnboardingTour onClose={() => setOnboardingActive(false)} />}
      </ContactContext.Provider>
    );
  }

  return (
    <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-6">
      <h1 className="mb-2 text-2xl font-semibold">Opa-Checkin</h1>

      {stage === "chooser" && (
        <div className="flex flex-col gap-3">
          <button onClick={openPicker} className={`${buttonClass} py-3`}>
            Ich bin schon dabei
          </button>
          <button
            onClick={() => {
              setFormError(null);
              setStage("join");
            }}
            className={`${buttonClass} py-3`}
          >
            Ich bin neu
          </button>
        </div>
      )}

      {stage === "pick" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Wer bist du?</h2>
          {publicContacts === null ? (
            <p className="text-sm text-foreground-secondary">Lade…</p>
          ) : publicContacts.length === 0 ? (
            <p className="text-sm text-foreground-secondary">Noch niemand angemeldet</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {publicContacts.map((c) => (
                <li key={c.id}>
                  <button onClick={() => pickContact(c)} className={`${buttonClass} w-full py-3 text-left`}>
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setStage("chooser")} className="self-start text-sm text-foreground-secondary">
            Zurück
          </button>
        </div>
      )}

      {stage === "pin" && selected && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Hallo, {selected.name}</h2>
          <p className="text-sm text-foreground-secondary">
            Gib zur Bestätigung deine 4-stellige PIN ein.
          </p>
          <input
            placeholder="4-stellige PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className={inputClass}
          />
          {formError && <p className="text-sm text-error">{formError}</p>}
          <button onClick={confirmPin} disabled={isSubmitting} className={`${buttonClass} py-3`}>
            {isSubmitting ? "Wird geprüft…" : "Bestätigen"}
          </button>
          <button onClick={() => setStage("chooser")} className="self-start text-sm text-foreground-secondary">
            Zurück
          </button>
        </div>
      )}

      {stage === "join" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Neu beitreten</h2>
          <input placeholder="Dein Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          <input
            placeholder="4-stellige PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className={inputClass}
          />
          <label className="flex flex-col gap-1 text-sm text-foreground-secondary">
            Nach wie vielen Stunden nach Sonnenuntergang willst du benachrichtigt werden?
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={toleranceInput}
              onChange={(e) => setToleranceInput(e.target.value)}
              className={inputClass}
            />
          </label>
          {formError && <p className="text-sm text-error">{formError}</p>}
          <button onClick={join} disabled={isSubmitting} className={`${buttonClass} py-3`}>
            {isSubmitting ? "Wird angelegt…" : "Beitreten"}
          </button>
          <button onClick={() => setStage("chooser")} className="self-start text-sm text-foreground-secondary">
            Zurück
          </button>
        </div>
      )}
    </main>
  );
}
