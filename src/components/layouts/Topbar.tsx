import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Menu, MessagesSquare, Plus, RefreshCw } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listAnnouncementsByStudents } from "@/services/firestore/announcements";
import { subscribeChatThreads } from "@/services/firestore/chat";
import { ROUTES } from "@/constants/routes";
import { findPageDescription, findPageTitle } from "@/constants/navigation";
import { playNotificationSound, unlockNotificationSound } from "@/utils/notificationSound";

type Notification = { id: string; title: string; time: string };

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
    queryFn: () => listAnnouncementsByStudents(studentIds, 10),
    enabled: studentIds.length > 0,
    refetchInterval: 15_000,
  });

  return (data ?? []).slice(0, 8).map((item) => ({
    id: item.id,
    title: item.title || "Thông báo",
    time: item.createdAt ? format(item.createdAt.toDate(), "dd/MM HH:mm") : "",
  }));
}

function NotificationBell({ seeAllHref }: { seeAllHref: string }) {
  const notifications = useNotifications();
  const { userDoc } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const previousFirstId = useRef<string | null>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    const firstId = notifications[0]?.id ?? null;
    if (previousFirstId.current && firstId && firstId !== previousFirstId.current && (userDoc?.notificationPrefs?.notificationSound ?? true)) {
      playNotificationSound();
    }
    previousFirstId.current = firstId;
  }, [notifications, userDoc?.notificationPrefs?.notificationSound]);
  const unread = notifications.length;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="icon-button relative flex">
        <Bell size={20} />
        {unread > 0 && <span aria-live="polite" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 px-1 text-3xs font-bold text-white ring-2 ring-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-modal border border-neutral-200 bg-white shadow-[var(--shadow-3)]">
          <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3"><b className="text-sm">Thông báo</b></header>
          {notifications.length === 0
            ? <div className="px-4 py-8 text-center text-sm text-neutral-500">Chưa có thông báo mới</div>
            : <ul className="max-h-80 overflow-y-auto">{notifications.map((item) => <li key={item.id} className="border-b border-neutral-100 px-4 py-3 last:border-0"><p className="text-sm font-medium text-neutral-900">{item.title}</p><p className="text-xs text-neutral-400">{item.time}</p></li>)}</ul>}
          <footer className="border-t border-neutral-200 p-2 text-center"><Link to={seeAllHref} onClick={() => setOpen(false)} className="block rounded-card px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-neutral-50">Xem tất cả thông báo</Link></footer>
        </div>
      )}
    </div>
  );
}

function NotificationSoundMonitor() {
  const { firebaseUser, userDoc, isStaff } = useAuth();
  const previousInboundKey = useRef<string | null>(null);
  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  useEffect(() => {
    if (!isStaff || !firebaseUser) return;
    const role = userDoc?.role === "admin" ? "admin" : "teacher";
    return subscribeChatThreads(role, firebaseUser.uid, (threads) => {
      const latestInbound = threads.find((thread) => thread.lastMessageDirection === "inbound");
      const key = latestInbound ? `${latestInbound.id}:${latestInbound.lastMessageAt?.toMillis?.() ?? 0}` : null;
      if (previousInboundKey.current && key && key !== previousInboundKey.current && (userDoc?.notificationPrefs?.notificationSound ?? true)) {
        playNotificationSound();
      }
      previousInboundKey.current = key;
    }, () => undefined);
  }, [firebaseUser, isStaff, userDoc?.notificationPrefs?.notificationSound, userDoc?.role]);
  return null;
}

/** Tổng số hội thoại chưa đọc (unreadStaffCount) - dùng cho badge trên nút Chat của Topbar. */
function useChatUnreadCount(): number {
  const { firebaseUser, userDoc, isStaff } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isStaff || !firebaseUser) { setCount(0); return; }
    const role = userDoc?.role === "admin" ? "admin" : "teacher";
    return subscribeChatThreads(role, firebaseUser.uid, (threads) => {
      setCount(threads.reduce((sum, thread) => sum + (thread.unreadStaffCount || 0), 0));
    }, () => undefined);
  }, [firebaseUser, isStaff, userDoc?.role]);
  return count;
}

