import { getBerlinDateKey } from "@/lib/press";

// Ungefährer Standort von Opa für die Sonnenuntergangs-Berechnung. Nur
// serverseitig verwendet (siehe unten), daher genügt eine normale Env-
// Variable ohne NEXT_PUBLIC_-Prefix - landet nicht im Client-Bundle.
export const OPA_LOCATION = {
  lat: Number(process.env.OPA_LAT),
  lng: Number(process.env.OPA_LNG),
};

export async function getSunsetTimeUTC(date: Date): Promise<Date> {
  // WICHTIG: Berlin-Kalenderdatum verwenden, nicht date.toISOString() (UTC) -
  // sonst holt diese Funktion zwischen 00:00 und 02:00 Uhr Berlin-Zeit (UTC-
  // Datum ist da noch der Vortag) den bereits vergangenen GESTRIGEN Sonnen-
  // untergang, wodurch die Automatik-Bedingung sofort nach Mitternacht fälsch-
  // licherweise als erfüllt gilt. Der Rest der App rechnet konsequent mit
  // Berlin-Datum (siehe getBerlinDateKey in press.ts) - hier war das nicht
  // der Fall.
  const dateParam = getBerlinDateKey(date);
  const url = `https://api.sunrise-sunset.org/json?lat=${OPA_LOCATION.lat}&lng=${OPA_LOCATION.lng}&date=${dateParam}&formatted=0`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Sunset-API antwortete mit Status ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "OK") {
    throw new Error(`Sunset-API-Fehler: ${data.status}`);
  }

  return new Date(data.results.sunset);
}
