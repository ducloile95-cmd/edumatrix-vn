import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, CircleHelp, Menu, MessagesSquare, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { markChatThreadRead, subscribeChatThreads } from "@/services/firestore/chat";
import { dismissNotifications, listViewerNotifications, markNotificationsRead, VIEWER_NOTIFICATION_REFRESH_MS, type ViewerNotification } from "@/services/firestore/notifications";
import { ROUTES, systemGuidePath, systemGuideRoleForUserRole } from "@/constants/routes";
import { findPageTitle } from "@/constants/navigation";
import { playNotificationSound, unlockNotificationSound } from "@/utils/notificationSound";
import { runViewTransition } from "@/utils/viewTransition";

type Notification = { id: string; title: string; time: string; isRead: boolean; version: string };

function useNotifications() {
  const { firebaseUser, userDoc, isStaff } = useAuth();
  const studentIds = userDoc?.studentIds ?? [];
  const queryClient = useQueryClient();
  const queryKey = ["topbar-notifications", firebaseUser?.uid, studentIds] as const;
  const viewerQuery = useQuery({
    queryKey,
    queryFn: () => listViewerNotifications(firebaseUser!.uid, studentIds),
    enabled: !!firebaseUser && !isStaff && studentIds.length > 0,
    staleTime: VIEWER_NOTIFICATION_REFRESH_MS,
    refetchInterval: VIEWER_NOTIFICATION_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
  const [staffNotifications, setStaffNotifications] = useState<Notification[]>([]);
  const [staffNotificationsLoaded, setStaffNotificationsLoaded] = useState(false);
  useEffect(() => {
    if (!firebaseUser || !isStaff) { setStaffNotifications([]); setStaffNotificationsLoaded(false); return; }
    const role = userDoc?.role === "admin" ? "admin" : "teacher";
    return subscribeChatThreads(role, firebaseUser.uid, (threads) => {
      setStaffNotifications(threads.filter((thread) => thread.unreadStaffCount > 0).map((thread) => ({
        id: thread.id,
        title: `${thread.parentName}: ${thread.lastMessagePreview}`,
        time: thread.lastMessageAt ? format(thread.lastMessageAt.toDate(), "dd/MM HH:mm") : "",
        isRead: false,
        version: thread.lastMessageAt?.toMillis().toString() ?? thread.lastMessagePreview,
      })));
      setStaffNotificationsLoaded(true);
    }, () => undefined);
  }, [firebaseUser, isStaff, userDoc?.role]);

  const viewerNotifications: Notification[] = (viewerQuery.data ?? []).map((item) => ({
    id: item.id, title: item.title, time: item.createdAt ? format(item.createdAt.toDate(), "dd/MM HH:mm") : "", isRead: item.isRead,
    version: item.createdAt?.toMillis().toString() ?? item.id,
  }));
  const notifications = isStaff ? staffNotifications : viewerNotifications;
  const markRead = async (id: string) => {
    if (!firebaseUser) return;
    if (isStaff) await markChatThreadRead(id);
    else {
      queryClient.setQueryData<ViewerNotification[]>(queryKey, (current) => current?.map((item) => item.id === id ? { ...item, isRead: true } : item));
      await markNotificationsRead(firebaseUser.uid, [id]);
    }
  };
  const clearAll = async () => {
    if (!firebaseUser) return;
    if (isStaff) await Promise.all(notifications.map((item) => markChatThreadRead(item.id)));
    else {
      queryClient.setQueryData<ViewerNotification[]>(queryKey, []);
      await dismissNotifications(firebaseUser.uid, notifications.map((item) => item.id));
    }
  };
  return { notifications, notificationsLoaded: isStaff ? staffNotificationsLoaded : viewerQuery.isFetched, markRead, clearAll };
}

function NotificationBell({ seeAllHref }: { seeAllHref: string }) {
  const { notifications, notificationsLoaded, markRead, clearAll } = useNotifications();
  const { userDoc } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const previousVersions = useRef<Set<string>>(new Set());
  const soundBaselineReady = useRef(false);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (!notificationsLoaded) return;
    const currentVersions = new Set(notifications.map((item) => `${item.id}:${item.version}`));
    const hasNewUnread = notifications.some((item) => !item.isRead && !previousVersions.current.has(`${item.id}:${item.version}`));
    if (soundBaselineReady.current && hasNewUnread && (userDoc?.notificationPrefs?.notificationSound ?? true)) {
      playNotificationSound();
    }
    previousVersions.current = currentVersions;
    soundBaselineReady.current = true;
  }, [notifications, notificationsLoaded, userDoc?.notificationPrefs?.notificationSound]);
  const unread = notifications.filter((item) => !item.isRead).length;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="icon-button relative flex">
        <Bell size={20} />
        {unread > 0 && <span aria-live="polite" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary-600 px-1 text-3xs font-bold text-white ring-2 ring-neutral-0">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-modal border border-neutral-200 bg-neutral-0 shadow-[var(--shadow-3)]">
          <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3"><b className="text-sm">Thông báo</b>{notifications.length > 0 && <button type="button" onClick={() => void clearAll()} className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-xs font-semibold text-danger-600 hover:bg-danger-50" aria-label="Xóa tất cả thông báo"><Trash2 size={14} />Xóa tất cả</button>}</header>
          {notifications.length === 0
            ? <div className="px-4 py-8 text-center text-sm text-neutral-500">Chưa có thông báo mới</div>
            : <ul className="max-h-80 overflow-y-auto">{notifications.slice(0, 8).map((item) => <li key={item.id} className="border-b border-neutral-100 last:border-0"><Link to={seeAllHref} viewTransition onClick={() => { void markRead(item.id); setOpen(false); }} className={`block px-4 py-3 hover:bg-neutral-50 ${item.isRead ? "text-neutral-600" : "bg-primary-50/50 text-neutral-900"}`}><span className="flex items-start gap-2"><span className="min-w-0 flex-1"><span className={`block text-sm ${item.isRead ? "font-medium" : "font-bold"}`}><span translate="no">{item.title}</span></span><span className="text-xs text-neutral-400">{item.time}</span></span>{!item.isRead && <span aria-label="Chưa đọc" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-600" />}</span></Link></li>)}</ul>}
          <footer className="border-t border-neutral-200 p-2 text-center"><Link to={seeAllHref} viewTransition onClick={() => setOpen(false)} className="block rounded-card px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-neutral-50">Xem tất cả thông báo</Link></footer>
        </div>
      )}
    </div>
  );
}

function NotificationSoundMonitor() {
  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
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
    <Link to={ROUTES.STAFF_CHAT} viewTransition aria-label={`Chat${unread ? ` (${unread} tin chưa đọc)` : ""}`} title="Chat" className="icon-button relative flex">
      <MessagesSquare size={20} />
      {unread > 0 && <span aria-live="polite" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary-600 px-1 text-3xs font-bold text-white ring-2 ring-neutral-0">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}

function RefreshButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} aria-label="Tải lại trang" title="Tải lại" className="motion-control grid size-9 shrink-0 place-items-center rounded-input border border-neutral-300 bg-neutral-0/80 text-neutral-600 hover:bg-neutral-0 hover:text-primary-700 active:scale-[.96]">
      <RefreshCw size={16} />
    </button>
  );
}