function ChatButton() {
  const unread = useChatUnreadCount();
  return (
    <Link to={ROUTES.STAFF_CHAT} aria-label={`Chat${unread ? ` (${unread} tin chưa đọc)` : ""}`} title="Chat" className="icon-button relative flex">
      <MessagesSquare size={20} />
      {unread > 0 && <span aria-live="polite" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 px-1 text-3xs font-bold text-white ring-2 ring-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}

function RefreshButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} aria-label="Tải lại trang" title="Tải lại" className="motion-control grid size-9 shrink-0 place-items-center rounded-input border border-neutral-300 bg-white/80 text-neutral-600 hover:bg-white hover:text-primary-700 active:scale-[.96]">
      <RefreshCw size={16} />
    </button>
  );
}

/** Menu "+ Thêm" - tạo nhanh học sinh/lớp/môn học/khóa học/giáo án/thông báo (chỉ Staff). */
function AddMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const items = [
    { label: "Học sinh", to: `${ROUTES.STAFF_STUDENTS}?create=student` },
    { label: "Lớp học", to: `${ROUTES.STAFF_CLASSES}?create=class` },
    { label: "Môn học", to: `${ROUTES.STAFF_CATALOG}?create=subject` },
    { label: "Khóa học", to: `${ROUTES.STAFF_CATALOG}?create=course` },
    { label: "Giáo án", to: `${ROUTES.STAFF_LESSON_PLANS}?create=lesson-plan` },
    { label: "Thông báo", to: `${ROUTES.STAFF_CHAT}?create=message` },
  ];
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className="motion-control inline-flex h-9 items-center gap-1.5 rounded-input bg-primary-600 px-3 text-xs font-bold text-white shadow-[0_5px_14px_rgba(35,72,214,.2)] hover:bg-primary-700 active:scale-[.98]"><Plus size={15} />Thêm<ChevronDown size={14} /></button>
      {open && <div role="menu" className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-card border border-neutral-200 bg-white p-1.5 shadow-[var(--shadow-3)]">
        {items.map((item) => {
          return <button key={item.label} type="button" role="menuitem" onClick={() => { setOpen(false); navigate(item.to); }} className="flex min-h-9 w-full items-center justify-between rounded-input px-3 text-left text-sm font-medium text-neutral-700 hover:bg-primary-50 hover:text-primary-700">{item.label}</button>;
        })}
      </div>}
    </div>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { isStaff } = useAuth();
  const { pathname } = useLocation();
  const title = findPageTitle(pathname);
  const description = findPageDescription(pathname);
  const seeAllHref = isStaff ? ROUTES.STAFF_ANNOUNCEMENTS : ROUTES.VIEWER_ANNOUNCEMENTS;

  return <header className="glass-panel sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/70 px-4 sm:px-6">
    <NotificationSoundMonitor />
    <div className="flex min-w-0 items-center gap-3">
      {onMenuClick && <button type="button" onClick={onMenuClick} aria-label="Mở menu điều hướng" className="icon-button lg:hidden"><Menu size={20} /></button>}
      <div className="min-w-0"><h1 className="truncate text-lg font-semibold text-neutral-900">{title}</h1><p className="hidden max-w-[78ch] truncate text-xs text-neutral-500 sm:block">{description}</p></div>
    </div>
    {/* Cụm hành động (Tải lại / Thêm) tách khỏi cụm liên lạc (Chat / Thông báo) bằng dải phân cách - rõ nhóm chức năng, tối ưu quét mắt. */}
    <div className="flex items-center gap-2 sm:gap-3">
      <RefreshButton />
      {isStaff && <AddMenu />}
      {isStaff && <span aria-hidden="true" className="hidden h-6 w-px bg-neutral-200 sm:block" />}
      {isStaff && <ChatButton />}
      <NotificationBell seeAllHref={seeAllHref} />
    </div>
  </header>;
}
