import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, MessageCircle, Plus, Search,
  Send, Star, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createChatTag, deleteChatTag, listChatTags, listMessageOutbox, markChatThreadRead, setChatThreadTags } from "@/services/firestore/chat";
import { listStudents } from "@/services/firestore/students";
import { listUsersByIds } from "@/services/firestore/users";
import { isMessengerInviteConfigured, MessengerSendError, sendMessenger, type UtilityTemplateKey } from "@/services/integrations/messenger";
import { UTILITY_TEMPLATES, utilityParameterField } from "@/constants/utilityTemplates";
import { queryKeys } from "@/hooks/queryKeys";
import type { ChatTagColor, ChatTagDoc, ChatThreadDoc } from "@/types/chat";
import {
  AccountAvatar,
  CopyInviteLinkButton,
  ConversationContext,
  ConversationPanel,
} from "@/features/announcements/components/ChatConversationPanel";
import { accountName, initials, time } from "@/features/announcements/components/chatWorkspaceUtils";

type Thread = ChatThreadDoc & { id: string };
type ChatTag = ChatTagDoc & { id: string };
type MessageTopic = "lesson_review" | "course_review" | "general_notice" | "tuition_reminder";
type DeliveryMode = "response" | "account_update" | "utility";
type StaffRole = "admin" | "teacher";
type ConversationFilter = "all" | "unread" | "attention";
const CHAT_TAG_COLORS: Array<{ value: ChatTagColor; label: string; swatch: string }> = [
  { value: "red", label: "đỏ", swatch: "bg-[#ef3340]" },
  { value: "pink", label: "hồng", swatch: "bg-[#e83eae]" },
  { value: "amber", label: "cam", swatch: "bg-[#f59e0b]" },
  { value: "green", label: "xanh lá", swatch: "bg-[#16a34a]" },
  { value: "blue", label: "xanh dương", swatch: "bg-[#3569e8]" },
];
const CHAT_TAG_STYLES: Record<ChatTagColor, string> = {
  red: "bg-[#ef3340] text-white", pink: "bg-[#e83eae] text-white", amber: "bg-[#f59e0b] text-neutral-900", green: "bg-[#16a34a] text-white", blue: "bg-[#3569e8] text-white",
};
const utilityMessagingEnabled = () => import.meta.env.VITE_UTILITY_MESSAGING_ENABLED === "true";
const MESSAGE_TOPICS: Array<{ value: MessageTopic; label: string }> = [
  { value: "lesson_review", label: "Đánh giá buổi học" },
  { value: "course_review", label: "Đánh giá khóa học" },
  { value: "general_notice", label: "Thông báo tổng" },
  { value: "tuition_reminder", label: "Nhắc học phí" },
];
export function UtilityTemplatesModal({ open, onClose, role }: { open: boolean; onClose: () => void; role: StaffRole }) {
  const enabled = utilityMessagingEnabled();
  const templates = useMemo(
    () => UTILITY_TEMPLATES.filter((template) => role === "admin" || template.teacherAllowed),
    [role],
  );
  const [selectedKey, setSelectedKey] = useState<string>(templates[0]?.key ?? "");
  const selected = templates.find((template) => template.key === selectedKey) ?? templates[0];

  return (
    <Modal open={open} onClose={onClose} title="Mẫu thông báo tiện ích" description="Danh mục gửi ngoài cửa sổ phản hồi 24 giờ, theo chính sách Meta." size="lg">
      <div className="grid min-h-[430px] gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-1 rounded-card bg-neutral-50 p-2" aria-label="Danh sách mẫu tiện ích">
          {templates.map(({ key, label, description, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setSelectedKey(key)} aria-pressed={selected?.key === key} className={`flex w-full gap-3 rounded-input px-3 py-3 text-left transition ${selected?.key === key ? "bg-neutral-0 text-primary-700 shadow-sm ring-1 ring-primary-100" : "text-neutral-600 hover:bg-neutral-0"}`}>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-input ${selected?.key === key ? "bg-primary-50" : "bg-neutral-100"}`}><Icon size={17} /></span>
              <span className="min-w-0"><b className="block text-sm text-neutral-900">{label}</b><span className="mt-1 block text-xs leading-5">{description}</span></span>
            </button>
          ))}
        </aside>
        {selected && (
          <section className="flex min-w-0 flex-col rounded-card border border-neutral-200 bg-neutral-0 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold text-primary-700">UTILITY TEMPLATE</p><h3 className="mt-1 text-lg font-bold text-neutral-900">{selected.label}</h3><p className="mt-1 font-mono text-xs text-neutral-400">{selected.key}</p></div>
              <StatusBadge tone={enabled ? "success" : "warning"}>{enabled ? "Đã kích hoạt" : "Chờ Meta phê duyệt"}</StatusBadge>
            </div>
            <div className={`mt-5 rounded-input border p-4 text-sm leading-6 ${enabled ? "border-primary-200 bg-primary-50 text-primary-700" : "border-warning-200 bg-warning-50 text-warning-900"}`}>
              <b>{enabled ? "Gửi từ màn hình \"Nhắn mới\"." : "Chưa thể gửi trên production."}</b>
              <p className="mt-1">{enabled ? "Chọn học sinh, đổi Cách gửi thành Mẫu tiện ích rồi điền các giá trị của mẫu." : "Meta đang xét duyệt quyền Utility Messaging. Hệ thống sẽ chỉ mở gửi sau khi quyền và mẫu được phê duyệt."}</p>
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-input bg-neutral-50 p-3"><dt className="text-xs text-neutral-400">Đối tượng sử dụng</dt><dd className="mt-1 text-sm font-semibold text-neutral-800">{selected.teacherAllowed ? "Admin và Giáo viên" : "Chỉ Admin / Hệ thống"}</dd></div>
              <div className="rounded-input bg-neutral-50 p-3"><dt className="text-xs text-neutral-400">Ngôn ngữ</dt><dd className="mt-1 text-sm font-semibold text-neutral-800">Tiếng Việt</dd></div>
            </dl>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-200 pt-5">
              <Button type="button" variant="primary" disabled icon={<Send size={15} />}>Gửi mẫu</Button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

function ConversationTagManager({ open, tags, onClose, onCreate, onDelete }: { open: boolean; tags: ChatTag[]; onClose: () => void; onCreate: (label: string, color: ChatTagColor) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<ChatTagColor>("blue");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = tags.filter((tag) => tag.label.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const nextLabel = label.trim();
    if (!nextLabel || pending) return;
    if (tags.some((tag) => tag.label.toLocaleLowerCase("vi") === nextLabel.toLocaleLowerCase("vi"))) {
      setError("Tên tag đã tồn tại.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onCreate(nextLabel, color);
      setLabel("");
      setCreating(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tạo được tag.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Modal open={open && !creating} onClose={onClose} title="Quản lý tag hội thoại" size="md">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><span className="sr-only">Tìm tag mẫu</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tag mẫu" className="min-h-11 w-full rounded-input border border-neutral-300 bg-neutral-0 pl-10 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /></label>
          <button type="button" onClick={() => setCreating(true)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-input bg-primary-600 px-3.5 text-sm font-semibold text-white transition hover:bg-primary-700 active:scale-[.98]"><Plus size={17} />Thêm tag</button>
        </div>
        <div className="mt-4 overflow-hidden rounded-card border border-neutral-200">
          <div className="grid grid-cols-[minmax(0,1fr)_56px] bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-600"><span>Tag hội thoại</span><span className="text-center">Xóa</span></div>
          {filtered.length ? <div className="divide-y divide-neutral-200">{filtered.map((tag) => <div key={tag.id} className="grid min-h-12 grid-cols-[minmax(0,1fr)_56px] items-center px-4 py-2"><span className="flex items-center gap-2 text-sm font-medium text-neutral-700"><span className={`size-2 rounded-full ${CHAT_TAG_COLORS.find((item) => item.value === tag.color)?.swatch}`} />{tag.label}</span><button type="button" onClick={async () => { setPending(true); setError(null); try { await onDelete(tag.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không xóa được tag."); } finally { setPending(false); } }} disabled={pending} aria-label={`Xóa tag mẫu ${tag.label}`} className="mx-auto flex size-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-40"><Trash2 size={16} /></button></div>)}</div> : <p className="px-4 py-8 text-center text-sm text-neutral-500">Không tìm thấy tag phù hợp.</p>}
        </div>
        {error && <p role="alert" className="mt-3 text-xs font-semibold text-danger-700">{error}</p>}
      </Modal>
      <Modal open={open && creating} onClose={() => { setCreating(false); setError(null); }} title="Thêm tag mẫu" size="sm">
        <form onSubmit={save}>
          <label className="block text-sm font-medium text-neutral-700">Tên tag<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={24} autoFocus placeholder="Nhập tên tag" className="mt-2 min-h-11 w-full rounded-input border border-neutral-300 bg-neutral-0 px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /></label>
          <fieldset className="mt-5"><legend className="text-sm font-medium text-neutral-700">Màu tag</legend><div className="mt-2 flex gap-1">{CHAT_TAG_COLORS.map((item) => <button key={item.value} type="button" onClick={() => setColor(item.value)} aria-label={`Chọn màu ${item.label}`} aria-pressed={color === item.value} className={`flex size-10 items-center justify-center rounded-input transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${color === item.value ? "bg-neutral-100 ring-1 ring-neutral-300" : "hover:bg-neutral-100"}`}><span className={`size-6 rounded-md ${item.swatch}`} /></button>)}</div></fieldset>
          <div className="mt-5 border-t border-neutral-200 pt-4"><span className="text-xs font-medium text-neutral-500">Xem trước</span><div className="mt-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${CHAT_TAG_STYLES[color]}`}>{label.trim() || "Tên tag"}</span></div></div>
          {error && <p role="alert" className="mt-3 text-xs font-semibold text-danger-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => { setCreating(false); setError(null); }} className="min-h-10 rounded-input border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Hủy</button><button type="submit" disabled={!label.trim() || pending} className="min-h-10 rounded-input bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 active:scale-[.98] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400">{pending ? "Đang lưu..." : "Lưu tag"}</button></div>
        </form>
      </Modal>
    </>
  );
}

/** Nut copy 1 link vao clipboard, doi label sang "Da copy" tam thoi de xac nhan - dung chung cho link moi lien ket Messenger. */
function NewConversationPicker({ open, onClose, configured, onSent }: { open: boolean; onClose: () => void; configured: boolean; onSent: (studentId: string) => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; fullName: string; studentCode: string; parentUids: string[] } | null>(null);
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState<MessageTopic>("lesson_review");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("response");
  const [templateKey, setTemplateKey] = useState<UtilityTemplateKey>(UTILITY_TEMPLATES[0].key);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const students = useQuery({ queryKey: queryKeys.students(), queryFn: listStudents, enabled: open });
  const queryClient = useQueryClient();
  const utilityEnabled = utilityMessagingEnabled();

  const template = UTILITY_TEMPLATES.find((item) => item.key === templateKey) ?? UTILITY_TEMPLATES[0];
  const isUtility = deliveryMode === "utility";
  // Worker doi du va dung thu tu tham so; thieu mot o la tra utility_parameters_invalid.
  const missingParameters = template.parameterKeys.filter((key) => !parameters[key]?.trim());

  function reset() {
    setSearch(""); setSelected(null); setDraft(""); setTopic("lesson_review"); setDeliveryMode("response");
    setTemplateKey(UTILITY_TEMPLATES[0].key); setParameters({}); send.reset();
  }

  const send = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Chưa chọn học sinh");
      const result = await sendMessenger(isUtility
        ? {
          studentId: selected.id,
          type: `manual_${topic}`,
          deliveryMode: "utility",
          templateKey,
          parameters: Object.fromEntries(template.parameterKeys.map((key) => [key, parameters[key].trim()])),
        }
        : {
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

  // Che do utility khong co o nhap noi dung, dieu kien du la moi tham so cua mau.
  const readyToSend = !!selected && configured && (isUtility ? utilityEnabled && !missingParameters.length : !!draft.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (readyToSend) send.mutate();
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <span className="sr-only">Tìm học sinh</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc mã học sinh" className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-0 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
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
                    className={`mb-1 flex w-full items-center gap-3 rounded-input px-3 py-2.5 text-left transition last:mb-0 ${active ? "bg-primary-50 shadow-[inset_3px_0_0_rgb(36_71_216)]" : "hover:bg-neutral-0"}`}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{initials(student.fullName)}</span>
                    <span className="min-w-0"><b className="block truncate text-sm">{student.fullName}</b><span className="mt-0.5 block truncate text-xs text-neutral-500">{student.studentCode}</span></span>
                  </button>
                );
              }) : <p className="p-5 text-center text-sm text-neutral-500">Không tìm thấy học sinh phù hợp.</p>}
          </div>
        </aside>

        <form onSubmit={submit} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-neutral-0">
          <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-input border border-primary-200 bg-primary-50 px-4 py-3">
                  <span className="min-w-0"><b className="block truncate text-sm text-neutral-900">{selected.fullName}</b><span className="mt-0.5 block text-xs text-neutral-500">{selected.studentCode}</span></span>
                  <StatusBadge tone={selected.parentUids.length ? "success" : "warning"}>{selected.parentUids.length ? "Có phụ huynh" : "Chưa liên kết"}</StatusBadge>
                </div>

                <label className="mt-5 block">
                  <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-neutral-700"><span>Chủ đề tin nhắn</span><span className="font-normal text-neutral-400">Bắt buộc</span></span>
                  <select value={topic} onChange={(event) => setTopic(event.target.value as MessageTopic)} disabled={send.isPending} className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-0 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100">
                    {MESSAGE_TOPICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-neutral-700"><span>Cách gửi</span><span className="font-normal text-neutral-400">Theo chính sách Meta</span></span>
                  <select value={deliveryMode} onChange={(event) => setDeliveryMode(event.target.value as DeliveryMode)} disabled={send.isPending} className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-0 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100">
                    <option value="response">Phản hồi trong cửa sổ 24 giờ</option>
                    <option value="account_update">Cập nhật tài khoản, dùng ACCOUNT_UPDATE khi phù hợp</option>
                    <option value="utility" disabled={!utilityEnabled}>Mẫu tiện ích, gửi được ngoài cửa sổ 24 giờ{utilityEnabled ? "" : " (chờ Meta duyệt)"}</option>
                  </select>
                </label>

                {isUtility ? (
                  <>
                    <label className="mt-4 block">
                      <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-neutral-700"><span>Mẫu tiện ích</span><span className="font-normal text-neutral-400">Đã đăng ký với Meta</span></span>
                      <select value={templateKey} onChange={(event) => { setTemplateKey(event.target.value as UtilityTemplateKey); setParameters({}); }} disabled={send.isPending} className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-0 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100">
                        {UTILITY_TEMPLATES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                      </select>
                    </label>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {template.parameterKeys.map((key) => {
                        const field = utilityParameterField(key);
                        return (
                          <label key={key} className="block">
                            <span className="mb-1.5 block text-xs font-bold text-neutral-700">{field.label}</span>
                            <input
                              type={field.type}
                              value={parameters[key] ?? ""}
                              onChange={(event) => setParameters((current) => ({ ...current, [key]: event.target.value }))}
                              disabled={send.isPending}
                              className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-0 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100"
                            />
                          </label>
                        );
                      })}
                    </div>

                    <p className="mt-3 rounded-input border-l-4 border-primary-500 bg-primary-50 px-3 py-2 text-xs leading-5 text-primary-700">
                      Nội dung tin do mẫu đã được Meta phê duyệt quyết định, hệ thống chỉ điền các giá trị ở trên vào chỗ trống. Không sửa được câu chữ ở đây.
                    </p>
                    {!template.teacherAllowed && (
                      <p className="mt-2 rounded-input border-l-4 border-warning-500 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-800">
                        Mẫu này chỉ Admin được gửi. Worker sẽ từ chối nếu tài khoản là Giáo viên.
                      </p>
                    )}
                  </>
                ) : (
                  <label className="mt-4 block">
                    <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-neutral-700"><span>Nội dung</span><span className="font-normal text-neutral-400">{draft.length} / 2000</span></span>
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} maxLength={2000} disabled={send.isPending} placeholder="Nhập nội dung tin nhắn..." className="min-h-[180px] w-full resize-y rounded-input border border-neutral-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100" />
                  </label>
                )}

                {deliveryMode === "account_update" && <p className="mt-3 rounded-input border-l-4 border-warning-500 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-800">Chỉ dùng cho thông báo cập nhật tài khoản theo chính sách Meta.</p>}
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
              <div className="flex h-full min-h-60 items-center justify-center text-center"><div><MessageCircle className="mx-auto text-neutral-300" size={34} /><p className="mt-3 text-sm font-semibold text-neutral-700">Chọn một học sinh</p></div></div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:px-6">
            <span className="hidden text-xs text-neutral-500 sm:block">{selected ? `Đang gửi cho ${selected.fullName}` : "Chưa chọn học sinh"}</span>
            <div className="ml-auto flex gap-2">
              <Button type="button" onClick={() => { reset(); onClose(); }}>Hủy</Button>
              <Button type="submit" variant="primary" icon={<Send size={16} />} disabled={!readyToSend || send.isPending}>
                {send.isPending ? "Đang gửi..." : "Gửi tin nhắn"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function Conversations({ threads, configured, initialPickerOpen = false, role, uid, onOpenTemplates }: { threads: Thread[]; configured: boolean; initialPickerOpen?: boolean; role: StaffRole; uid: string; onOpenTemplates: () => void }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? "");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [pickerOpen, setPickerOpen] = useState(initialPickerOpen);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const tagsQuery = useQuery({ queryKey: queryKeys.chatTags(), queryFn: listChatTags });
  const parentIds = useMemo(() => [...new Set(threads.map((thread) => thread.parentUid).filter(Boolean))].sort(), [threads]);
  const parentsQuery = useQuery({ queryKey: ["chat-parent-profiles", parentIds], queryFn: () => listUsersByIds(parentIds), enabled: parentIds.length > 0 });
  const threadQueryKey = ["chat-threads", role, uid] as const;
  const assignTags = useMutation({
    mutationFn: ({ threadId, tagIds }: { threadId: string; tagIds: string[] }) => setChatThreadTags(threadId, tagIds),
    onMutate: async ({ threadId, tagIds }) => {
      await queryClient.cancelQueries({ queryKey: threadQueryKey });
      const previous = queryClient.getQueryData<Thread[]>(threadQueryKey);
      queryClient.setQueryData<Thread[]>(threadQueryKey, (current) => current?.map((thread) => thread.id === threadId ? { ...thread, tagIds } : thread));
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(threadQueryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: threadQueryKey }),
  });
  const markRead = useMutation({
    mutationFn: (threadId: string) => markChatThreadRead(threadId),
    onMutate: async (threadId) => {
      await queryClient.cancelQueries({ queryKey: threadQueryKey });
      const previous = queryClient.getQueryData<Thread[]>(threadQueryKey);
      queryClient.setQueryData<Thread[]>(threadQueryKey, (current) => current?.map((thread) => thread.id === threadId ? { ...thread, unreadStaffCount: 0 } : thread));
      return { previous };
    },
    onError: (_error, _threadId, context) => queryClient.setQueryData(threadQueryKey, context?.previous),
  });
  const createTag = useMutation({ mutationFn: ({ label, color }: { label: string; color: ChatTagColor }) => createChatTag(label, color, uid), onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chatTags() }) });
  const removeCatalogTag = useMutation({ mutationFn: deleteChatTag, onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chatTags() }) });
  const tagCatalog = tagsQuery.data ?? [];
  const assignedTagsFor = (thread: Thread) => (thread.tagIds ?? []).map((id) => tagCatalog.find((tag) => tag.id === id)).filter((tag): tag is ChatTag => Boolean(tag));
  const parentFor = (thread: Thread) => parentsQuery.data?.find((parent) => parent.uid === thread.parentUid);
  const toggleTag = (thread: Thread, tag: ChatTag) => {
    const current = thread.tagIds ?? [];
    assignTags.mutate({ threadId: thread.id, tagIds: current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [tag.id, ...current].slice(0, 10) });
  };

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
    () => threads.filter((thread) => {
      const matchesSearch = `${thread.facebookName ?? ""} ${thread.parentName}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"));
      const matchesFilter = filter === "all" || (filter === "unread" ? thread.unreadStaffCount > 0 : thread.status === "blocked" || thread.linkStatus === "unlinked");
      return matchesSearch && matchesFilter;
    }),
    [filter, search, threads],
  );
  const selected = threads.find((thread) => thread.id === selectedId);

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_288px]">
      <aside className={`${mobileThreadOpen ? "hidden lg:flex" : "flex"} min-h-0 min-w-0 flex-col border-r border-neutral-200 bg-neutral-0`} aria-label="Danh sách hội thoại">
        <div className="border-b border-neutral-200 px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold leading-7 tracking-[-.015em] text-neutral-900">Đoạn chat</h1>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={onOpenTemplates} aria-label="Mẫu tiện ích" className="flex size-9 items-center justify-center rounded-card bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 active:scale-[.98]"><Star size={16} /></button>
              <button type="button" onClick={() => setPickerOpen(true)} aria-label="Nhắn mới" className="flex size-9 items-center justify-center rounded-card bg-primary-50 text-primary-700 transition-colors hover:bg-primary-100 active:scale-[.98]"><Plus size={17} /></button>
            </div>
          </div>
          <label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><span className="sr-only">Tìm hội thoại</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm phụ huynh" className="min-h-11 w-full rounded-card border border-neutral-300 bg-neutral-50 pl-10 pr-3 text-sm text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:bg-neutral-0 focus:ring-2 focus:ring-primary-100" /></label>
          <div className="mt-3 flex gap-1.5 overflow-x-auto" aria-label="Lọc hội thoại">
            {([["all", "Tất cả"], ["unread", "Chưa đọc"], ["attention", "Cần xử lý"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-9 shrink-0 rounded-card px-3 text-xs font-semibold transition-colors active:scale-[.98] ${filter === value ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"}`}>{label}</button>)}
          </div>
          {tagsQuery.isError && <p role="alert" className="text-xs font-semibold text-danger-700">Không tải được tag hội thoại.</p>}
          {markRead.isError && <p role="alert" className="mt-2 text-xs font-semibold text-danger-700">Không thể cập nhật trạng thái đã đọc.</p>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {!threads.length ? (
            <div className="p-6 text-center"><MessageCircle className="mx-auto text-neutral-300" size={32} /><p className="mt-3 text-sm font-semibold">Chưa có hội thoại</p><p className="mt-1 text-xs text-neutral-500">Chọn &quot;Nhắn mới&quot; để bắt đầu.</p></div>
          ) : !filtered.length ? (
            <div className="px-5 py-14 text-center"><Search className="mx-auto text-neutral-300" size={28} /><p className="mt-3 text-sm font-semibold text-neutral-700">Không có hội thoại phù hợp</p><p className="mt-1 text-xs text-neutral-500">Thử đổi từ khóa hoặc bộ lọc.</p></div>
          ) : filtered.map((thread) => (
            <button key={thread.id} type="button" onClick={() => { setSelectedId(thread.id); setMobileThreadOpen(true); if (thread.unreadStaffCount > 0) markRead.mutate(thread.id); }} aria-current={thread.id === selectedId ? "true" : undefined} className={`flex min-h-[76px] w-full gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${thread.id === selectedId ? "bg-primary-50" : "hover:bg-neutral-50"}`}>
              <span className="relative shrink-0"><AccountAvatar thread={thread} />{thread.linkStatus !== "unlinked" && thread.status !== "blocked" && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-neutral-0 bg-success-500" aria-label="Đã kết nối" />}</span>
              <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><b className="truncate text-sm font-semibold leading-5 text-neutral-900">{accountName(thread)}</b><span className="shrink-0 text-2xs text-neutral-400">{time(thread.lastMessageAt)}</span></span><span className={`mt-1 block truncate text-xs leading-5 ${thread.unreadStaffCount ? "font-semibold text-neutral-800" : "text-neutral-500"}`}>{thread.lastMessagePreview}</span>{assignedTagsFor(thread).length > 0 && <span className="mt-1.5 flex flex-wrap gap-1">{assignedTagsFor(thread).slice(0, 2).map((tag) => <span key={tag.id} className={`rounded px-1.5 py-0.5 text-3xs font-semibold leading-4 ${CHAT_TAG_STYLES[tag.color]}`}>{tag.label}</span>)}{assignedTagsFor(thread).length > 2 && <span className="px-1 py-0.5 text-3xs font-semibold text-neutral-500">+{assignedTagsFor(thread).length - 2}</span>}</span>}</span>
              <span className="flex w-5 shrink-0 flex-col items-center justify-end gap-1.5">{thread.unreadStaffCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary-600 text-2xs font-bold text-white">{thread.unreadStaffCount}</span>}{(thread.status === "blocked" || thread.linkStatus === "unlinked") && <AlertTriangle size={15} className="text-warning-700" />}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className={`${mobileThreadOpen ? "flex" : "hidden lg:flex"} min-h-0 min-w-0`}>
        {selected ? <ConversationPanel thread={selected} parent={parentFor(selected)} configured={configured} tagCatalog={tagCatalog} assignedTags={assignedTagsFor(selected)} tagUpdatePending={assignTags.isPending} canDelete={role === "admin"} onBack={() => setMobileThreadOpen(false)} onToggleTag={(tag) => toggleTag(selected, tag)} onManageTags={role === "admin" ? () => setTagManagerOpen(true) : undefined} /> : (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-neutral-50 p-6 text-center"><div><MessageCircle className="mx-auto text-neutral-300" size={36} /><p className="mt-3 text-sm font-semibold">Chưa có hội thoại Messenger</p><p className="mt-1 text-sm text-neutral-500">Chọn &quot;Nhắn mới&quot; để bắt đầu.</p></div></div>
        )}
      </div>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-neutral-200 bg-neutral-0 p-5 xl:block">{selected ? <ConversationContext thread={selected} parent={parentFor(selected)} tags={assignedTagsFor(selected)} onRemoveTag={(tagId) => { const tag = tagCatalog.find((item) => item.id === tagId); if (tag) toggleTag(selected, tag); }} onManageTags={role === "admin" ? () => setTagManagerOpen(true) : undefined} /> : null}</aside>
      <NewConversationPicker open={pickerOpen} onClose={() => setPickerOpen(false)} configured={configured} onSent={setPendingStudentId} />
      {role === "admin" && <ConversationTagManager open={tagManagerOpen} tags={tagCatalog} onClose={() => setTagManagerOpen(false)} onCreate={(label, color) => createTag.mutateAsync({ label, color }).then(() => undefined)} onDelete={(tagId) => removeCatalogTag.mutateAsync(tagId).then(() => undefined)} />}
    </div>
  );
}

export function Outbox({ role, uid }: { role: "admin" | "teacher"; uid: string }) {
  const result = useQuery({ queryKey: ["message-outbox", role, uid], queryFn: () => listMessageOutbox(role, uid) });
  if (result.isLoading) return <div className="p-5"><LoadingSkeleton rows={6} /></div>;
  if (result.isError) return <div className="p-5"><ErrorState message="Không tải được nhật ký gửi." onRetry={() => result.refetch()} /></div>;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 p-3 sm:p-5">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-card border border-neutral-200 bg-neutral-0">
        <header className="border-b border-neutral-200 px-4 py-4"><h2 className="text-sm font-bold">Nhật ký gửi</h2><p className="mt-1 text-xs text-neutral-500">{role === "admin" ? "Toàn bộ kết quả gửi gần nhất." : "Chỉ các tin do bạn gửi."}</p></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-neutral-50 text-left text-xs font-bold text-neutral-500"><tr><th className="px-4 py-3">Mã gửi</th><th className="px-4 py-3">Học sinh</th><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Loại gửi</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3 text-right">Trạng thái</th></tr></thead><tbody>
          {result.data?.length ? result.data.map((row) => <tr key={row.id} className="border-t border-neutral-100"><td className="px-4 py-3 font-mono text-xs">{row.id.slice(0, 14)}</td><td className="px-4 py-3">{row.studentId ?? "Fanpage"}</td><td className="max-w-sm truncate px-4 py-3 text-neutral-600">{row.content}</td><td className="px-4 py-3">{row.messageTag ? <span className="rounded-full bg-info-50 px-2 py-0.5 text-2xs font-semibold text-info-700">TAG · {row.messageTag}</span> : <span className="text-xs text-neutral-400">RESPONSE</span>}</td><td className="px-4 py-3 text-neutral-500">{time(row.createdAt)}</td><td className="px-4 py-3 text-right"><StatusBadge tone={row.status === "sent" ? "success" : "danger"}>{row.status === "sent" ? "Đã gửi" : "Thất bại"}</StatusBadge></td></tr>) : <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500">Chưa có nhật ký gửi.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