function HelpButton() {
  const { role } = useAuth();
  const guideRole = systemGuideRoleForUserRole(role);
  if (!guideRole) return null;

  const roleLabel = guideRole === "teacher" ? "Teacher" : "Phụ huynh";
  return (
    <Link
      to={systemGuidePath(guideRole)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Hướng dẫn sử dụng cho ${roleLabel} (mở tab mới)`}
      title={`Hướng dẫn ${roleLabel}`}
      className="icon-button flex"
    >
      <CircleHelp size={20} />
    </Link>
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
    ...(import.meta.env.DEV ? [{ label: "Demo Motion", to: ROUTES.MOTION_DEMO }] : []),
  ];
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className="motion-control inline-flex h-9 items-center gap-1.5 rounded-input bg-primary-600 px-3 text-xs font-bold text-white hover:bg-primary-700 active:scale-[.98]"><Plus size={15} />Thêm<ChevronDown size={14} /></button>
      {open && <div role="menu" className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-card border border-neutral-200 bg-neutral-0 p-1.5 shadow-[var(--shadow-3)]">
        {items.map((item) => {
          return <button key={item.label} type="button" role="menuitem" onClick={() => { setOpen(false); runViewTransition(() => navigate(item.to)); }} className="flex min-h-9 w-full items-center justify-between rounded-input px-3 text-left text-sm font-medium text-neutral-700 hover:bg-primary-50 hover:text-primary-700">{item.label}</button>;
        })}
      </div>}
    </div>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { isStaff } = useAuth();
  const { pathname } = useLocation();
  const title = findPageTitle(pathname);
  const seeAllHref = isStaff ? ROUTES.STAFF_ANNOUNCEMENTS : ROUTES.VIEWER_ANNOUNCEMENTS;

  return <header className="glass-panel sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-0/70 px-3 sm:px-6">
    <NotificationSoundMonitor />
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      {onMenuClick && <button type="button" onClick={onMenuClick} aria-label="Mở menu điều hướng" className="icon-button lg:hidden"><Menu size={20} /></button>}
      <h1 className="truncate text-base font-semibold text-neutral-900 sm:text-lg">{title}</h1>
    </div>
    {/* Cụm hành động (Tải lại / Thêm) tách khỏi cụm liên lạc (Chat / Thông báo) bằng dải phân cách - rõ nhóm chức năng, tối ưu quét mắt. */}
    <div className="flex shrink-0 items-center gap-1 md:gap-3">
      <div className="hidden md:block"><RefreshButton /></div>
      {isStaff && <div className="hidden md:block"><AddMenu /></div>}
      {isStaff && <span aria-hidden="true" className="hidden h-6 w-px bg-neutral-200 md:block" />}
      {isStaff && <div className="hidden md:block"><ChatButton /></div>}
      <HelpButton />
      <NotificationBell seeAllHref={seeAllHref} />
    </div>
  </header>;
}
