import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft, CheckCheck, Clock3, Copy, ExternalLink, Facebook, FileWarning, Info,
  MessageCircle, MoreHorizontal, Plus, Search, Send, WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tab, Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { FanpagePanel } from "@/features/announcements/components/fanpage/FanpagePanel";
import { listChatThreads, listMessageOutbox, subscribeChatMessages } from "@/services/firestore/chat";
import { listStudents } from "@/services/firestore/students";
import { createMessengerInviteLink, isMessengerInviteConfigured, MessengerSendError, messengerPageUrl, sendMessenger } from "@/services/integrations/messenger";
import { queryKeys } from "@/hooks/queryKeys";
import type { ChatMessageDoc, ChatThreadDoc } from "@/types/chat";

type Section = "conversations" | "outbox" | "fanpage";
type Thread = ChatThreadDoc & { id: string };
type Message = ChatMessageDoc & { id: string };
/** Dinh dang Meta Message Tag (vd ACCOUNT_UPDATE) - khop kiem tra phia Worker (isMessengerTagShape). */
const TAG_PATTERN = /^[A-Z_]{3,64}$/;

function initials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function time(value: { toDate?: () => Date } | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value.toDate?.();
  return date && !Number.isNaN(date.getTime()) ? format(date, "dd/MM HH:mm") : "";
}

