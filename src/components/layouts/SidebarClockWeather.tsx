import { useEffect, useState } from "react";
import { CloudSun } from "lucide-react";

const WEATHER_KEY = "edumatrix-weather-hanoi";
type WeatherData = { temperature: number; code: number; cachedAt: number };

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(WEATHER_KEY) ?? "null") as WeatherData | null;
      return value && Date.now() - value.cachedAt < 1_800_000 ? value : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (weather) return;
    const controller = new AbortController();
    fetch("https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code&timezone=Asia%2FBangkok", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("weather"))))
      .then((data: { current: { temperature_2m: number; weather_code: number } }) => {
        const next = { temperature: Math.round(data.current.temperature_2m), code: data.current.weather_code, cachedAt: Date.now() };
        localStorage.setItem(WEATHER_KEY, JSON.stringify(next));
        setWeather(next);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [weather]);
  return weather;
}

/**
 * Widget giờ + thời tiết Hà Nội - đặt cố định phía dưới Sidebar, ngay trên khối tài khoản.
 * Dùng chung cho cả 3 role (Admin/Giáo viên/Phụ huynh-Học sinh) vì Sidebar dùng chung qua AppShell.
 * Ẩn khi Sidebar thu gọn (collapsed, 76px) do không đủ chỗ hiển thị; luôn hiện trên drawer mobile.
 */
export function SidebarClockWeather({ collapsed }: { collapsed: boolean }) {
  const now = useClock();
  const weather = useWeather();

  return (
    <div
      className={`flex items-center justify-between gap-2 border-t border-neutral-100 px-3 py-2.5 transition-opacity ${
        collapsed ? "lg:pointer-events-none lg:hidden lg:opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: "var(--motion-duration)" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold tabular-nums text-neutral-800">
          {now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="truncate text-2xs text-neutral-500">
          {now.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 rounded-card bg-neutral-100 px-2.5 py-1.5 text-sm text-neutral-700">
        <CloudSun size={16} className="text-primary-600" />
        <span className="tabular-nums">{weather ? `${weather.temperature}°C` : "--°"}</span>
      </div>
    </div>
  );
}
