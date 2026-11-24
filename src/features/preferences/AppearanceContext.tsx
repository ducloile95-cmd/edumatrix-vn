import { useMemo, useState, type ReactNode } from "react";
import {
  applyAppearancePreferences,
  loadAppearancePreferences,
  persistAppearancePreferences,
  type AppearancePreferences,
} from "@/features/preferences/appearance";
import { DocumentTranslationBridge } from "@/features/preferences/DocumentTranslationBridge";
import { AppearanceContext, type AppearanceContextValue } from "@/features/preferences/appearanceContextBase";

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(loadAppearancePreferences);

  const value = useMemo<AppearanceContextValue>(() => {
    const update = (next: AppearancePreferences) => {
      applyAppearancePreferences(next);
      persistAppearancePreferences(next);
      setPreferences(next);
    };

    return {
      ...preferences,
      setTheme: (theme) => update({ ...preferences, theme }),
      setLanguage: (language) => update({ ...preferences, language }),
    };
  }, [preferences]);

  return <AppearanceContext.Provider value={value}><DocumentTranslationBridge language={preferences.language} />{children}</AppearanceContext.Provider>;
}
