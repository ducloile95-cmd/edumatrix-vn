export type Theme = "light" | "dark";
export type Language = "vi" | "en";

export interface AppearancePreferences {
  theme: Theme;
  language: Language;
}

export const APPEARANCE_STORAGE_KEY = "edumatrix-appearance-prefs";
export const DEFAULT_APPEARANCE: AppearancePreferences = { theme: "light", language: "vi" };

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function isLanguage(value: unknown): value is Language {
  return value === "vi" || value === "en";
}

export function loadAppearancePreferences(): AppearancePreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "null") as Partial<AppearancePreferences> | null;
    return {
      theme: isTheme(stored?.theme) ? stored.theme : DEFAULT_APPEARANCE.theme,
      language: isLanguage(stored?.language) ? stored.language : DEFAULT_APPEARANCE.language,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function applyAppearancePreferences(preferences: AppearancePreferences): void {
  const root = document.documentElement;
  root.classList.toggle("dark", preferences.theme === "dark");
  root.dataset.theme = preferences.theme;
  root.lang = preferences.language;
  root.style.colorScheme = preferences.theme;
}

export function persistAppearancePreferences(preferences: AppearancePreferences): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences still apply for the current session when storage is unavailable.
  }
}
