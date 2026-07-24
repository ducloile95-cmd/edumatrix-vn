import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft, Checks, ClockCounterClockwise, Copy, ArrowSquareOut, FacebookLogo,
  Warning, Info, ChatCircleDots, DotsThree, Plus, MagnifyingGlass,
  PaperPlaneTilt, WifiSlash,
} from "@phosphor-icons/react";
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
import { createMessengerInviteLink, isMessengerInviteConfigured, linkMessengerConversation, MessengerSendError, messengerPageUrl, sendMessenger } from "@/services/integrations/messenger";
import { queryKeys } from "@/hooks/queryKeys";
import type { ChatMessageDoc, ChatThreadDoc } from "@/types/chat";

type Section = "conversations" | "outbox" | "fanpage";
type Thread = ChatThreadDoc & { id: string };
type Message = ChatMessageDoc & { id: string };
type MessageTopic = "lesson_review" | "course_review" | "general_notice" | "tuition_reminder";
type DeliveryMode = "response" | "account_update";
/** Dinh dang Meta Message Tag (vd ACCOUNT_UPDATE) - khop kiem tra phia Worker (isMessengerTagShape). */
const TAG_PATTERN = /^[A-Z_]{3,64}$/;
const MESSAGE_TOPICS: Array<{ value: MessageTopic; label: string }> = [
  { value: "lesson_review", label: "Đánh giá buổi học" },
  { value: "course_review", label: "Đánh giá khóa học" },
  { value: "general_notice", label: "Thông báo tổng" },
  { value: "tuition_reminder", label: "Nhắc học phí" },
];

function initials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function accountName(thread: Thread) {
  return thread.facebookName?.trim() || thread.parentName;
}

