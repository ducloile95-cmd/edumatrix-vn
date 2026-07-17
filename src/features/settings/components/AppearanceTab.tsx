import { useState } from "react";

type Theme = "light" | "dark" | "system";
type Language = "vi" | "en";
interface AppearancePrefs {
  theme: Theme;
  language: Language;
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
  { value: "system", label: "Theo hệ thống" },
];

const STORAGE_KEY = "edumatrix-appearance-prefs";
const DEFAULT_PREFS: AppearancePrefs = { theme: "light", language: "vi" };

function loadPrefs(): AppearancePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AppearancePrefs>) };
  } catch {
    // localStorage khong kha dung (private mode, quota...) - dung mac dinh.
  }
  return DEFAULT_PREFS;
}

/**
 * Tab "Giao diện" - chi luu tren trinh duyet (localStorage), CHUA co dark mode
 * / i18n thuc su ap dung toan app (khong co ha tang theme-provider / i18n
 * hien tai). Ghi ro trong UI de khong "demo gia" chuc nang chua lam that.
 */
export function AppearanceTab() {
  const [prefs, setPrefs] = useState<AppearancePrefs>(loadPrefs);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function save(next: AppearancePrefs) {
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedAt(Date.now());
  }

  return (
    <div>
      <p className="mb-4 rounded-input border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-700">
        Lựa chọn được lưu trên trình duyệt này, nhưng chưa áp dụng lên toàn bộ giao diện. Giao diện tối và tiếng Anh sẽ có ở bản sau.
      </p>

      <div className="mb-5">
        <p className="mb-2 text-sm font-medium text-neutral-700">Giao diện</p>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={prefs.theme === opt.value}
              onClick={() => save({ ...prefs, theme: opt.value })}
              className={`rounded-card border px-3 py-3 text-center text-sm font-medium transition ${
                prefs.theme === opt.value
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xs">
        <label className="mb-2 block text-sm font-medium text-neutral-700" htmlFor="settings-language">
          Ngôn ngữ
        </label>
        <select
          id="settings-language"
          value={prefs.language}
          onChange={(e) => save({ ...prefs, language: e.target.value as Language })}
          className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm"
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </div>

      {savedAt && <p className="mt-3 text-xs text-success-700">Đã lưu lựa chọn.</p>}
    </div>
  );
}
