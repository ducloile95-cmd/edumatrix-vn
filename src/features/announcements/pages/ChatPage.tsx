import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft, CheckCheck, Clock3, Facebook, FileWarning, Info,
  MessageCircle, MoreHorizontal, Search, Send, WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { FanpagePanel } from "@/features/announcements/components/fanpage/FanpagePanel";
import { listChatThreads, listMessageOutbox, subscribeChatMessages } from "@/services/firestore/chat";
import { sendMessenger } from "@/services/messenger/client";
import type { ChatMessageDoc, ChatThreadDoc } from "@/types/chat";

type Section = "conversations" | "outbox" | "fanpage";
type Thread = ChatThreadDoc & { id: string };
type Message = ChatMessageDoc & { id: string };

function initials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function time(value: { toDate?: () => Date } | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value.toDate?.();
  return date && !Number.isNaN(date.getTime()) ? format(date, "dd/MM HH:mm") : "";
}

function ConnectionBar({ configured }: { configured: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs ${configured ? "border-success-100 bg-success-50 text-success-800" : "border-warning-100 bg-warning-50 text-warning-800"}`}>
      <div className="flex items-center gap-2">
        {configured ? <MessageCircle size={15} /> : <WifiOff size={15} />}
        <b>{configured ? "Messenger Worker sẵn sàng" : "Messenger Worker chưa cấu hình"}</b>
        <span className="hidden sm:inline">
          {configured ? "Hội thoại cập nhật từ Firestore theo thời gian thực." : "Có thể xem dữ liệu đã lưu nhưng chưa thể gửi tin mới."}
        </span>
      </div>
      <StatusBadge tone={configured ? "success" : "warning"}>{configured ? "Đã kết nối" : "Chỉ đọc"}</StatusBadge>
    </div>
  );
}

function ThreadInfo({ thread }: { thread: Thread }) {
  const windowEnd = thread.responseWindowEndsAt?.toDate?.();
  const activeWindow = Boolean(windowEnd && windowEnd.getTime() > Date.now());
  return (
    <div className="space-y-5 text-sm">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700">{initials(thread.parentName)}</span>
        <h3 className="mt-3 font-bold text-neutral-900">{thread.parentName}</h3>
        <p className="mt-1 text-xs text-neutral-500">Phụ huynh của {thread.studentName}</p>
      </div>
      <dl className="space-y-3 border-t border-neutral-200 pt-4">
        <div><dt className="text-xs font-semibold text-neutral-400">Học sinh</dt><dd className="mt-1 font-semibold">{thread.studentName} · {thread.studentId}</dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Lớp học</dt><dd className="mt-1 font-semibold">{thread.className || "Chưa xếp lớp"}</dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Kết nối</dt><dd className="mt-1"><StatusBadge tone={thread.status === "blocked" ? "danger" : "success"}>{thread.status === "blocked" ? "Đã chặn" : "Đang hoạt động"}</StatusBadge></dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Cửa sổ phản hồi</dt><dd className={`mt-1 flex items-center gap-2 font-semibold ${activeWindow ? "text-success-700" : "text-warning-700"}`}><Clock3 size={14} />{activeWindow ? `Đến ${time(thread.responseWindowEndsAt)}` : "Cần kiểm tra chính sách gửi"}</dd></div>
      </dl>
    </div>
  );
}

function ConversationPanel({ thread, configured, onBack }: { thread: Thread; configured: boolean; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageError, setMessageError] = useState<Error | null>(null);
  const [draft, setDraft] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(
    () => subscribeChatMessages(thread.id, (items) => { setMessages(items); setMessageError(null); }, setMessageError),
    [thread.id],
  );

  const send = useMutation({
    mutationFn: (text: string) => sendMessenger({ studentId: thread.studentId, text, type: "manual" }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() && configured) send.mutate(draft.trim());
  };

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col bg-neutral-50">
        <header className="flex min-h-[65px] items-center justify-between border-b border-neutral-200 bg-white px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={onBack} className="icon-button flex lg:hidden" aria-label="Quay lại danh sách"><ArrowLeft size={18} /></button>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{initials(thread.parentName)}</span>
            <div className="min-w-0"><h2 className="truncate text-sm font-bold">{thread.parentName}</h2><p className="truncate text-xs text-neutral-500">{thread.studentName} · {thread.className}</p></div>
          </div>
          <div className="flex">
            <button type="button" onClick={() => setInfoOpen(true)} className="icon-button flex xl:hidden" aria-label="Xem thông tin"><Info size={18} /></button>
            <button type="button" className="icon-button flex" aria-label="Thêm thao tác"><MoreHorizontal size={19} /></button>
          </div>
        </header>
        {!configured && <div className="flex gap-2 border-b border-warning-100 bg-warning-50 px-4 py-3 text-xs text-warning-800"><WifiOff size={16} />Worker chưa cấu hình. Composer đang bị khóa.</div>}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-3">
            {messageError ? <ErrorState message="Không tải được lịch sử hội thoại." /> : messages.length ? messages.map((message) => (
              <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-[14px] px-3.5 py-2.5 text-sm leading-5 shadow-sm sm:max-w-[70%] ${message.direction === "outbound" ? "rounded-br-[4px] bg-primary-600 text-white" : "rounded-bl-[4px] border border-neutral-200 bg-white"}`}>
                  <p>{message.text}</p>
                  <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${message.direction === "outbound" ? "text-primary-100" : "text-neutral-400"}`}>
                    <span>{time(message.createdAt)}</span>
                    {message.status === "sent" && <CheckCheck size={12} />}
                    {message.status === "failed" && <FileWarning size={12} />}
                  </div>
                </div>
              </div>
            )) : <div className="py-16 text-center"><MessageCircle className="mx-auto text-neutral-300" size={36} /><p className="mt-3 text-sm font-semibold">Chưa có tin nhắn</p></div>}
          </div>
        </div>
        <form onSubmit={submit} className="border-t border-neutral-200 bg-white p-3 sm:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Soạn tin nhắn</span>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} maxLength={2000} disabled={!configured || send.isPending} placeholder={configured ? "Nhập tin nhắn..." : "Worker chưa cấu hình"} className="max-h-28 min-h-touch w-full resize-none rounded-[12px] border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100" />
            </label>
            <button type="submit" disabled={!configured || !draft.trim() || send.isPending} aria-label="Gửi tin nhắn" className="motion-control flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-600 text-white active:scale-[.97] disabled:opacity-40"><Send size={18} /></button>
          </div>
          {send.isError && <p role="alert" className="mx-auto mt-2 max-w-3xl text-xs text-danger-700">Gửi thất bại: {(send.error as Error).message}</p>}
        </form>
      </section>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Thông tin hội thoại" size="sm"><ThreadInfo thread={thread} /></Modal>
    </>
  );
}

function Conversations({ threads, configured }: { threads: Thread[]; configured: boolean }) {
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? "");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!threads.some((thread) => thread.id === selectedId)) setSelectedId(threads[0]?.id ?? "");
  }, [threads, selectedId]);

  const filtered = useMemo(
    () => threads.filter((thread) => `${thread.parentName} ${thread.studentName} ${thread.studentId}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (filter === "all" || thread.unreadStaffCount > 0)),
    [filter, search, threads],
  );
  const selected = threads.find((thread) => thread.id === selectedId);

  if (!threads.length) return <div className="flex min-h-0 flex-1 items-center justify-center bg-neutral-50 p-6 text-center"><div><MessageCircle className="mx-auto text-neutral-300" size={40} /><h2 className="mt-4 text-base font-bold">Chưa có hội thoại Messenger</h2><p className="mt-1 max-w-sm text-sm leading-6 text-neutral-500">Hội thoại sẽ xuất hiện khi phụ huynh liên kết và gửi tin qua Facebook Page.</p></div></div>;

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_300px]">
      <aside className={`${mobileThreadOpen ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-neutral-200 bg-white`}>
        <div className="border-b border-neutral-200 p-3">
          <label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><span className="sr-only">Tìm hội thoại</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên phụ huynh, học sinh..." className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-primary-500" /></label>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-input bg-neutral-100 p-1">
            {([["all", "Tất cả"], ["unread", "Chưa đọc"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 rounded-[7px] text-xs font-semibold ${filter === value ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500"}`}>{label}</button>)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((thread) => (
            <button key={thread.id} type="button" onClick={() => { setSelectedId(thread.id); setMobileThreadOpen(true); }} className={`flex w-full gap-3 border-b border-neutral-100 px-3 py-3 text-left ${thread.id === selectedId ? "bg-primary-50" : "hover:bg-neutral-50"}`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{initials(thread.parentName)}</span>
              <span className="min-w-0 flex-1"><span className="flex justify-between"><b className="truncate text-sm">{thread.parentName}</b><span className="text-[10px] text-neutral-400">{time(thread.lastMessageAt)}</span></span><span className="block truncate text-xs text-neutral-600">{thread.studentName} · {thread.className}</span><span className="mt-1 block truncate text-xs text-neutral-500">{thread.lastMessagePreview}</span></span>
              {thread.unreadStaffCount > 0 && <span className="mt-8 flex size-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">{thread.unreadStaffCount}</span>}
            </button>
          ))}
        </div>
      </aside>
      <div className={`${mobileThreadOpen ? "flex" : "hidden lg:flex"} min-h-0`}>
        {selected && <ConversationPanel thread={selected} configured={configured} onBack={() => setMobileThreadOpen(false)} />}
      </div>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-neutral-200 bg-white p-5 xl:block">{selected && <ThreadInfo thread={selected} />}</aside>
    </div>
  );
}

function Outbox({ role, uid }: { role: "admin" | "teacher"; uid: string }) {
  const result = useQuery({ queryKey: ["message-outbox", role, uid], queryFn: () => listMessageOutbox(role, uid) });
  if (result.isLoading) return <div className="p-5"><LoadingSkeleton rows={6} /></div>;
  if (result.isError) return <div className="p-5"><ErrorState message="Không tải được nhật ký gửi." onRetry={() => result.refetch()} /></div>;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 p-3 sm:p-5">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-card border border-neutral-200 bg-white">
        <header className="border-b border-neutral-200 px-4 py-4"><h2 className="text-sm font-bold">Nhật ký gửi</h2><p className="mt-1 text-xs text-neutral-500">{role === "admin" ? "Toàn bộ kết quả gửi gần nhất." : "Chỉ các tin do bạn gửi."}</p></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-neutral-50 text-left text-xs font-bold text-neutral-500"><tr><th className="px-4 py-3">Mã gửi</th><th className="px-4 py-3">Học sinh</th><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3 text-right">Trạng thái</th></tr></thead><tbody>
          {result.data?.length ? result.data.map((row) => <tr key={row.id} className="border-t border-neutral-100"><td className="px-4 py-3 font-mono text-xs">{row.id.slice(0, 14)}</td><td className="px-4 py-3">{row.studentId ?? "Fanpage"}</td><td className="max-w-sm truncate px-4 py-3 text-neutral-600">{row.content}</td><td className="px-4 py-3 text-neutral-500">{time(row.createdAt)}</td><td className="px-4 py-3 text-right"><StatusBadge tone={row.status === "sent" ? "success" : "danger"}>{row.status === "sent" ? "Đã gửi" : "Thất bại"}</StatusBadge></td></tr>) : <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500">Chưa có nhật ký gửi.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { firebaseUser, userDoc } = useAuth();
  const role = userDoc?.role === "admin" ? "admin" : "teacher";
  const uid = firebaseUser?.uid ?? "";
  const configured = Boolean(import.meta.env.VITE_MESSENGER_WORKER_URL?.trim());
  const [section, setSection] = useState<Section>("conversations");
  const threads = useQuery({ queryKey: ["chat-threads", role, uid], queryFn: () => listChatThreads(role, uid), enabled: Boolean(uid) });
  const tabs = [
    { value: "conversations" as const, label: "Hội thoại", icon: MessageCircle },
    { value: "outbox" as const, label: "Nhật ký gửi", icon: Clock3 },
    ...(role === "admin" ? [{ value: "fanpage" as const, label: "Đăng Fanpage", icon: Facebook }] : []),
  ];

  return (
    <AppShell>
      <div className="flex h-[calc(100dvh-112px)] min-h-[620px] flex-col overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
        <ConnectionBar configured={configured} />
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-200 px-3" aria-label="Nhánh Chat">
          {tabs.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setSection(value)} className={`relative flex min-h-[50px] shrink-0 items-center gap-2 px-3 text-sm font-semibold ${section === value ? "text-primary-700" : "text-neutral-500"}`}><Icon size={16} />{label}{section === value && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary-600" />}</button>)}
        </nav>
        {section === "conversations" && (threads.isLoading ? <div className="p-5"><LoadingSkeleton rows={7} /></div> : threads.isError ? <div className="p-5"><ErrorState message="Không tải được hội thoại." onRetry={() => threads.refetch()} /></div> : <Conversations threads={threads.data ?? []} configured={configured} />)}
        {section === "outbox" && <Outbox role={role} uid={uid} />}
        {section === "fanpage" && role === "admin" && (
          <FanpagePanel configured={configured} actorUid={uid} actorName={userDoc?.displayName ?? "Admin"} />
        )}
      </div>
    </AppShell>
  );
}
