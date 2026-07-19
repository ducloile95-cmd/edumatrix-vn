export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const APPEARANCE_STORAGE_KEY = "edumatrix-appearance-prefs";
const DEFAULT_THEME: ThemePreference = "system";

export function parseStoredTheme(raw: string | null): ThemePreference {
  if (!raw) return DEFAULT_THEME;
  try {
    const theme = (JSON.parse(raw) as { theme?: unknown }).theme;
    return theme === "light" || theme === "dark" || theme === "system" ? theme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function resolveTheme(theme: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

export function loadTheme(): ThemePreference {
  try {
    return parseStoredTheme(localStorage.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemePreference): void {
  const resolved = resolveTheme(theme, window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0F172A" : "#3366F0");
}

export function saveTheme(theme: ThemePreference): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ theme }));
  } catch {
    // Theme van ap dung trong phien hien tai neu localStorage khong kha dung.
  }
  applyTheme(theme);
}

export function initializeAppearance(): void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme(loadTheme());
  media.addEventListener("change", () => {
    if (loadTheme() === "system") applyTheme("system");
  });
  window.addEventListener("storage", (event) => {
    if (event.key === APPEARANCE_STORAGE_KEY) applyTheme(parseStoredTheme(event.newValue));
  });
}
