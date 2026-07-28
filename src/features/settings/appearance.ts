export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

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
