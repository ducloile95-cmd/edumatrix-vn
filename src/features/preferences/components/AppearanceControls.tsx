import { Moon, Sun } from "lucide-react";
import { SegmentedPreference } from "@/features/preferences/components/SegmentedPreference";
import { useAppearance } from "@/features/preferences/useAppearance";

export function ThemeSegmentedControl({ compact = false, showLabel = true }: { compact?: boolean; showLabel?: boolean }) {
  const { language, theme, setTheme } = useAppearance();
  return (
    <SegmentedPreference
      label={language === "vi" ? "Giao diện" : "Theme"}
      value={theme}
      onChange={setTheme}
      compact={compact}
      showLabel={showLabel}
      options={[
        { value: "light", label: "", ariaLabel: language === "vi" ? "Sáng" : "Light", visual: <Sun size={compact ? 14 : 16} aria-hidden />, activeClassName: "text-warning-500" },
        { value: "dark", label: "", ariaLabel: language === "vi" ? "Tối" : "Dark", visual: <Moon size={compact ? 14 : 16} aria-hidden />, activeClassName: "text-lime-500" },
      ]}
    />
  );
}

export function LanguageSegmentedControl({ compact = false, showLabel = true }: { compact?: boolean; showLabel?: boolean }) {
  const { language, setLanguage } = useAppearance();
  return (
    <SegmentedPreference
      label={language === "vi" ? "Ngôn ngữ" : "Language"}
      value={language}
      onChange={setLanguage}
      compact={compact}
      showLabel={showLabel}
      options={[
        { value: "vi", label: "VN", visual: null },
        { value: "en", label: "EN", visual: null },
      ]}
    />
  );
}
