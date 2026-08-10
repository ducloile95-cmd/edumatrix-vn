import { createContext } from "react";
import type { AppearancePreferences, Language, Theme } from "@/features/preferences/appearance";

export interface AppearanceContextValue extends AppearancePreferences {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);
