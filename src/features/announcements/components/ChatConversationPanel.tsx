import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Copy, History, Info, MessageCircle, Send, Settings2, Trash2, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { subscribeChatMessages } from "@/services/firestore/chat";
import { listStudents } from "@/services/firestore/students";
import { createMessengerInviteLink, deleteMessengerConversation, isMessengerInviteConfigured, linkMessengerConversation, MessengerSendError, sendMessenger } from "@/services/integrations/messenger";
import { queryKeys } from "@/hooks/queryKeys";
import type { ChatMessageDoc, ChatTagDoc, ChatThreadDoc } from "@/types/chat";
import type { UserDoc } from "@/types/user";
import { accountName, initials, time } from "@/features/announcements/components/chatWorkspaceUtils";

export type Thread = ChatThreadDoc & { id: string };
type Message = ChatMessageDoc & { id: string };
export type ChatTag = ChatTagDoc & { id: string };

const TAG_PATTERN = /^[A-Z_]{3,64}$/;
const CHAT_TAG_COLORS = [
  { value: "red", swatch: "bg-[#ef3340]" },
  { value: "pink", swatch: "bg-[#e83eae]" },
  { value: "amber", swatch: "bg-[#f59e0b]" },
  { value: "green", swatch: "bg-[#16a34a]" },
  { value: "blue", swatch: "bg-[#3569e8]" },
] as const;
const CHAT_TAG_STYLES = {
  red: "bg-[#ef3340] text-white",
  pink: "bg-[#e83eae] text-white",
  amber: "bg-[#f59e0b] text-neutral-900",
  green: "bg-[#16a34a] text-white",
  blue: "bg-[#3569e8] text-white",
} as const;
export function AccountAvatar({ thread, size = "md" }: { thread: Thread; size?: "sm" | "md" | "lg" }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [thread.facebookAvatarUrl]);
  const sizeClass = size === "lg" ? "size-16 text-base" : size === "sm" ? "size-7 text-4xs" : "size-10 text-xs";
  const name = accountName(thread);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-bold text-primary-700 ${sizeClass}`}>
      {thread.facebookAvatarUrl && !imageFailed
        ? <img src={thread.facebookAvatarUrl} alt={`Ảnh đại diện ${name}`} className="size-full object-cover" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        : initials(name)}
    </span>
  );
}

export function CopyInviteLinkButton({ parentUid, studentId, label }: { parentUid: string; studentId: string; label: string }) {
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
        className="inline-flex items-center gap-1.5 rounded-input border border-neutral-300 bg-neutral-0 px-2.5 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
      >
        <Copy size={13} />{pending ? "Đang tạo link..." : copied ? "Đã copy link" : label}
      </button>
      {error && <span role="alert" className="text-xs text-danger-700">{error}</span>}
    </span>
  );
}

export type ParentProfile = (UserDoc & { uid: string }) | undefined;

function ThreadInfo({ thread, parent }: { thread: Thread; parent: ParentProfile }) {
  const windowEnd = thread.responseWindowEndsAt?.toDate?.();
  const activeWindow = Boolean(windowEnd && windowEnd.getTime() > Date.now());
  return (
    <div className="text-sm">
      <div className="text-center">
        <span className="flex justify-center"><AccountAvatar thread={thread} size="lg" /></span>
        <h3 className="mt-3 truncate text-base font-semibold leading-6 text-neutral-900">{accountName(thread)}</h3>
      </div>
      <section className="mt-6 border-t border-neutral-200 pt-4">
        <h4 className="text-sm font-semibold text-neutral-900">Thông tin phụ huynh</h4>
        <dl className="mt-3 space-y-3">
          <div><dt className="text-xs font-medium text-neutral-500">Số điện thoại</dt><dd className="mt-1 font-semibold leading-5 text-neutral-800">{parent?.phone || "Chưa cập nhật"}</dd></div>
          <div><dt className="text-xs font-medium text-neutral-500">Email</dt><dd className="mt-1 break-all font-semibold leading-5 text-neutral-800">{parent?.email || "Chưa cập nhật"}</dd></div>
        </dl>
      </section>
      <section className="mt-5 border-t border-neutral-200 pt-4">
        <h4 className="text-sm font-semibold text-neutral-900">Học sinh đã đăng ký</h4>
        <dl className="mt-3 space-y-3">
          <div><dt className="text-xs font-medium text-neutral-500">Tên con</dt><dd className="mt-1 font-semibold leading-5 text-neutral-800">{thread.studentName}</dd></div>
          <div><dt className="text-xs font-medium text-neutral-500">Mã học sinh</dt><dd className="mt-1 font-semibold leading-5 text-neutral-800">{thread.studentId}</dd></div>
          <div><dt className="text-xs font-medium text-neutral-500">Lớp học</dt><dd className="mt-1 font-semibold leading-5 text-neutral-800">{thread.className || "Chưa xếp lớp"}</dd></div>
        </dl>
      </section>
      <section className="mt-5 border-t border-neutral-200 pt-4">
        <h4 className="text-sm font-semibold text-neutral-900">Kết nối</h4>
        <dl className="mt-3 space-y-3">
          <div><dt className="text-xs font-medium text-neutral-500">Messenger</dt><dd className="mt-1.5"><StatusBadge tone={thread.status === "blocked" ? "danger" : "success"}>{thread.status === "blocked" ? "Đã chặn" : "Đã liên kết"}</StatusBadge></dd></div>
          <div><dt className="text-xs font-medium text-neutral-500">Cửa sổ phản hồi</dt><dd className={`mt-1 flex items-center gap-2 font-semibold ${activeWindow ? "text-success-700" : "text-warning-700"}`}><History size={14} />{activeWindow ? `Đến ${time(thread.responseWindowEndsAt)}` : "Cần kiểm tra chính sách gửi"}</dd></div>
        </dl>
      </section>
    </div>
  );
}

export function ConversationContext({ thread, parent, tags, onRemoveTag, onManageTags }: { thread: Thread; parent: ParentProfile; tags: ChatTag[]; onRemoveTag: (tagId: string) => void; onManageTags?: () => void }) {
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
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-0 px-3 text-sm">
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
    <div>
      <ThreadInfo thread={thread} parent={parent} />
      <div className="mt-5 border-t border-neutral-200 pt-4">
        <h4 className="text-sm font-semibold text-neutral-900">Tag hội thoại</h4>
        {tags.length ? <div className="mt-3 flex flex-wrap gap-1.5">{tags.map((tag) => <button key={tag.id} type="button" onClick={() => onRemoveTag(tag.id)} aria-label={`Bỏ tag ${tag.label}`} className={`flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-opacity hover:opacity-85 ${CHAT_TAG_STYLES[tag.color]}`}>{tag.label}<X size={12} aria-hidden="true" /></button>)}</div> : <p className="mt-2 text-xs leading-5 text-neutral-500">Chưa có tag.</p>}
        <p className="mt-2 text-xs leading-5 text-neutral-500">Gắn tag nhanh tại thanh phía trên ô nhập tin nhắn.</p>
        {onManageTags && <button type="button" onClick={onManageTags} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-card border border-neutral-300 bg-neutral-0 px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-[.99]"><Settings2 size={15} />Quản lý tag mẫu</button>}
      </div>
    </div>
  );
}

export function ConversationPanel({ thread, parent, configured, tagCatalog, assignedTags, tagUpdatePending, canDelete = false, onBack, onToggleTag, onManageTags }: { thread: Thread; parent: ParentProfile; configured: boolean; tagCatalog: ChatTag[]; assignedTags: ChatTag[]; tagUpdatePending: boolean; canDelete?: boolean; onBack: () => void; onToggleTag: (tag: ChatTag) => void; onManageTags?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageError, setMessageError] = useState<Error | null>(null);
  const [draft, setDraft] = useState("");
  const [tag, setTag] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const responseWindowEnd = thread.responseWindowEndsAt?.toDate?.();
  const responseWindowActive = Boolean(responseWindowEnd && responseWindowEnd.getTime() > Date.now());

  const removeConversation = useMutation({
    mutationFn: () => deleteMessengerConversation(thread.id),
    onSuccess: () => {
      setDeleteOpen(false);
      queryClient.setQueriesData<Thread[]>({ queryKey: ["chat-threads"] }, (current) => current?.filter((item) => item.id !== thread.id));
      onBack();
    },
  });

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
  const deliveryAllowed = responseWindowActive || (tag.trim() !== "" && !tagInvalid);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() && configured && !tagInvalid && deliveryAllowed) send.mutate(draft.trim());
  };
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (configured && draft.trim() && !tagInvalid && deliveryAllowed && !send.isPending) send.mutate(draft.trim());
  };

  return (
    <>
      <section className="flex min-h-0 min-w-0 w-full flex-col bg-neutral-0" aria-label={`Hội thoại với ${accountName(thread)}`}>
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-0 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onBack} className="icon-button flex lg:hidden" aria-label="Quay lại danh sách"><ArrowLeft size={18} /></button>
            <AccountAvatar thread={thread} />
            <h2 className="truncate text-base font-semibold leading-6 text-neutral-900">{accountName(thread)}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge tone={thread.status === "blocked" ? "danger" : "success"}>{thread.status === "blocked" ? "Đã chặn" : "Đã kết nối"}</StatusBadge>
            {canDelete && <button type="button" onClick={() => { removeConversation.reset(); setDeleteOpen(true); }} className="flex min-h-9 items-center gap-1.5 rounded-input border border-danger-200 bg-neutral-0 px-2.5 text-xs font-semibold text-danger-700 transition-colors hover:bg-danger-50 active:scale-[.98]" aria-label="Xóa cuộc hội thoại"><Trash2 size={15} /><span className="hidden sm:inline">Xóa</span></button>}
            <button type="button" onClick={() => setInfoOpen(true)} className="icon-button flex xl:hidden" aria-label="Xem thông tin"><Info size={18} /></button>
          </div>
        </header>
        {!configured && <div className="flex gap-2 border-b border-warning-100 bg-warning-50 px-4 py-3 text-xs text-warning-800"><WifiOff size={16} />Worker chưa cấu hình. Composer đang bị khóa.</div>}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="w-full">
            <p className="mb-4 text-center text-xs font-medium text-neutral-400">Hôm nay</p>
            {messageError ? <ErrorState message="Không tải được lịch sử hội thoại." /> : messages.length ? messages.map((message, index) => {
              const inbound = message.direction === "inbound";
              const groupedWithPrevious = messages[index - 1]?.direction === message.direction;
              const showAvatar = inbound && messages[index + 1]?.direction !== "inbound";
              return (
                <div key={message.id} className={`${index === 0 ? "" : groupedWithPrevious ? "mt-0.5" : "mt-3"} flex items-end ${inbound ? "justify-start gap-2" : "justify-end"}`}>
                  {inbound && <span aria-hidden={!showAvatar} className={showAvatar ? "" : "invisible"}><AccountAvatar thread={thread} size="sm" /></span>}
                  <div className={`flex min-w-0 max-w-[80%] flex-col sm:max-w-[70%] ${inbound ? "items-start" : "items-end"}`}>
                    <div title={`Gửi lúc ${time(message.createdAt)}`} className={`break-words rounded-[18px] px-3.5 py-2.5 text-sm leading-5 ${inbound ? "bg-neutral-100 text-neutral-800" : "bg-primary-600 text-white"}`}>
                      <p>{message.text}</p>
                      <span className="sr-only">Gửi lúc {time(message.createdAt)}</span>
                    </div>
                    {message.status === "failed" && <span className="mt-1 flex items-center gap-1 text-2xs text-danger-700"><AlertTriangle size={12} />Gửi thất bại</span>}
                  </div>
                </div>
              );
            }) : <div className="py-20 text-center"><MessageCircle className="mx-auto text-neutral-300" size={38} /><p className="mt-4 text-sm font-semibold text-neutral-700">Chưa có tin nhắn</p><p className="mt-1 text-xs leading-5 text-neutral-500">Hãy bắt đầu cuộc trò chuyện với phụ huynh.</p></div>}
          </div>
        </div>
        {(!!tagCatalog.length || onManageTags) && (
          <div className="shrink-0 border-t border-neutral-100 bg-neutral-0 px-3 pt-2 sm:px-4" aria-label="Tag mẫu trên Composer">
            <div className="flex w-full items-center gap-2">
              <div className="min-w-0 flex-1 overflow-x-auto pb-0.5" aria-label="Danh sách tag mẫu">
                <div className="flex w-max items-center gap-1.5">
                  {tagCatalog.map((conversationTag) => {
                    const selected = assignedTags.some((item) => item.id === conversationTag.id);
                    const swatch = CHAT_TAG_COLORS.find((item) => item.value === conversationTag.color)?.swatch;
                    return <button key={conversationTag.id} type="button" onClick={() => onToggleTag(conversationTag)} disabled={tagUpdatePending} aria-pressed={selected} aria-label={`${selected ? "Bỏ" : "Gắn"} tag ${conversationTag.label}`} className={`flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition active:scale-[.97] disabled:opacity-50 ${selected ? `${CHAT_TAG_STYLES[conversationTag.color]} border-transparent` : "border-neutral-300 bg-neutral-0 text-neutral-600 hover:bg-neutral-50"}`}>{!selected && <span className={`size-2 rounded-full ${swatch}`} />}{conversationTag.label}</button>;
                  })}
                </div>
              </div>
              {onManageTags && <button type="button" onClick={onManageTags} aria-label="Quản lý tag mẫu" title="Quản lý tag mẫu" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-0 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-800 active:scale-[.97]"><Settings2 size={14} /></button>}
            </div>
          </div>
        )}
        <form onSubmit={submit} aria-label="Trình soạn tin nhắn" className="shrink-0 bg-neutral-0 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          <div className="w-full">
            {!responseWindowActive && (
              <p className="mb-2 rounded-input border-l-4 border-warning-500 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-800">
                Cửa sổ phản hồi 24 giờ đã hết. Chỉ gửi bằng Message Tag đúng mục đích; Utility sẽ mở sau khi Meta phê duyệt.
              </p>
            )}
            <details className="mb-1 text-xs text-neutral-500">
              <summary className="cursor-pointer select-none font-semibold text-neutral-500 hover:text-neutral-800">Tùy chọn gửi ngoài cửa sổ 24 giờ</summary>
              <label className="mt-2 block max-w-xs">
                <span className="mb-1 block text-3xs font-semibold uppercase tracking-wide text-neutral-400">Meta Message Tag</span>
                <input value={tag} onChange={(event) => setTag(event.target.value.toUpperCase())} placeholder="ACCOUNT_UPDATE" disabled={!configured || send.isPending} className="min-h-9 w-full rounded-input border border-neutral-300 bg-neutral-50 px-3 text-xs uppercase outline-none focus:border-primary-500 disabled:bg-neutral-100" />
              </label>
            </details>
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1 rounded-[20px] bg-neutral-100 px-4">
                <span className="sr-only">Soạn tin nhắn</span>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  aria-describedby="chat-composer-help"
                  rows={1}
                  maxLength={2000}
                  disabled={!configured || send.isPending || !deliveryAllowed}
                  placeholder={!configured ? "Chưa thể gửi tin nhắn" : responseWindowActive ? "Aa" : tag.trim() ? "Nhập nội dung đúng với Message Tag" : "Chọn Message Tag để gửi"}
                  className="max-h-28 min-h-11 w-full resize-none overflow-y-auto bg-transparent py-2.5 text-sm leading-6 text-neutral-800 outline-none [field-sizing:content] placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed"
                />
              </label>
              <button type="submit" disabled={!configured || !draft.trim() || tagInvalid || !deliveryAllowed || send.isPending} aria-label="Gửi tin nhắn" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-transparent text-primary-600 transition-colors hover:bg-primary-50 active:scale-[.97] disabled:cursor-not-allowed disabled:text-neutral-300"><Send size={20} /></button>
            </div>
            <span id="chat-composer-help" className="sr-only">Nhấn Enter để gửi. Nhấn Shift và Enter để xuống dòng.</span>
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
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Thông tin hội thoại" size="sm"><ConversationContext thread={thread} parent={parent} tags={assignedTags} onRemoveTag={(tagId) => { const tagToRemove = assignedTags.find((item) => item.id === tagId); if (tagToRemove) onToggleTag(tagToRemove); }} onManageTags={onManageTags} /></Modal>
      <Modal open={deleteOpen} onClose={() => { if (!removeConversation.isPending) setDeleteOpen(false); }} title="Xóa cuộc hội thoại" description="Hành động này không thể hoàn tác." size="sm">
        <p className="text-sm leading-6 text-neutral-700">Toàn bộ tin nhắn trong hội thoại với <b>{accountName(thread)}</b> sẽ bị xóa. Kết nối Messenger vẫn được giữ để tin nhắn mới có thể tạo lại hội thoại.</p>
        {removeConversation.isError && <p role="alert" className="mt-3 text-sm font-semibold text-danger-700">{removeConversation.error instanceof Error ? removeConversation.error.message : "Không xóa được hội thoại."}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" onClick={() => setDeleteOpen(false)} disabled={removeConversation.isPending}>Hủy</Button>
          <Button type="button" variant="danger" icon={<Trash2 size={16} />} loading={removeConversation.isPending} loadingLabel="Đang xóa hội thoại" onClick={() => removeConversation.mutate()}>Xóa hội thoại</Button>
        </div>
      </Modal>
    </>
  );
}
