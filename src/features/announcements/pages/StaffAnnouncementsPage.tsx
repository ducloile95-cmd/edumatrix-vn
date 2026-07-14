import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Send, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { listStudents } from "@/services/firestore/students";
import { postToPage, sendMessenger } from "@/services/messenger/client";

/** Đổi mã lỗi kỹ thuật từ Worker thành thông báo tiếng Việt. */
function friendlySendError(message: string): string {
  if (message === "no_recipient") return "Phụ huynh chưa liên kết Messenger (chưa nhắn vào Fanpage qua link liên kết).";
  if (message === "MESSENGER_NOT_CONFIGURED") return "Chưa cấu hình Worker Messenger (VITE_MESSENGER_WORKER_URL).";
  return `Gửi thất bại: ${message}.`;
}

export default function StaffAnnouncementsPage() {
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
  const canPost = message.trim().length > 0 && !post.isPending;

  // --- Nhắn phụ huynh (Worker tự resolve PSID từ studentId) ---
  const [studentId, setStudentId] = useState("");
  const [dmText, setDmText] = useState("");
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const dm = useMutation({
    mutationFn: () => sendMessenger({ studentId, text: dmText.trim(), type: "manual" }),
    onSuccess: () => setDmText(""),
  });
  const canSend = Boolean(studentId) && dmText.trim().length > 0 && !dm.isPending;

  return (
    <AppShell>
      <PageHeader title="Thông báo" description="Đăng bài lên Fanpage và nhắn phụ huynh qua Messenger." />

      <div className="mt-5 max-w-2xl rounded-card border border-neutral-200 bg-neutral-0 p-4">
        <h2 className="text-base">Đăng bài lên Fanpage</h2>
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
        <h2 className="text-base">Nhắn phụ huynh</h2>
        <p className="mt-1 text-xs text-neutral-500">Gửi Messenger tới phụ huynh đã liên kết của một học sinh.</p>

        <label htmlFor="dm-student" className="mt-3 block text-sm font-medium text-neutral-700">Học sinh</label>
        <select
          id="dm-student"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
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
