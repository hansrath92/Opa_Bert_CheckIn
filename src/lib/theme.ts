// Hell/Dunkel ist eine bewusste Entscheidung der Person, keine automatische
// Systemerkennung mehr - Standard ist IMMER Hell, bis jemand in den
// Einstellungen explizit Dunkel wählt. Umgesetzt über ein data-theme-Attribut
// auf <html>, das globals.css auswertet (siehe dort). Der blockierende
// Inline-Script in layout.tsx setzt dasselbe Attribut schon vor dem ersten
// Rendern, damit die Seite nicht kurz hell aufblitzt, bevor React lädt.
export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "opa-checkin-theme";

export function getStoredTheme(): ThemePreference {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage kann in privaten Fenstern o.ä. fehlschlagen - dann gilt
    // die Wahl nur für diese Sitzung, statt die App abstürzen zu lassen.
  }
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

// Exakt dieselbe Logik als String für den blockierenden Inline-Script in
// layout.tsx (kann dort kein Modul importieren, muss inline stehen).
export const THEME_INIT_SCRIPT = `
try {
  if (localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
} catch (e) {}
`;