function AccountAvatar({ thread, size = "md" }: { thread: Thread; size?: "md" | "lg" }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [thread.facebookAvatarUrl]);
  const sizeClass = size === "lg" ? "size-14 text-sm" : "size-10 text-xs";
  const name = accountName(thread);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-bold text-primary-700 ${sizeClass}`}>
      {thread.facebookAvatarUrl && !imageFailed
        ? <img src={thread.facebookAvatarUrl} alt={`Ảnh đại diện ${name}`} className="size-full object-cover" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        : initials(name)}
    </span>
  );
}

function time(value: { toDate?: () => Date } | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value.toDate?.();
  return date && !Number.isNaN(date.getTime()) ? format(date, "dd/MM HH:mm") : "";
}

function ConnectionBar({ configured, onNewMessage }: { configured: boolean; onNewMessage: () => void }) {
  const pageUrl = messengerPageUrl();
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-xs ${configured ? "border-neutral-100 bg-white text-neutral-600" : "border-warning-100 bg-warning-50 text-warning-800"}`}>
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${configured ? "bg-success-500 animate-pulse" : "bg-warning-500"}`} />
        {configured ? <ChatCircleDots size={16} weight="bold" className="text-primary-700" /> : <WifiSlash size={16} />}
        <b className="text-neutral-900">{configured ? "Messenger đang trực tuyến" : "Messenger chưa cấu hình"}</b>
        <span className="hidden sm:inline">
          {configured ? "Hội thoại cập nhật từ Firestore theo thời gian thực." : "Có thể xem dữ liệu đã lưu nhưng chưa thể gửi tin mới."}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onNewMessage} className="motion-control inline-flex min-h-8 items-center gap-1.5 rounded-input bg-primary-600 px-3 text-xs font-semibold text-white hover:bg-primary-700 active:scale-[.97]">
          <Plus size={14} weight="bold" />Nhắn mới
        </button>
        {!configured && pageUrl && (
          <a href={pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-input border border-warning-300 bg-white px-2.5 py-1 font-semibold text-warning-800 hover:bg-warning-100">
            <ArrowSquareOut size={12} />Mở Trang Facebook để nhắn thủ công
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
        <span className="flex justify-center"><AccountAvatar thread={thread} size="lg" /></span>
        <h3 className="mt-3 font-bold text-neutral-900">{accountName(thread)}</h3>
        <p className="mt-1 text-xs text-neutral-500">Phụ huynh của {thread.studentName}</p>
      </div>
      <dl className="space-y-3 border-t border-neutral-200 pt-4">
        <div><dt className="text-xs font-semibold text-neutral-400">Học sinh</dt><dd className="mt-1 font-semibold">{thread.studentName} · {thread.studentId}</dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Lớp học</dt><dd className="mt-1 font-semibold">{thread.className || "Chưa xếp lớp"}</dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Kết nối</dt><dd className="mt-1"><StatusBadge tone={thread.status === "blocked" ? "danger" : "success"}>{thread.status === "blocked" ? "Đã chặn" : "Đang hoạt động"}</StatusBadge></dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Cửa sổ phản hồi</dt><dd className={`mt-1 flex items-center gap-2 font-semibold ${activeWindow ? "text-success-700" : "text-warning-700"}`}><ClockCounterClockwise size={14} />{activeWindow ? `Đến ${time(thread.responseWindowEndsAt)}` : "Cần kiểm tra chính sách gửi"}</dd></div>
      </dl>
    </div>
  );
}

function ConversationContext({ thread }: { thread: Thread }) {
  const queryClient = useQueryClient();
  const students = useQuery({ queryKey: queryKeys.students(), queryFn: listStudents, enabled: thread.linkStatus === "unlinked" });
  const [studentId, setStudentId] = useState("");
  const link = useMutation({
    mutationFn: async () => {
      if (!thread.messengerPsid || !studentId) throw new Error("Chọn học sinh cần liên kết");
      await linkMessengerConversation(thread.messengerPsid, studentId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-threads"] }),
  });

  if (thread.linkStatus === "unlinked") {
    return (
      <div className="space-y-4">
        <div className="rounded-input border border-warning-200 bg-warning-50 p-3">
          <p className="text-sm font-bold text-warning-900">Chưa liên kết học sinh</p>
          <p className="mt-1 text-xs leading-5 text-warning-700">Tin nhắn đã được lưu. Chọn học sinh để ghép hội thoại này.</p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-neutral-700">Liên kết với học sinh</span>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm">
            <option value="">Chọn học sinh...</option>
            {(students.data ?? []).map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.studentCode}</option>)}
          </select>
        </label>
        <Button type="button" variant="primary" disabled={!studentId || link.isPending} onClick={() => link.mutate()}>
          {link.isPending ? "Đang liên kết..." : "Liên kết học sinh"}
        </Button>
        {link.isError && <p className="text-xs font-semibold text-danger-700">{link.error instanceof Error ? link.error.message : "Liên kết thất bại"}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ThreadInfo thread={thread} />
      <div className="border-t border-neutral-200 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-400">Dashboard học sinh</h4>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-input bg-neutral-50 p-3"><dt className="text-3xs text-neutral-400">Mã học sinh</dt><dd className="mt-1 text-sm font-bold">{thread.studentId}</dd></div>
          <div className="rounded-input bg-neutral-50 p-3"><dt className="text-3xs text-neutral-400">Lớp</dt><dd className="mt-1 text-sm font-bold">{thread.className || "Chưa xếp"}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function ConversationPanel({ thread, configured, onBack }: { thread: Thread; configured: boolean; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageError, setMessageError] = useState<Error | null>(null);
  const [draft, setDraft] = useState("");
  const [tag, setTag] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedThreadId, setCopiedThreadId] = useState(false);
  const queryClient = useQueryClient();

  useEffect(
    () => subscribeChatMessages(thread.id, (items) => { setMessages(items); setMessageError(null); }, setMessageError),
    [thread.id],
  );

  const send = useMutation({
    mutationFn: async (text: string) => {
      const result = await sendMessenger({
        studentId: thread.studentId || undefined,
        recipientPsid: thread.linkStatus === "unlinked" ? thread.messengerPsid : undefined,
        text,
        type: "manual",
        tag: tag.trim() || undefined,
      });
      if (!result.sent) throw new MessengerSendError(result.code);
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
      <section className="flex min-h-0 flex-1 flex-col bg-[#f7f8fa]">
        <header className="flex min-h-[68px] items-center justify-between border-b border-neutral-100 bg-white px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={onBack} className="icon-button flex lg:hidden" aria-label="Quay lại danh sách"><ArrowLeft size={18} /></button>
            <span className="rounded-full ring-4 ring-primary-50"><AccountAvatar thread={thread} /></span>
            <div className="min-w-0"><h2 className="truncate text-sm font-bold">{accountName(thread)}</h2><p className="truncate text-xs text-neutral-500">Tài khoản Facebook</p></div>
          </div>
          <div className="relative flex">
            <button type="button" onClick={() => setInfoOpen(true)} className="icon-button flex xl:hidden" aria-label="Xem thông tin"><Info size={18} /></button>
            <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} className="icon-button flex" aria-label="Thêm thao tác"><DotsThree size={21} weight="bold" /></button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-[12px] border border-neutral-200 bg-white py-1 shadow-[0_16px_40px_-18px_rgba(15,23,42,.35)]">
                <button type="button" onClick={() => { setInfoOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-50"><Info size={16} />Xem thông tin hội thoại</button>
                {messengerPageUrl() && <a href={messengerPageUrl()!} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"><ArrowSquareOut size={16} />Mở Fanpage</a>}
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(thread.id); setCopiedThreadId(true); setMenuOpen(false); window.setTimeout(() => setCopiedThreadId(false), 2000); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-50"><Copy size={16} />{copiedThreadId ? "Đã sao chép" : "Sao chép mã hội thoại"}</button>
              </div>
            )}
          </div>
        </header>
        {!configured && <div className="flex gap-2 border-b border-warning-100 bg-warning-50 px-4 py-3 text-xs text-warning-800"><WifiSlash size={16} />Worker chưa cấu hình. Composer đang bị khóa.</div>}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          <div className="w-full space-y-2">
            {messageError ? <ErrorState message="Không tải được lịch sử hội thoại." /> : messages.length ? messages.map((message) => (
              <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] px-3.5 py-2 text-sm leading-5 sm:max-w-[62%] ${message.direction === "outbound" ? "rounded-[16px] rounded-br-[4px] bg-primary-700 text-white shadow-[0_8px_24px_-16px_rgba(36,71,216,.7)]" : "rounded-[16px] rounded-bl-[4px] border border-neutral-200/80 bg-white text-neutral-800 shadow-[0_8px_24px_-18px_rgba(15,23,42,.35)]"}`}>
                  <p>{message.text}</p>
                  <div className={`mt-1 flex items-center justify-end gap-1 text-3xs ${message.direction === "outbound" ? "text-primary-100" : "text-neutral-400"}`}>
                    <span>{time(message.createdAt)}</span>
                    {message.status === "sent" && <Checks size={12} />}
                    {message.status === "failed" && <Warning size={12} />}
                  </div>
                </div>
              </div>
            )) : <div className="py-16 text-center"><ChatCircleDots className="mx-auto text-neutral-300" size={36} /><p className="mt-3 text-sm font-semibold">Chưa có tin nhắn</p></div>}
          </div>
        </div>
        <form onSubmit={submit} className="border-t border-neutral-100 bg-white px-3 py-2 sm:px-5">
          <div className="w-full">
            <details className="mb-1 text-xs text-neutral-500">
              <summary className="cursor-pointer select-none font-semibold text-neutral-500 hover:text-neutral-800">Tùy chọn gửi ngoài cửa sổ 24 giờ</summary>
              <label className="mt-2 block max-w-xs">
                <span className="mb-1 block text-3xs font-semibold uppercase tracking-wide text-neutral-400">Meta Message Tag</span>
                <input value={tag} onChange={(event) => setTag(event.target.value.toUpperCase())} placeholder="ACCOUNT_UPDATE" disabled={!configured || send.isPending} className="min-h-9 w-full rounded-input border border-neutral-300 bg-neutral-50 px-3 text-xs uppercase outline-none focus:border-primary-500 disabled:bg-neutral-100" />
              </label>
            </details>
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Soạn tin nhắn</span>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (configured && draft.trim() && !tagInvalid && !send.isPending) send.mutate(draft.trim());
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  disabled={!configured || send.isPending}
                  placeholder={configured ? "Nhập tin nhắn..." : "Worker chưa cấu hình"}
                  className="max-h-24 min-h-[42px] w-full resize-none rounded-[12px] border border-neutral-200 bg-white px-3.5 py-2.5 text-sm leading-5 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100"
                />
              </label>
              <button type="submit" disabled={!configured || !draft.trim() || tagInvalid || send.isPending} aria-label="Gửi tin nhắn" className="motion-control flex size-[42px] shrink-0 items-center justify-center rounded-[11px] bg-primary-600 text-white active:scale-[.97] disabled:opacity-40"><PaperPlaneTilt size={18} weight="fill" /></button>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-3xs text-neutral-400">
              <span>Enter để gửi · Shift + Enter để xuống dòng</span>
              <span>{draft.length}/2000</span>
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
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Thông tin hội thoại" size="sm"><ConversationContext thread={thread} /></Modal>
    </>
  );
}

