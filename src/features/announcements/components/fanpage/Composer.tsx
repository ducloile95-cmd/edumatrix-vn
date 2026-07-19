import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Facebook, Send } from "lucide-react";
import { ImageUrlInput } from "@/features/announcements/components/fanpage/ImageUrlInput";
import { PostPreviewCard } from "@/features/announcements/components/fanpage/PostPreviewCard";
import { createFanpagePost } from "@/services/firestore/fanpagePosts";
import { postToPage } from "@/services/integrations/messenger";

type Mode = "now" | "later";

function combineDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}`);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ComposerProps {
  configured: boolean;
  actorUid: string;
  actorName: string;
}

export function Composer({ configured, actorUid, actorName }: ComposerProps) {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("now");
  const [scheduledDate, setScheduledDate] = useState(todayIso);
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const queryClient = useQueryClient();

  const submit = useMutation({
    mutationFn: async (submitMode: Mode) => {
      const trimmedMessage = message.trim();
      const trimmedLink = link.trim() || null;
      const urls = imageUrls.length ? imageUrls : null;

      if (submitMode === "later") {
        await createFanpagePost(
          { message: trimmedMessage, link: trimmedLink, imageUrls: urls, status: "scheduled", scheduledFor: combineDateTime(scheduledDate, scheduledTime) },
          actorUid, actorName,
        );
        return;
      }

      const result = await postToPage({ message: trimmedMessage, link: trimmedLink ?? undefined, imageUrls: urls ?? undefined });
      if (result.posted) {
        await createFanpagePost(
          { message: trimmedMessage, link: trimmedLink, imageUrls: urls, status: "sent", scheduledFor: null, postId: result.postId ?? null },
          actorUid, actorName,
        );
      } else {
        await createFanpagePost(
          { message: trimmedMessage, link: trimmedLink, imageUrls: urls, status: "failed", scheduledFor: null, errorCode: result.message },
          actorUid, actorName,
        );
        throw new Error(result.message);
      }
    },
    onSuccess: () => {
      setMessage("");
      setLink("");
      setImageUrls([]);
      queryClient.invalidateQueries({ queryKey: ["fanpage-posts"] });
    },
  });

  const canSubmit = configured && message.trim().length > 0 && !submit.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-card border border-neutral-200 bg-white">
        <header className="border-b border-neutral-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Facebook size={16} className="text-primary-700" />Soạn bài Fanpage</h2>
          <p className="mt-1 text-xs text-neutral-500">Chỉ Admin được phép sử dụng chức năng này.</p>
        </header>
        <form onSubmit={(event) => { event.preventDefault(); if (canSubmit) submit.mutate(mode); }} className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">Nội dung</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={7}
              maxLength={5000}
              disabled={!configured}
              placeholder="Nhập nội dung bài đăng..."
              className="w-full rounded-input border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100"
            />
            <span className="mt-1 block text-right text-xs text-neutral-400">{message.length}/5000</span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">Liên kết (tuỳ chọn)</span>
            <input
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://..."
              disabled={!configured}
              className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm disabled:bg-neutral-100"
            />
          </label>

          <ImageUrlInput value={imageUrls} onChange={setImageUrls} disabled={!configured} />

          <div>
            <span className="mb-1.5 block text-xs font-bold">Thời điểm đăng</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("now")}
                className={`min-h-[46px] rounded-input border text-xs font-bold transition ${mode === "now" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-300 text-neutral-600"}`}
              >
                Đăng ngay
                <span className="mt-0.5 block text-[10px] font-medium text-neutral-400">Gửi lên Fanpage tức thì</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("later")}
                className={`min-h-[46px] rounded-input border text-xs font-bold transition ${mode === "later" ? "border-info-500 bg-info-50 text-info-700" : "border-neutral-300 text-neutral-600"}`}
              >
                Lên lịch
                <span className="mt-0.5 block text-[10px] font-medium text-neutral-400">Thêm vào hàng chờ</span>
              </button>
            </div>
            {mode === "later" && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold">Ngày</span>
                    <input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold">Giờ</span>
                    <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm" />
                  </label>
                </div>
                <p className="mt-2 rounded-input border border-dashed border-warning-300 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-700">
                  <b>Lưu ý:</b> gói Firebase Spark hiện dùng không chạy tác vụ nền theo giờ hẹn. Bài sẽ nằm trong &quot;Hàng chờ&quot; — cần mở trang này và bấm &quot;Đăng ngay&quot; khi tới giờ để bài thực sự lên Fanpage.
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
            <span className="text-xs text-neutral-500">
              {mode === "later" ? "Bài sẽ được thêm vào Hàng chờ, chưa đăng ngay." : "Đăng trực tiếp lên Fanpage ngay khi bấm nút."}
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              className="motion-control inline-flex min-h-touch shrink-0 items-center gap-2 rounded-input bg-primary-600 px-4 text-sm font-semibold text-white active:scale-[.98] disabled:opacity-40"
            >
              <Send size={16} />
              {submit.isPending ? "Đang xử lý..." : mode === "later" ? "Thêm vào hàng chờ" : "Đăng lên Fanpage"}
            </button>
          </div>

          {!configured && <p className="text-xs text-warning-700">Cần cấu hình Messenger Worker trước khi đăng bài.</p>}
          {submit.isError && <p className="text-xs text-danger-700">Thao tác thất bại: {(submit.error as Error).message}</p>}
          {submit.isSuccess && (
            <p className="text-xs text-success-700">{submit.variables === "later" ? "Đã thêm vào hàng chờ." : "Đã đăng bài thành công."}</p>
          )}
        </form>
      </section>

      <section className="rounded-card border border-neutral-200 bg-white">
        <header className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-bold">Bản xem trước</h2>
          <p className="mt-1 text-xs text-neutral-500">Hiển thị gần đúng như bài viết sẽ xuất hiện trên Facebook.</p>
        </header>
        <div className="p-5">
          <PostPreviewCard message={message} link={link} imageUrls={imageUrls} />
        </div>
      </section>
    </div>
  );
}
