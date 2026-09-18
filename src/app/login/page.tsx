"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Eigene Login/Register-Seite, vorher Teil von "Einstellungen". Jetzt zentral
// hier, weil seit der Einführung des dashboard-weiten Logins jede Seite
// (nicht mehr nur Einstellungen) einen eingeloggten Kontakt voraussetzt -
// middleware.ts schickt nicht angemeldete Besucher hierher.
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [toleranceInput, setToleranceInput] = useState("2");
  const [formError, setFormError] = useState<string | null>(null);

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
    router.push("/");
    router.refresh();
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
    router.push("/");
    router.refresh();
  }

  const inputClass = "rounded-xl border border-border bg-card p-2";
  const buttonClass = "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium";

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-6">
      <h1 className="text-2xl font-semibold">Anmelden</h1>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
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
    </main>
  );
}
