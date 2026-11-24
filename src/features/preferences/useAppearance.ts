import { useContext } from "react";
import { AppearanceContext, type AppearanceContextValue } from "@/features/preferences/appearanceContextBase";

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used inside AppearanceProvider");
  return context;
}