function NewConversationPicker({ open, onClose, configured, onSent }: { open: boolean; onClose: () => void; configured: boolean; onSent: (studentId: string) => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; fullName: string; studentCode: string; parentUids: string[] } | null>(null);
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState<MessageTopic>("lesson_review");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("response");
  const students = useQuery({ queryKey: queryKeys.students(), queryFn: listStudents, enabled: open });
  const queryClient = useQueryClient();

  function reset() {
    setSearch(""); setSelected(null); setDraft(""); setTopic("lesson_review"); setDeliveryMode("response"); send.reset();
  }

  const send = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Chưa chọn học sinh");
      const result = await sendMessenger({
        studentId: selected.id,
        text: draft.trim(),
        type: `manual_${topic}`,
        tag: deliveryMode === "account_update" ? "ACCOUNT_UPDATE" : undefined,
      });
      if (!result.sent) throw new MessengerSendError(result.code);
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

  useEffect(() => {
    if (!open || selected || !students.data?.length) return;
    const student = students.data[0];
    setSelected({ id: student.id, fullName: student.fullName, studentCode: student.studentCode, parentUids: student.parentUids });
  }, [open, selected, students.data]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected && draft.trim() && configured) send.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Nhắn tin mới"
      description="Chọn học sinh và soạn nội dung gửi tới phụ huynh qua Messenger."
      size="lg"
      bodyClassName="min-h-0 overflow-hidden p-0"
    >
      <div className="grid h-[min(680px,calc(100dvh-8.5rem))] min-h-[520px] grid-rows-[240px_minmax(0,1fr)] md:grid-cols-[340px_minmax(0,1fr)] md:grid-rows-1">
        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] border-b border-neutral-200 bg-neutral-50 md:border-b-0 md:border-r" aria-label="Danh sách học sinh">
          <div className="border-b border-neutral-200 p-4">
            <h3 className="mb-2 text-sm font-bold text-neutral-900">Học sinh</h3>
            <label className="relative block">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <span className="sr-only">Tìm học sinh</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc mã học sinh" className="min-h-touch w-full rounded-input border border-neutral-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
            </label>
          </div>
          <div className="min-h-0 overflow-auto p-2">
            {students.isLoading ? <div className="p-3"><LoadingSkeleton rows={6} /></div>
              : students.isError ? <div className="p-3"><ErrorState message="Không tải được danh sách học sinh." onRetry={() => students.refetch()} /></div>
              : filtered.length ? filtered.map((student) => {
                const active = student.id === selected?.id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected({ id: student.id, fullName: student.fullName, studentCode: student.studentCode, parentUids: student.parentUids })}
                    className={`mb-1 flex w-full items-center gap-3 rounded-input px-3 py-2.5 text-left transition last:mb-0 ${active ? "bg-primary-50 shadow-[inset_3px_0_0_rgb(36_71_216)]" : "hover:bg-white"}`}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{initials(student.fullName)}</span>
                    <span className="min-w-0"><b className="block truncate text-sm">{student.fullName}</b><span className="mt-0.5 block truncate text-xs text-neutral-500">{student.studentCode}</span></span>
                  </button>
                );
              }) : <p className="p-5 text-center text-sm text-neutral-500">Không tìm thấy học sinh phù hợp.</p>}
          </div>
        </aside>

        <form onSubmit={submit} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-white">
          <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-input border border-primary-200 bg-primary-50 px-4 py-3">
                  <span className="min-w-0"><b className="block truncate text-sm text-neutral-900">{selected.fullName}</b><span className="mt-0.5 block text-xs text-neutral-500">{selected.studentCode}</span></span>
                  <StatusBadge tone={selected.parentUids.length ? "success" : "warning"}>{selected.parentUids.length ? "Có phụ huynh" : "Chưa liên kết"}</StatusBadge>
                </div>

                <label className="mt-5 block">
                  <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-neutral-700"><span>Chủ đề tin nhắn</span><span className="font-normal text-neutral-400">Bắt buộc</span></span>
                  <select value={topic} onChange={(event) => setTopic(event.target.value as MessageTopic)} disabled={send.isPending} className="min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100">
                    {MESSAGE_TOPICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-neutral-700"><span>Cách gửi</span><span className="font-normal text-neutral-400">Theo chính sách Meta</span></span>
                  <select value={deliveryMode} onChange={(event) => setDeliveryMode(event.target.value as DeliveryMode)} disabled={send.isPending} className="min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100">
                    <option value="response">Phản hồi trong cửa sổ 24 giờ</option>
                    <option value="account_update">Cập nhật tài khoản, dùng ACCOUNT_UPDATE khi phù hợp</option>
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-neutral-700"><span>Nội dung</span><span className="font-normal text-neutral-400">{draft.length} / 2000</span></span>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} maxLength={2000} disabled={send.isPending} placeholder="Nhập nội dung tin nhắn..." className="min-h-[180px] w-full resize-y rounded-input border border-neutral-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100" />
                </label>

                {deliveryMode === "account_update" && <p className="mt-3 rounded-input border-l-4 border-warning-500 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-800">Chỉ dùng ACCOUNT_UPDATE cho nội dung cập nhật tài khoản phù hợp chính sách Meta. Chủ đề tin nhắn là phân loại nội bộ của EduMatrix.</p>}
                {!configured && <p className="mt-3 text-xs font-semibold text-warning-700">Worker chưa cấu hình, chưa thể gửi.</p>}
                {send.isPending && <p className="mt-3 text-xs text-neutral-500">Đang gửi...</p>}
                {send.isError && (
                  <div className="mt-3 space-y-1.5">
                    <p role="alert" className="text-xs font-semibold text-danger-700">Gửi thất bại: {(send.error as Error).message}</p>
                    {send.error instanceof MessengerSendError && send.error.code === "no_recipient" && (
                      !selected.parentUids.length ? (
                        <p className="text-xs text-neutral-500">Học sinh chưa có tài khoản phụ huynh liên kết trong hệ thống.</p>
                      ) : !isMessengerInviteConfigured() ? (
                        <p className="text-xs text-neutral-500">Chưa cấu hình Page Facebook để tạo link mời.</p>
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
              </>
            ) : (
              <div className="flex h-full min-h-60 items-center justify-center text-center"><div><ChatCircleDots className="mx-auto text-neutral-300" size={34} /><p className="mt-3 text-sm font-semibold text-neutral-700">Chọn một học sinh</p><p className="mt-1 text-xs text-neutral-500">Danh sách học sinh nằm ở cột bên trái.</p></div></div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:px-6">
            <span className="hidden text-xs text-neutral-500 sm:block">{selected ? `Đang gửi cho ${selected.fullName}` : "Chưa chọn học sinh"}</span>
            <div className="ml-auto flex gap-2">
              <Button type="button" onClick={() => { reset(); onClose(); }}>Hủy</Button>
              <Button type="submit" variant="primary" icon={<PaperPlaneTilt size={16} weight="fill" />} disabled={!configured || !selected || !draft.trim() || send.isPending}>
                {send.isPending ? "Đang gửi..." : "Gửi tin nhắn"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function Conversations({ threads, configured, initialPickerOpen = false, newMessageSignal }: { threads: Thread[]; configured: boolean; initialPickerOpen?: boolean; newMessageSignal: number }) {
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
    if (newMessageSignal > 0) setPickerOpen(true);
  }, [newMessageSignal]);

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
    () => threads.filter((thread) => `${thread.facebookName ?? ""} ${thread.parentName} ${thread.studentName} ${thread.studentId}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (filter === "all" || thread.unreadStaffCount > 0)),
    [filter, search, threads],
  );
  const selected = threads.find((thread) => thread.id === selectedId);

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_300px]">
      <aside className={`${mobileThreadOpen ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-neutral-200 bg-white`}>
        <div className="border-b border-neutral-100 p-4">
          <div className="mb-2"><h2 className="text-sm font-bold text-neutral-900">Tin nhắn</h2><p className="mt-0.5 text-3xs text-neutral-400">{threads.length} hội thoại</p></div>
          <label className="relative block"><MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><span className="sr-only">Tìm hội thoại</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên tài khoản..." className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-primary-500" /></label>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-input bg-neutral-100 p-1">
            {([["all", "Tất cả"], ["unread", "Chưa đọc"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 rounded-[7px] text-xs font-semibold ${filter === value ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500"}`}>{label}</button>)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!threads.length ? (
            <div className="p-6 text-center"><ChatCircleDots className="mx-auto text-neutral-300" size={32} /><p className="mt-3 text-sm font-semibold">Chưa có hội thoại</p><p className="mt-1 text-xs leading-5 text-neutral-500">Bấm &quot;Nhắn mới&quot; để bắt đầu, hoặc chờ phụ huynh liên kết và nhắn qua Facebook Page.</p></div>
          ) : filtered.map((thread) => (
            <button key={thread.id} type="button" onClick={() => { setSelectedId(thread.id); setMobileThreadOpen(true); }} className={`flex w-full gap-3 border-b border-neutral-100 px-4 py-3 text-left transition active:scale-[.99] ${thread.id === selectedId ? "bg-primary-50 shadow-[inset_3px_0_0_rgb(36,71,216)]" : "hover:bg-neutral-50"}`}>
              <AccountAvatar thread={thread} />
              <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><b className="truncate text-sm">{accountName(thread)}</b><span className="shrink-0 text-3xs text-neutral-400">{time(thread.lastMessageAt)}</span></span><span className="mt-1 block truncate text-xs text-neutral-500">{thread.lastMessagePreview}</span></span>
              {thread.unreadStaffCount > 0 && <span className="mt-8 flex size-5 items-center justify-center rounded-full bg-primary-600 text-3xs font-bold text-white">{thread.unreadStaffCount}</span>}
            </button>
          ))}
        </div>
      </aside>
      <div className={`${mobileThreadOpen ? "flex" : "hidden lg:flex"} min-h-0`}>
        {selected ? <ConversationPanel thread={selected} configured={configured} onBack={() => setMobileThreadOpen(false)} /> : (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-neutral-50 p-6 text-center"><div><ChatCircleDots className="mx-auto text-neutral-300" size={36} /><p className="mt-3 text-sm font-semibold">Chưa có hội thoại Messenger</p><p className="mt-1 max-w-sm text-sm leading-6 text-neutral-500">Bấm &quot;Nhắn mới&quot; để bắt đầu, hoặc hội thoại sẽ xuất hiện khi phụ huynh liên kết và gửi tin qua Facebook Page.</p></div></div>
        )}
      </div>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-neutral-100 bg-white p-5 xl:block">{selected && <ConversationContext thread={selected} />}</aside>
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
  const [newMessageSignal, setNewMessageSignal] = useState(0);
  const threads = useQuery({ queryKey: ["chat-threads", role, uid], queryFn: () => listChatThreads(role, uid), enabled: Boolean(uid) });
  const tabs = [
    { value: "conversations" as const, label: "Hội thoại", icon: ChatCircleDots },
    { value: "outbox" as const, label: "Nhật ký gửi", icon: ClockCounterClockwise },
    ...(role === "admin" ? [{ value: "fanpage" as const, label: "Đăng Fanpage", icon: FacebookLogo }] : []),
  ];

  return (
    <AppShell>
      <div className="flex h-[calc(100dvh-112px)] min-h-[620px] flex-col overflow-hidden rounded-[18px] border border-neutral-200/80 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,.45)]">
        <ConnectionBar configured={configured} onNewMessage={() => { setSection("conversations"); setNewMessageSignal((signal) => signal + 1); }} />
        <Tabs label="Nhánh Chat" className="shrink-0 px-3">
          {tabs.map(({ value, label, icon: Icon }) => <Tab key={value} active={section === value} onClick={() => setSection(value)} className="min-h-[50px]"><Icon size={16} />{label}</Tab>)}
        </Tabs>
        {section === "conversations" && (threads.isLoading ? <div className="p-5"><LoadingSkeleton rows={7} /></div> : threads.isError ? <div className="p-5"><ErrorState message="Không tải được hội thoại." onRetry={() => threads.refetch()} /></div> : <Conversations threads={threads.data ?? []} configured={configured} initialPickerOpen={initialPickerOpen} newMessageSignal={newMessageSignal} />)}
        {section === "outbox" && <Outbox role={role} uid={uid} />}
        {section === "fanpage" && role === "admin" && (
          <FanpagePanel configured={configured} actorUid={uid} actorName={userDoc?.displayName ?? "Admin"} />
        )}
      </div>
    </AppShell>
  );
}
