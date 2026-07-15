import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listStudents } from "@/services/firestore/students";
import { postToPage, sendMessenger } from "@/services/messenger/client";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

/** Đổi mã lỗi kỹ thuật từ Worker thành thông báo tiếng Việt. */
function friendlySendError(message: string): string {
  if (message === "no_recipient") return "Phụ huynh chưa liên kết Messenger (chưa nhắn vào Fanpage qua link liên kết).";
  if (message === "MESSENGER_NOT_CONFIGURED") return "Chưa cấu hình Worker Messenger (VITE_MESSENGER_WORKER_URL).";
  return `Gửi thất bại: ${message}.`;
}

function StatusLine({ tone, label, detail }: { tone: StatusTone; label: string; detail: string }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Loader2 : AlertCircle;
  return (
    <div className="mt-3 flex items-start gap-2 rounded-input border border-neutral-200 bg-neutral-50 px-3 py-2">
      <Icon
        size={16}
        aria-hidden="true"
        className={`mt-0.5 shrink-0 ${tone === "info" ? "animate-spin text-info-700" : "text-neutral-500"}`}
      />
      <div className="min-w-0">
        <StatusBadge tone={tone}>{label}</StatusBadge>
        <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
      </div>
    </div>
  );
}

export default function StaffAnnouncementsPage() {
  const messengerConfigured = Boolean(import.meta.env.VITE_MESSENGER_WORKER_URL?.trim());

  // --- Đăng bài Fanpage ---
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const post = useMutation({
    mutationFn: () => postToPage({ message: message.trim(), link: link.trim() || undefined }),
    onSuccess: () => {
      setMessage("");
      setLink("");
    },
  });
  const canPost = messengerConfigured && message.trim().length > 0 && !post.isPending;

  // --- Nhắn phụ huynh (Worker tự resolve PSID từ studentId) ---
  const [studentId, setStudentId] = useState("");
  const [dmText, setDmText] = useState("");
  const [outsideWindow, setOutsideWindow] = useState(false);
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const selectedStudent = students.data?.find((student) => student.id === studentId);
  const selectedStudentHasParent = Boolean(selectedStudent && selectedStudent.parentUids.length > 0);
  const dm = useMutation({
    mutationFn: () =>
      sendMessenger({ studentId, text: dmText.trim(), type: "manual", tag: outsideWindow ? "ACCOUNT_UPDATE" : undefined }),
    onSuccess: () => setDmText(""),
  });
  const canSend = messengerConfigured && selectedStudentHasParent && dmText.trim().length > 0 && !dm.isPending;
  const workerTone: StatusTone = messengerConfigured ? "success" : "warning";

  return (
    <AppShell>
      <PageHeader title="Thông báo" description="Đăng bài lên Fanpage và nhắn phụ huynh qua Messenger." />

      <div className="max-w-2xl rounded-card border border-neutral-200 bg-neutral-0 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-neutral-900">Đăng bài lên Fanpage</h2>
          <StatusBadge tone={workerTone}>{messengerConfigured ? "Worker sẵn sàng" : "Chưa cấu hình Worker"}</StatusBadge>
        </div>
        {!messengerConfigured && (
          <p className="mt-2 text-xs text-warning-700">Thiếu `VITE_MESSENGER_WORKER_URL`; phần Fanpage/Messenger sẽ không gửi tự động.</p>
        )}
        <label htmlFor="ann-message" className="mt-3 block text-sm font-medium text-neutral-700">Nội dung</label>
        <textarea
          id="ann-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="Nội dung thông báo đăng lên Fanpage..."
          className="mt-1 w-full rounded-input border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500"
        />
        <p className="mt-1 text-right text-xs text-neutral-400">{message.length}/5000</p>

        <label htmlFor="ann-link" className="mt-3 block text-sm font-medium text-neutral-700">Liên kết (tuỳ chọn)</label>
        <input
          id="ann-link"
          type="url"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="https://..."
          className="mt-1 min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
        />

        <button
          type="button"
          onClick={() => post.mutate()}
          disabled={!canPost}
          className="mt-4 inline-flex min-h-touch items-center gap-2 rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Send size={16} aria-hidden="true" />
          {post.isPending ? "Đang đăng..." : "Đăng lên Fanpage"}
        </button>
        {post.isError && (
          <p role="alert" className="mt-3 text-sm text-danger-700">
            Đăng thất bại: {(post.error as Error).message}. Nội dung vẫn còn để thử lại.
          </p>
        )}
        {post.isSuccess && <p className="mt-3 text-sm text-success-700">Đã đăng lên Fanpage.</p>}
      </div>

      <div className="mt-4 max-w-2xl rounded-card border border-neutral-200 bg-neutral-0 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-neutral-900">Nhắn phụ huynh</h2>
          <StatusBadge tone={workerTone}>{messengerConfigured ? "Worker sẵn sàng" : "Chưa cấu hình Worker"}</StatusBadge>
        </div>
        <p className="mt-1 text-xs text-neutral-500">Gửi Messenger tới phụ huynh đã liên kết của một học sinh.</p>

        {!messengerConfigured && (
          <StatusLine tone="warning" label="Chưa cấu hình" detail="Thiếu VITE_MESSENGER_WORKER_URL nên Staff chỉ có thể soạn nội dung, chưa gửi tự động qua Worker." />
        )}
        {messengerConfigured && students.isPending && (
          <StatusLine tone="info" label="Đang tải học sinh" detail="Đang kiểm tra danh sách học sinh trước khi gửi Messenger." />
        )}
        {messengerConfigured && students.isError && (
          <StatusLine tone="danger" label="Lỗi dữ liệu" detail="Không tải được danh sách học sinh; chưa thể xác định phụ huynh nhận tin." />
        )}
        {messengerConfigured && !students.isPending && !students.isError && !studentId && (
          <StatusLine tone="neutral" label="Chưa chọn học sinh" detail="Chọn một học sinh để Worker tự resolve phụ huynh đã liên kết Messenger." />
        )}
        {messengerConfigured && selectedStudent && !selectedStudentHasParent && (
          <StatusLine tone="warning" label="Chưa gắn phụ huynh" detail="Học sinh này chưa có parentUids trong hồ sơ; cần gắn phụ huynh trước khi gửi Messenger." />
        )}
        {messengerConfigured && selectedStudentHasParent && !dm.isPending && !dm.isError && !dm.isSuccess && (
          <StatusLine
            tone="success"
            label={outsideWindow ? "MESSAGE_TAG" : "RESPONSE"}
            detail={outsideWindow ? "Worker sẽ gửi bằng message tag; Meta vẫn có thể từ chối nếu quyền hoặc nội dung không hợp lệ." : "Worker sẽ gửi bằng RESPONSE trong cửa sổ phản hồi tiêu chuẩn."}
          />
        )}
        {dm.isPending && <StatusLine tone="info" label="Đang gửi" detail="Worker đang gọi Meta Graph API và sẽ ghi kết quả vào message_outbox." />}
        {dm.isError && <StatusLine tone="danger" label="Gửi thất bại" detail={friendlySendError((dm.error as Error).message)} />}
        {dm.isSuccess && (
          <StatusLine tone="success" label="Đã gửi" detail={`Đã gửi ${dm.data.sent ?? 0}/${dm.data.total ?? 0} phụ huynh liên kết. Kiểm tra message_outbox nếu cần audit.`} />
        )}

        <label htmlFor="dm-student" className="mt-3 block text-sm font-medium text-neutral-700">Học sinh</label>
        <select
          id="dm-student"
          value={studentId}
          onChange={(event) => {
            setStudentId(event.target.value);
            dm.reset();
          }}
          className="mt-1 min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm"
        >
          <option value="">Chọn học sinh</option>
          {students.data?.map((student) => (
            <option key={student.id} value={student.id}>{student.fullName} · {student.studentCode}</option>
          ))}
        </select>

        <label htmlFor="dm-text" className="mt-3 block text-sm font-medium text-neutral-700">Nội dung tin</label>
        <textarea
          id="dm-text"
          value={dmText}
          onChange={(event) => setDmText(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Nội dung nhắn phụ huynh..."
          className="mt-1 w-full rounded-input border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500"
        />
        <p className="mt-1 text-right text-xs text-neutral-400">{dmText.length}/2000</p>

        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={outsideWindow}
            onChange={(event) => {
              setOutsideWindow(event.target.checked);
              dm.reset();
            }}
            className="size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          Tin ngoài cửa sổ phản hồi 24h
        </label>

        <button
          type="button"
          onClick={() => dm.mutate()}
          disabled={!canSend}
          className="mt-4 inline-flex min-h-touch items-center gap-2 rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <MessageCircle size={16} aria-hidden="true" />
          {dm.isPending ? "Đang gửi..." : "Gửi Messenger"}
        </button>
        {dm.isError && (
          <p role="alert" className="mt-3 text-sm text-danger-700">
            {friendlySendError((dm.error as Error).message)} Nội dung vẫn còn để thử lại.
          </p>
        )}
        {dm.isSuccess && (
          <p className="mt-3 text-sm text-success-700">Đã gửi {dm.data.sent ?? 0}/{dm.data.total ?? 0} phụ huynh liên kết.</p>
        )}
      </div>
    </AppShell>
  );
}
