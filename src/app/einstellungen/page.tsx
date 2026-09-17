"use client";

import { useEffect, useState } from "react";
import { subscribeToPush } from "@/lib/push";
import { CURRENT_VERSION } from "@/lib/changelog";

type StoredContact = { id: string; name: string; tolerance_hours: number };

const STORAGE_KEY = "opa-checkin-contact";

function KontaktBereich() {
  const [contact, setContact] = useState<StoredContact | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [toleranceInput, setToleranceInput] = useState("2");
  const [formError, setFormError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<
    "idle" | "subscribing" | "subscribed" | "error"
  >("idle");
  const [myTurns, setMyTurns] = useState<("morning" | "evening")[]>([]);
  const [respondStatus, setRespondStatus] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredContact;
      setContact(parsed);
      setToleranceInput(String(parsed.tolerance_hours));
    }
  }, []);

  useEffect(() => {
    if (!contact) return;
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

  function saveContact(newContact: StoredContact) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContact));
    setContact(newContact);
    setToleranceInput(String(newContact.tolerance_hours));
  }

  async function handleLogin() {
    setFormError(null);
    const response = await fetch("/api/contacts/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await response.json();
    if (!response.ok) {
      setFormError(data.error ?? "Anmeldung fehlgeschlagen");
      return;
    }
    saveContact(data.contact);
  }

  async function handleRegister() {
    setFormError(null);
    const response = await fetch("/api/contacts/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        pin,
        tolerance_hours: Number(toleranceInput) || 2,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setFormError(data.error ?? "Registrierung fehlgeschlagen");
      return;
    }
    saveContact(data.contact);
  }

  async function handleSaveSettings() {
    if (!contact) return;
    const tolerance_hours = Number(toleranceInput);
    if (!tolerance_hours || tolerance_hours <= 0) {
      setFormError("Bitte eine gültige Stundenzahl eingeben");
      return;
    }
    const response = await fetch("/api/contacts/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contact.id, tolerance_hours }),
    });
    if (response.ok) {
      saveContact({ ...contact, tolerance_hours });
      setFormError(null);
    } else {
      setFormError("Speichern fehlgeschlagen");
    }
  }

  async function handleSubscribe() {
    if (!contact) return;
    setPushStatus("subscribing");
    try {
      await subscribeToPush(contact.id);
      setPushStatus("subscribed");
    } catch {
      setPushStatus("error");
    }
  }

  async function handleRespond(type: "morning" | "evening", response: "met_opa" | "could_not_reach") {
    if (!contact) return;
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
      setFormError("Rückmeldung fehlgeschlagen, bitte erneut versuchen");
    }
  }

  const inputClass = "rounded-xl border border-border bg-card p-2";
  const buttonClass = "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium";

  if (!contact) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Ich bin ein Kontakt</h2>

        <div className="flex gap-2 text-sm">
          <button onClick={() => setMode("login")} className={mode === "login" ? "font-semibold text-accent" : "text-foreground-secondary"}>
            Ich habe schon eine PIN
          </button>
          <span className="text-foreground-secondary">·</span>
          <button onClick={() => setMode("register")} className={mode === "register" ? "font-semibold text-accent" : "text-foreground-secondary"}>
            Ich bin neu
          </button>
        </div>

        {mode === "register" && (
          <input placeholder="Dein Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        )}
        <input
          placeholder="4-stellige PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className={inputClass}
        />
        {mode === "register" && (
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
        )}

        {formError && <p className="text-sm text-error">{formError}</p>}

        <button onClick={mode === "login" ? handleLogin : handleRegister} className={buttonClass}>
          {mode === "login" ? "Anmelden" : "Registrieren"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Hallo, {contact.name}</h2>

        <label className="flex flex-col gap-1 text-sm text-foreground-secondary">
          Benachrichtigen nach X Stunden nach Sonnenuntergang
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={toleranceInput}
            onChange={(e) => setToleranceInput(e.target.value)}
            className={inputClass}
          />
        </label>
        {formError && <p className="mt-2 text-sm text-error">{formError}</p>}
        <button onClick={handleSaveSettings} className={`${buttonClass} mt-3 w-full`}>
          Speichern
        </button>

        {pushStatus === "subscribed" ? (
          <p className="mt-3 text-sm text-success-text">✓ Benachrichtigungen aktiviert</p>
        ) : (
          <button onClick={handleSubscribe} disabled={pushStatus === "subscribing"} className={`${buttonClass} mt-3 w-full`}>
            {pushStatus === "subscribing"
              ? "Wird aktiviert…"
              : pushStatus === "error"
              ? "Fehlgeschlagen — erneut versuchen"
              : "Benachrichtigungen aktivieren"}
          </button>
        )}
      </div>

      {myTurns.map((type) => (
        <div key={type} className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-center">
          <p className="font-medium">
            Opa hat sich {type === "morning" ? "heute Morgen" : "heute Abend"} noch nicht gemeldet.
            Bitte prüfen und zurückmelden.
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
      {respondStatus === "sent" && <p className="text-sm text-success-text">✓ Danke, Rückmeldung gespeichert</p>}
    </div>
  );
}

type PublicContact = { name: string; tolerance_hours: number };

function KontaktlisteBereich() {
  const [contacts, setContacts] = useState<PublicContact[] | null>(null);

  useEffect(() => {
    fetch("/api/contacts/list")
      .then((response) => response.json())
      .then((data) => setContacts(data.contacts ?? []))
      .catch(() => setContacts([]));
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Angemeldete Kontakte</h2>
      {contacts === null ? (
        <p className="text-sm text-foreground-secondary">Lade…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-foreground-secondary">Noch niemand angemeldet</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {contacts.map((contact, index) => (
            <li key={contact.name + index} className="flex items-center justify-between">
              <span>
                {index + 1}. {contact.name}
              </span>
              <span className="text-foreground-secondary">{contact.tolerance_hours}h nach Sonnenuntergang</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HilfeBereich() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-sm text-foreground-secondary">
      <h2 className="text-lg font-semibold text-foreground">Hilfe</h2>
      <p>
        Opa drückt morgens beim Aufstehen und abends beim Zuschließen der Haustür auf den roten Knopf.
        Ein Druck vor 12 Uhr zählt als "Morgens", danach als "Abends".
      </p>
      <p>
        Meldet er sich morgens nicht bis 11 Uhr oder abends nicht innerhalb der eingestellten Zeit nach
        Sonnenuntergang, wird nacheinander die Kontaktliste benachrichtigt (kürzeste eingestellte Zeit zuerst).
      </p>
      <p>
        Reagiert der aktuell kontaktierte Kontakt nicht innerhalb von 60 Minuten oder meldet "konnte ihn nicht
        erreichen", geht die Benachrichtigung automatisch an den/die nächste Person.
      </p>
      <p className="pt-2 text-xs">Version {CURRENT_VERSION}</p>
    </div>
  );
}

export default function EinstellungenPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-6">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <KontaktBereich />
      <KontaktlisteBereich />
      <HilfeBereich />
    </main>
  );
}
