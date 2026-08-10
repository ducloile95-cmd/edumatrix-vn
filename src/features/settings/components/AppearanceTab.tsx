import { LanguageSegmentedControl, ThemeSegmentedControl } from "@/features/preferences/components/AppearanceControls";
import { useAppearance } from "@/features/preferences/useAppearance";

export function AppearanceTab() {
  const { language } = useAppearance();
  const vi = language === "vi";

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4 shadow-[var(--shadow-1)]" aria-label={vi ? "Lựa chọn giao diện" : "Theme selection"}>
        <ThemeSegmentedControl />
        <p className="mt-2 text-xs leading-5 text-neutral-500">{vi ? "Chế độ Sáng hoặc Tối được áp dụng ngay trên toàn bộ hệ thống." : "Light or Dark mode applies immediately across the entire system."}</p>
      </section>

      <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4 shadow-[var(--shadow-1)]" aria-label={vi ? "Lựa chọn ngôn ngữ" : "Language selection"}>
        <LanguageSegmentedControl />
        <p className="mt-2 text-xs leading-5 text-neutral-500">{vi ? "Ngôn ngữ được đồng bộ cho màn hình đăng nhập và cả ba vai trò." : "Language is synchronized for sign-in and all three roles."}</p>
      </section>
    </div>
  );
}
