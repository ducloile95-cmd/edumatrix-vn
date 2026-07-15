import { useEffect, useRef, useState } from "react";
import { Bell, CloudSun, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, query, where, type Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { ROUTES } from "@/constants/routes";
import { findPageDescription, findPageTitle } from "@/constants/navigation";

const WEATHER_KEY = "edumatrix-weather-hanoi";
type WeatherData = { temperature: number; code: number; cachedAt: number };

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return now;
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    try { const value = JSON.parse(localStorage.getItem(WEATHER_KEY) ?? "null") as WeatherData | null; return value && Date.now() - value.cachedAt < 1_800_000 ? value : null; } catch { return null; }
  });
  useEffect(() => {
    if (weather) return;
    const controller = new AbortController();
    fetch("https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code&timezone=Asia%2FBangkok", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("weather")))
      .then((data: { current: { temperature_2m: number; weather_code: number } }) => {
        const next = { temperature: Math.round(data.current.temperature_2m), code: data.current.weather_code, cachedAt: Date.now() };
        localStorage.setItem(WEATHER_KEY, JSON.stringify(next)); setWeather(next);
      }).catch(() => undefined);
    return () => controller.abort();
  }, [weather]);
  return weather;
}

type Notification = { id: string; title: string; time: string };
type AnnouncementDoc = { title?: string; message?: string; createdAt?: Timestamp; studentId?: string };

/**
 * Chuyen chuong (bell) doc du lieu that tu ANNOUNCEMENTS cho Phu huynh/Hoc sinh (co studentIds,
 * cung nguon voi ViewerAnnouncementsPage). Staff (Admin/Giao vien) chua co field nguoi nhan tren
 * announcements (attendance_alert/homework_reminder/schedule_change deu gan theo hoc sinh, khong
 * gan theo giao vien) nen tam giu rong cho Staff thay vi doan logic - "Can xu ly" o Tong quan da
 * phu vai tro nay cho Staff. ponytail: chua co model read-tracking nen coi tat ca la "chua doc".
 */
function useNotifications(): Notification[] {
  const { userDoc } = useAuth();
  const studentIds = userDoc?.studentIds ?? [];

  const { data } = useQuery({
    queryKey: ["topbar-notifications", studentIds],
    queryFn: async () => {
      const groups = await Promise.all(
        studentIds.map(async (studentId) => {
          const snap = await getDocs(
            query(collection(db, COLLECTIONS.ANNOUNCEMENTS), where("studentId", "==", studentId), limit(10)),
          );
          return snap.docs.map((item) => ({ id: item.id, ...(item.data() as AnnouncementDoc) }));
        }),
      );
      return groups
        .flat()
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        .slice(0, 8);
    },
    enabled: studentIds.length > 0,
  });

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title ?? "Thông báo",
    time: item.createdAt ? format(item.createdAt.toDate(), "dd/MM HH:mm") : "",
  }));
}

function NotificationBell({ seeAllHref }: { seeAllHref: string }) {
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const unread = notifications.length;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="icon-button relative flex">
        <Bell size={20} />
        {unread > 0 && <span aria-live="polite" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[var(--shadow-3)]">
          <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3"><b className="text-sm">Thông báo</b></header>
          {notifications.length === 0
            ? <div className="px-4 py-8 text-center text-sm text-neutral-500">Chưa có thông báo mới</div>
            : <ul className="max-h-80 overflow-y-auto">{notifications.map((item) => <li key={item.id} className="border-b border-neutral-100 px-4 py-3 last:border-0"><p className="text-sm font-medium text-neutral-900">{item.title}</p><p className="text-xs text-neutral-400">{item.time}</p></li>)}</ul>}
          <footer className="border-t border-neutral-200 p-2 text-center"><Link to={seeAllHref} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-neutral-50">Xem tất cả thông báo</Link></footer>
        </div>
      )}
    </div>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { isStaff } = useAuth();
  const now = useClock();
  const weather = useWeather();
  const { pathname } = useLocation();
  const title = findPageTitle(pathname);
  const description = findPageDescription(pathname);
  const seeAllHref = isStaff ? ROUTES.STAFF_ANNOUNCEMENTS : ROUTES.VIEWER_ANNOUNCEMENTS;

  return <header className="glass-panel sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/70 px-4 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      {onMenuClick && <button type="button" onClick={onMenuClick} aria-label="Mở menu điều hướng" className="icon-button lg:hidden"><Menu size={20} /></button>}
      <div className="min-w-0"><h1 className="truncate text-lg font-semibold text-neutral-900">{title}</h1><p className="hidden max-w-[78ch] truncate text-xs text-neutral-500 sm:block">{description}</p></div>
    </div>
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden text-right md:block"><p className="text-sm font-semibold tabular-nums text-neutral-800">{now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p><p className="text-[11px] text-neutral-500">{now.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}</p></div>
      <div className="flex min-h-touch items-center gap-2 rounded-xl bg-white/60 px-2.5 text-sm text-neutral-700"><CloudSun size={18} className="text-primary-600" /><span className="tabular-nums">{weather ? `${weather.temperature}°C` : "--°"}</span><span className="hidden text-xs text-neutral-500 xl:inline">Hà Nội</span></div>
      <NotificationBell seeAllHref={seeAllHref} />
    </div>
  </header>;
}
