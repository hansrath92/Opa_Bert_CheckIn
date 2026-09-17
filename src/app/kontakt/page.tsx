"use client";

import { useEffect, useState } from "react";
import { subscribeToPush } from "@/lib/push";

type StoredContact = { id: string; name: string; tolerance_hours: number };

const STORAGE_KEY = "opa-checkin-contact";

export default function KontaktPage() {
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

  if (!contact) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-2xl font-semibold">Kontakt-Bereich</h1>

        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setMode("login")}
            className={mode === "login" ? "font-semibold underline" : ""}
          >
            Ich habe schon eine PIN
          </button>
          <span>·</span>
          <button
            onClick={() => setMode("register")}
            className={mode === "register" ? "font-semibold underline" : ""}
          >
            Ich bin neu
          </button>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          {mode === "register" && (
            <input
              placeholder="Dein Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-black/10 p-2 dark:border-white/15"
            />
          )}
          <input
            placeholder="4-stellige PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded-lg border border-black/10 p-2 dark:border-white/15"
          />
          {mode === "register" && (
            <label className="flex flex-col gap-1 text-sm text-status-pending">
              Nach wie vielen Stunden nach Sonnenuntergang willst du benachrichtigt werden?
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={toleranceInput}
                onChange={(e) => setToleranceInput(e.target.value)}
                className="rounded-lg border border-black/10 p-2 dark:border-white/15"
              />
            </label>
          )}

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <button
            onClick={mode === "login" ? handleLogin : handleRegister}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/15"
          >
            {mode === "login" ? "Anmelden" : "Registrieren"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Hallo, {contact.name}</h1>

      {myTurns.map((type) => (
        <div
          key={type}
          className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center"
        >
          <p className="font-medium">
            Opa hat sich {type === "morning" ? "heute Morgen" : "heute Abend"} noch nicht gemeldet.
            Bitte prüfen und zurückmelden.
          </p>
          <button
            onClick={() => handleRespond(type, "met_opa")}
            disabled={respondStatus === "sending"}
            className="rounded-full bg-status-done px-4 py-2 text-sm font-medium text-white"
          >
            Ich habe ihn getroffen
          </button>
          <button
            onClick={() => handleRespond(type, "could_not_reach")}
            disabled={respondStatus === "sending"}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/15"
          >
            Ich konnte ihn nicht erreichen
          </button>
        </div>
      ))}
      {respondStatus === "sent" && (
        <p className="text-sm text-status-done">✓ Danke, Rückmeldung gespeichert</p>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-status-pending">
          Benachrichtigen nach X Stunden nach Sonnenuntergang
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={toleranceInput}
            onChange={(e) => setToleranceInput(e.target.value)}
            className="rounded-lg border border-black/10 p-2 dark:border-white/15"
          />
        </label>
        {formError && <p className="text-sm text-red-500">{formError}</p>}
        <button
          onClick={handleSaveSettings}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/15"
        >
          Speichern
        </button>

        {pushStatus === "subscribed" ? (
          <p className="text-sm text-status-done">✓ Benachrichtigungen aktiviert</p>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={pushStatus === "subscribing"}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/15"
          >
            {pushStatus === "subscribing"
              ? "Wird aktiviert…"
              : pushStatus === "error"
              ? "Fehlgeschlagen — erneut versuchen"
              : "Benachrichtigungen aktivieren"}
          </button>
        )}
      </div>
    </main>
  );
}