function ConnectionBar({ configured }: { configured: boolean }) {
  const pageUrl = messengerPageUrl();
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs ${configured ? "border-success-100 bg-success-50 text-success-800" : "border-warning-100 bg-warning-50 text-warning-800"}`}>
      <div className="flex items-center gap-2">
        {configured ? <MessageCircle size={15} /> : <WifiOff size={15} />}
        <b>{configured ? "Messenger Worker sẵn sàng" : "Messenger Worker chưa cấu hình"}</b>
        <span className="hidden sm:inline">
          {configured ? "Hội thoại cập nhật từ Firestore theo thời gian thực." : "Có thể xem dữ liệu đã lưu nhưng chưa thể gửi tin mới."}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {!configured && pageUrl && (
          <a href={pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-input border border-warning-300 bg-white px-2.5 py-1 font-semibold text-warning-800 hover:bg-warning-100">
            <ExternalLink size={12} />Mở Trang Facebook để nhắn thủ công
          </a>
        )}
        <StatusBadge tone={configured ? "success" : "warning"}>{configured ? "Đã kết nối" : "Chỉ đọc"}</StatusBadge>
      </div>
    </div>
  );
}

/** Nut copy 1 link vao clipboard, doi label sang "Da copy" tam thoi de xac nhan - dung chung cho link moi lien ket Messenger. */
function CopyInviteLinkButton({ parentUid, studentId, label }: { parentUid: string; studentId: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const invite = await createMessengerInviteLink(parentUid, studentId);
            await navigator.clipboard.writeText(invite.url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Không tạo được link mời");
          } finally {
            setPending(false);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-input border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
      >
        <Copy size={13} />{pending ? "Đang tạo link..." : copied ? "Đã copy link" : label}
      </button>
      {error && <span role="alert" className="text-xs text-danger-700">{error}</span>}
    </span>
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
  const [tag, setTag] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(
    () => subscribeChatMessages(thread.id, (items) => { setMessages(items); setMessageError(null); }, setMessageError),
    [thread.id],
  );

  const send = useMutation({
    mutationFn: async (text: string) => {
      const result = await sendMessenger({ studentId: thread.studentId, text, type: "manual", tag: tag.trim() || undefined });
      if (!result.sent) throw new MessengerSendError(result.message);
      return result;
    },
    onSuccess: () => {
      setDraft("");
      setTag("");
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    },
  });
  const tagInvalid = tag.trim() !== "" && !TAG_PATTERN.test(tag.trim());
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() && configured && !tagInvalid) send.mutate(draft.trim());
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
                <div className={`max-w-[82%] rounded-chat-bubble px-3.5 py-2.5 text-sm leading-5 shadow-sm sm:max-w-[70%] ${message.direction === "outbound" ? "rounded-br-chat-tail bg-primary-600 text-white" : "rounded-bl-chat-tail border border-neutral-200 bg-white"}`}>
                  <p>{message.text}</p>
                  <div className={`mt-1 flex items-center justify-end gap-1 text-3xs ${message.direction === "outbound" ? "text-primary-100" : "text-neutral-400"}`}>
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
          <div className="mx-auto max-w-3xl">
            <label className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
              <span className="shrink-0">Tag (tuỳ chọn, gửi ngoài cửa sổ 24h)</span>
              <input value={tag} onChange={(event) => setTag(event.target.value.toUpperCase())} placeholder="VD: ACCOUNT_UPDATE" disabled={!configured || send.isPending} className="min-h-8 w-44 rounded-input border border-neutral-300 bg-neutral-50 px-2 text-xs uppercase outline-none focus:border-primary-500 disabled:bg-neutral-100" />
            </label>
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Soạn tin nhắn</span>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} maxLength={2000} disabled={!configured || send.isPending} placeholder={configured ? "Nhập tin nhắn..." : "Worker chưa cấu hình"} className="max-h-28 min-h-touch w-full resize-none rounded-[12px] border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100" />
              </label>
              <button type="submit" disabled={!configured || !draft.trim() || tagInvalid || send.isPending} aria-label="Gửi tin nhắn" className="motion-control flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-600 text-white active:scale-[.97] disabled:opacity-40"><Send size={18} /></button>
            </div>
            {tagInvalid && <p className="mt-1 text-xs text-warning-700">Tag chỉ dùng chữ in hoa A-Z và dấu gạch dưới, 3-64 ký tự.</p>}
            {send.isPending && <p className="mt-2 text-xs text-neutral-500">Đang gửi...</p>}
            {send.isError && (
              <div className="mt-2 space-y-1.5">
                <p role="alert" className="text-xs text-danger-700">Gửi thất bại: {(send.error as Error).message}</p>
                {send.error instanceof MessengerSendError && send.error.code === "no_recipient" && (
                  isMessengerInviteConfigured() ? (
                    <CopyInviteLinkButton parentUid={thread.parentUid} studentId={thread.studentId} label="Copy link mời phụ huynh liên kết Messenger" />
                  ) : (
                    <p className="text-xs text-neutral-500">Chưa cấu hình Page Facebook (VITE_MESSENGER_PAGE_USERNAME) để tạo link mời.</p>
                  )
                )}
              </div>
            )}
            {send.isSuccess && !send.isPending && <p className="mt-2 text-xs text-success-700">Đã gửi thành công.</p>}
          </div>
        </form>
      </section>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Thông tin hội thoại" size="sm"><ThreadInfo thread={thread} /></Modal>
    </>
  );
}

function NewConversationPicker({ open, onClose, configured, onSent }: { open: boolean; onClose: () => void; configured: boolean; onSent: (studentId: string) => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; fullName: string; parentUids: string[] } | null>(null);
  const [draft, setDraft] = useState("");
  const [tag, setTag] = useState("");
  const students = useQuery({ queryKey: queryKeys.students(), queryFn: listStudents, enabled: open });
  const queryClient = useQueryClient();

  function reset() {
    setSearch(""); setSelected(null); setDraft(""); setTag(""); send.reset();
  }

  const send = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Chưa chọn học sinh");
      const result = await sendMessenger({ studentId: selected.id, text: draft.trim(), type: "manual", tag: tag.trim() || undefined });
      if (!result.sent) throw new MessengerSendError(result.message);
      return result;
    },
    onSuccess: () => {
      const studentId = selected?.id;
      queryClient.invalidateQueries({ queryKey: queryKeys.chatThreads() });
      reset();
      onClose();
      if (studentId) onSent(studentId);
    },
  });

  const filtered = useMemo(
    () => (students.data ?? []).filter((student) => `${student.fullName} ${student.studentCode}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))),
    [search, students.data],
  );
  const tagInvalid = tag.trim() !== "" && !TAG_PATTERN.test(tag.trim());
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected && draft.trim() && configured && !tagInvalid) send.mutate();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Nhắn tin mới" description="Chọn học sinh để bắt đầu hoặc tiếp tục hội thoại Messenger." size="sm">
      {!selected ? (
        <div className="space-y-3">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <span className="sr-only">Tìm học sinh</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc mã học sinh..." className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-primary-500" />
          </label>
          <div className="max-h-72 overflow-y-auto rounded-input border border-neutral-200">
            {students.isLoading ? <div className="p-4"><LoadingSkeleton rows={4} /></div>
              : students.isError ? <div className="p-4"><ErrorState message="Không tải được danh sách học sinh." onRetry={() => students.refetch()} /></div>
              : filtered.length ? filtered.map((student) => (
                <button key={student.id} type="button" onClick={() => setSelected({ id: student.id, fullName: student.fullName, parentUids: student.parentUids })} className="flex w-full items-center gap-3 border-b border-neutral-100 px-3 py-2.5 text-left last:border-0 hover:bg-neutral-50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{initials(student.fullName)}</span>
                  <span className="min-w-0"><b className="block truncate text-sm">{student.fullName}</b><span className="block text-xs text-neutral-500">{student.studentCode}</span></span>
                </button>
              )) : <p className="p-4 text-center text-sm text-neutral-500">Không tìm thấy học sinh phù hợp.</p>}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center justify-between rounded-input border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <span className="text-sm font-semibold">{selected.fullName}</span>
            <button type="button" onClick={() => setSelected(null)} className="text-xs font-semibold text-primary-700">Đổi học sinh</button>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-neutral-500">Tag (tuỳ chọn, gửi ngoài cửa sổ 24h)</span>
            <input value={tag} onChange={(event) => setTag(event.target.value.toUpperCase())} placeholder="VD: ACCOUNT_UPDATE" disabled={send.isPending} className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm uppercase outline-none focus:border-primary-500 disabled:bg-neutral-100" />
            {tagInvalid && <span className="mt-1 block text-xs text-warning-700">Tag chỉ dùng chữ in hoa A-Z và dấu gạch dưới, 3-64 ký tự.</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-neutral-500">Nội dung</span>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} maxLength={2000} disabled={send.isPending} placeholder="Nhập tin nhắn..." className="w-full resize-none rounded-input border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-100" />
          </label>
          {!configured && <p className="text-xs text-warning-700">Worker chưa cấu hình, chưa thể gửi.</p>}
          {send.isPending && <p className="text-xs text-neutral-500">Đang gửi...</p>}
          {send.isError && (
            <div className="space-y-1.5">
              <p role="alert" className="text-xs text-danger-700">Gửi thất bại: {(send.error as Error).message}</p>
              {send.error instanceof MessengerSendError && send.error.code === "no_recipient" && (
                !selected.parentUids.length ? (
                  <p className="text-xs text-neutral-500">Học sinh chưa có tài khoản phụ huynh liên kết trong hệ thống.</p>
                ) : !isMessengerInviteConfigured() ? (
                  <p className="text-xs text-neutral-500">Chưa cấu hình Page Facebook (VITE_MESSENGER_PAGE_USERNAME) để tạo link mời.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.parentUids.map((uid, index) => (
                      <CopyInviteLinkButton key={uid} parentUid={uid} studentId={selected.id} label={selected.parentUids.length > 1 ? `Copy link mời phụ huynh ${index + 1}` : "Copy link mời phụ huynh liên kết Messenger"} />
                    ))}
                  </div>
                )
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" onClick={() => setSelected(null)}>Quay lại</Button>
            <Button type="submit" variant="primary" icon={<Send size={16} />} disabled={!configured || !draft.trim() || tagInvalid || send.isPending}>
              {send.isPending ? "Đang gửi..." : "Gửi tin nhắn"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Conversations({ threads, configured, initialPickerOpen = false }: { threads: Thread[]; configured: boolean; initialPickerOpen?: boolean }) {
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? "");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pickerOpen, setPickerOpen] = useState(initialPickerOpen);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!threads.some((thread) => thread.id === selectedId)) setSelectedId(threads[0]?.id ?? "");
  }, [threads, selectedId]);

  useEffect(() => {
    if (!pendingStudentId) return;
    const match = threads.find((thread) => thread.studentId === pendingStudentId);
    if (match) {
      setSelectedId(match.id);
      setMobileThreadOpen(true);
      setPendingStudentId(null);
    }
  }, [pendingStudentId, threads]);

  const filtered = useMemo(
    () => threads.filter((thread) => `${thread.parentName} ${thread.studentName} ${thread.studentId}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (filter === "all" || thread.unreadStaffCount > 0)),
    [filter, search, threads],
  );
  const selected = threads.find((thread) => thread.id === selectedId);

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_300px]">
      <aside className={`${mobileThreadOpen ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-neutral-200 bg-white`}>
        <div className="border-b border-neutral-200 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Hội thoại</h2>
            <button type="button" onClick={() => setPickerOpen(true)} className="motion-control inline-flex min-h-8 items-center gap-1 rounded-input bg-primary-600 px-2.5 text-xs font-semibold text-white active:scale-[.97]"><Plus size={14} />Nhắn mới</button>
          </div>
          <label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><span className="sr-only">Tìm hội thoại</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên phụ huynh, học sinh..." className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-primary-500" /></label>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-input bg-neutral-100 p-1">
            {([["all", "Tất cả"], ["unread", "Chưa đọc"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 rounded-[7px] text-xs font-semibold ${filter === value ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500"}`}>{label}</button>)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!threads.length ? (
            <div className="p-6 text-center"><MessageCircle className="mx-auto text-neutral-300" size={32} /><p className="mt-3 text-sm font-semibold">Chưa có hội thoại</p><p className="mt-1 text-xs leading-5 text-neutral-500">Bấm &quot;Nhắn mới&quot; để bắt đầu, hoặc chờ phụ huynh liên kết và nhắn qua Facebook Page.</p></div>
          ) : filtered.map((thread) => (
            <button key={thread.id} type="button" onClick={() => { setSelectedId(thread.id); setMobileThreadOpen(true); }} className={`flex w-full gap-3 border-b border-neutral-100 px-3 py-3 text-left ${thread.id === selectedId ? "bg-primary-50" : "hover:bg-neutral-50"}`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{initials(thread.parentName)}</span>
              <span className="min-w-0 flex-1"><span className="flex justify-between"><b className="truncate text-sm">{thread.parentName}</b><span className="text-3xs text-neutral-400">{time(thread.lastMessageAt)}</span></span><span className="block truncate text-xs text-neutral-600">{thread.studentName} · {thread.className}</span><span className="mt-1 block truncate text-xs text-neutral-500">{thread.lastMessagePreview}</span></span>
              {thread.unreadStaffCount > 0 && <span className="mt-8 flex size-5 items-center justify-center rounded-full bg-primary-600 text-3xs font-bold text-white">{thread.unreadStaffCount}</span>}
            </button>
          ))}
        </div>
      </aside>
      <div className={`${mobileThreadOpen ? "flex" : "hidden lg:flex"} min-h-0`}>
        {selected ? <ConversationPanel thread={selected} configured={configured} onBack={() => setMobileThreadOpen(false)} /> : (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-neutral-50 p-6 text-center"><div><MessageCircle className="mx-auto text-neutral-300" size={36} /><p className="mt-3 text-sm font-semibold">Chưa có hội thoại Messenger</p><p className="mt-1 max-w-sm text-sm leading-6 text-neutral-500">Bấm &quot;Nhắn mới&quot; để bắt đầu, hoặc hội thoại sẽ xuất hiện khi phụ huynh liên kết và gửi tin qua Facebook Page.</p></div></div>
        )}
      </div>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-neutral-200 bg-white p-5 xl:block">{selected && <ThreadInfo thread={selected} />}</aside>
      <NewConversationPicker open={pickerOpen} onClose={() => setPickerOpen(false)} configured={configured} onSent={setPendingStudentId} />
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
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-neutral-50 text-left text-xs font-bold text-neutral-500"><tr><th className="px-4 py-3">Mã gửi</th><th className="px-4 py-3">Học sinh</th><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Loại gửi</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3 text-right">Trạng thái</th></tr></thead><tbody>
          {result.data?.length ? result.data.map((row) => <tr key={row.id} className="border-t border-neutral-100"><td className="px-4 py-3 font-mono text-xs">{row.id.slice(0, 14)}</td><td className="px-4 py-3">{row.studentId ?? "Fanpage"}</td><td className="max-w-sm truncate px-4 py-3 text-neutral-600">{row.content}</td><td className="px-4 py-3">{row.messageTag ? <span className="rounded-full bg-info-50 px-2 py-0.5 text-2xs font-semibold text-info-700">TAG · {row.messageTag}</span> : <span className="text-xs text-neutral-400">RESPONSE</span>}</td><td className="px-4 py-3 text-neutral-500">{time(row.createdAt)}</td><td className="px-4 py-3 text-right"><StatusBadge tone={row.status === "sent" ? "success" : "danger"}>{row.status === "sent" ? "Đã gửi" : "Thất bại"}</StatusBadge></td></tr>) : <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500">Chưa có nhật ký gửi.</td></tr>}
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
  const initialPickerOpen = new URLSearchParams(window.location.search).get("create") === "message";
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
        <Tabs label="Nhánh Chat" className="shrink-0 px-3">
          {tabs.map(({ value, label, icon: Icon }) => <Tab key={value} active={section === value} onClick={() => setSection(value)} className="min-h-[50px]"><Icon size={16} />{label}</Tab>)}
        </Tabs>
        {section === "conversations" && (threads.isLoading ? <div className="p-5"><LoadingSkeleton rows={7} /></div> : threads.isError ? <div className="p-5"><ErrorState message="Không tải được hội thoại." onRetry={() => threads.refetch()} /></div> : <Conversations threads={threads.data ?? []} configured={configured} initialPickerOpen={initialPickerOpen} />)}
        {section === "outbox" && <Outbox role={role} uid={uid} />}
        {section === "fanpage" && role === "admin" && (
          <FanpagePanel configured={configured} actorUid={uid} actorName={userDoc?.displayName ?? "Admin"} />
        )}
      </div>
    </AppShell>
  );
}
