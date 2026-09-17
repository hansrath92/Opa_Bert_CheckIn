// Ungefährer Standort von Opa (München) für die Sonnenuntergangs-Berechnung
export const OPA_LOCATION = { lat: 48.1351, lng: 11.582 };

export async function getSunsetTimeUTC(date: Date): Promise<Date> {
  const dateParam = date.toISOString().slice(0, 10); // YYYY-MM-DD
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
