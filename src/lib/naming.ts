// Zentrale Beschriftung für die zwei täglichen Drücke. Intern (Datenbank,
// API) heißen sie weiterhin "morning"/"evening" - nur die Anzeige im UI
// nutzt die freundlicheren Namen "Guten Morgen"/"Gute Nacht" (Redesign v2,
// ersetzt die frühere technische Beschriftung "aufgestanden"/"Tür zu" bzw.
// "Morgens"/"Abends" - siehe Opa-checkin.md Abschnitt 6).
export const PRESS_LABEL: Record<"morning" | "evening", string> = {
  morning: "Guten Morgen",
  evening: "Gute Nacht",
};
