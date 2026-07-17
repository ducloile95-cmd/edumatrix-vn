import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock3, ExternalLink, RotateCcw, Send, X } from "lucide-react";
import type { Timestamp } from "firebase/firestore";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cancelScheduledFanpagePost, createFanpagePost, listFanpagePosts, markFanpagePostResult } from "@/services/firestore/fanpagePosts";
import { postToPage } from "@/services/messenger/client";
import type { FanpagePostDoc } from "@/types/chat";

type Post = FanpagePostDoc & { id: string };

function toMillis(value: Timestamp | null): number {
  return value?.toMillis?.() ?? 0;
}

function formatDateTime(value: Timestamp | null): string {
  const millis = toMillis(value);
  return millis ? format(new Date(millis), "dd/MM/yyyy · HH:mm") : "";
}

interface PostQueueListProps {
  actorUid: string;
  actorName: string;
}

export function PostQueueList({ actorUid, actorName }: PostQueueListProps) {
  const queryClient = useQueryClient();
  const result = useQuery({ queryKey: ["fanpage-posts"], queryFn: listFanpagePosts });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fanpage-posts"] });

  // Chuyen 1 bai "scheduled" da den gio sang sent/failed - cap nhat DUNG ban ghi do (rules chi
  // cho phep update khi resource.data.status == 'scheduled').
  const sendNow = useMutation({
    mutationFn: async (post: Post) => {
      try {
        const response = await postToPage({ message: post.message, link: post.link ?? undefined, imageUrls: post.imageUrls ?? undefined });
        await markFanpagePostResult(post.id, { status: "sent", postId: response.postId ?? null });
      } catch (error) {
        await markFanpagePostResult(post.id, { status: "failed", errorCode: (error as Error).message });
      }
    },
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelScheduledFanpagePost(id),
    onSuccess: invalidate,
  });

  // Thu lai 1 bai loi: tao ban ghi MOI (khong sua ban ghi loi cu) de giu lich su nguyen ven.
  const retry = useMutation({
    mutationFn: async (post: Post) => {
      try {
        const response = await postToPage({ message: post.message, link: post.link ?? undefined, imageUrls: post.imageUrls ?? undefined });
        await createFanpagePost(
          { message: post.message, link: post.link, imageUrls: post.imageUrls, status: "sent", scheduledFor: null, postId: response.postId ?? null },
          actorUid, actorName,
        );
      } catch (error) {
        await createFanpagePost(
          { message: post.message, link: post.link, imageUrls: post.imageUrls, status: "failed", scheduledFor: null, errorCode: (error as Error).message },
          actorUid, actorName,
        );
      }
    },
    onSuccess: invalidate,
  });

  if (result.isLoading) return <LoadingSkeleton rows={6} />;
  if (result.isError) return <ErrorState message="Không tải được danh sách bài đăng." onRetry={() => result.refetch()} />;

  const posts = result.data ?? [];
  const now = Date.now();
  const scheduled = posts.filter((post) => post.status === "scheduled").sort((a, b) => toMillis(a.scheduledFor) - toMillis(b.scheduledFor));
  const others = posts.filter((post) => post.status !== "scheduled");
  const ordered = [...scheduled, ...others];

  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sentLast30 = posts.filter((post) => post.status === "sent" && toMillis(post.sentAt) >= thirtyDaysAgo).length;
  const failedCount = posts.filter((post) => post.status === "failed").length;
  const busy = sendNow.isPending || cancel.isPending || retry.isPending;

  if (!ordered.length) {
    return (
      <div className="rounded-card border border-neutral-200 bg-white py-16 text-center">
        <Clock3 className="mx-auto text-neutral-300" size={36} aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold">Chưa có bài đăng nào</p>
        <p className="mt-1 text-xs text-neutral-500">Bài đăng ngay hoặc lên lịch sẽ xuất hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatChip tone="success" value={sentLast30} label="Đã đăng (30 ngày)" />
        <StatChip tone="info" value={scheduled.length} label="Đang chờ lịch" />
        <StatChip tone="danger" value={failedCount} label="Lỗi cần xử lý" />
      </div>

      <div className="space-y-2.5">
        {ordered.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            isDue={post.status === "scheduled" && toMillis(post.scheduledFor) <= now}
            busy={busy}
            onSendNow={() => sendNow.mutate(post)}
            onCancel={() => cancel.mutate(post.id)}
            onRetry={() => retry.mutate(post)}
          />
        ))}
      </div>
    </div>
  );
}

function StatChip({ tone, value, label }: { tone: "success" | "info" | "danger"; value: number; label: string }) {
  const toneClass = tone === "success" ? "bg-success-50 text-success-700" : tone === "info" ? "bg-info-50 text-info-700" : "bg-danger-50 text-danger-700";
  return (
    <div className="flex items-center gap-3 rounded-card border border-neutral-200 bg-white p-4">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-input text-sm font-bold ${toneClass}`}>{value}</span>
      <span className="text-xs font-semibold text-neutral-500">{label}</span>
    </div>
  );
}

function PostRow({ post, isDue, busy, onSendNow, onCancel, onRetry }: {
  post: Post; isDue: boolean; busy: boolean; onSendNow: () => void; onCancel: () => void; onRetry: () => void;
}) {
  return (
    <div className="flex gap-3 rounded-card border border-neutral-200 bg-white p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-extrabold text-white">EM</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {isDue && <StatusBadge tone="warning">Đến giờ đăng</StatusBadge>}
          {post.status === "scheduled" && !isDue && <StatusBadge tone="info">Đã lên lịch</StatusBadge>}
          {post.status === "sent" && <StatusBadge tone="success">Đã đăng</StatusBadge>}
          {post.status === "failed" && <StatusBadge tone="danger">Thất bại</StatusBadge>}
          {post.status === "canceled" && <StatusBadge tone="neutral">Đã hủy</StatusBadge>}
        </div>
        <p className="line-clamp-2 text-sm text-neutral-800">{post.message}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
          {post.status === "scheduled" ? <span>Hẹn đăng: {formatDateTime(post.scheduledFor)}</span> : <span>{formatDateTime(post.createdAt)}</span>}
          <span>Soạn bởi {post.actorName}</span>
          {post.status === "failed" && post.errorCode && <span className="text-danger-700">Lỗi: {post.errorCode}</span>}
        </div>
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {post.imageUrls.slice(0, 4).map((url, index) => (
              <img key={`${index}-${url}`} src={url} alt="" className="size-9 rounded-input border border-neutral-200 object-cover" />
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-1.5">
        {isDue && (
          <button type="button" onClick={onSendNow} disabled={busy} className="motion-control inline-flex min-h-[32px] items-center gap-1.5 rounded-input bg-primary-600 px-3 text-xs font-semibold text-white active:scale-[.97] disabled:opacity-40">
            <Send size={13} />Đăng ngay
          </button>
        )}
        {post.status === "scheduled" && !isDue && (
          <button type="button" onClick={onCancel} disabled={busy} className="motion-control inline-flex min-h-[32px] items-center gap-1.5 rounded-input border border-danger-100 px-3 text-xs font-semibold text-danger-700 disabled:opacity-40">
            <X size={13} />Hủy lịch
          </button>
        )}
        {post.status === "failed" && (
          <button type="button" onClick={onRetry} disabled={busy} className="motion-control inline-flex min-h-[32px] items-center gap-1.5 rounded-input border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 disabled:opacity-40">
            <RotateCcw size={13} />Thử lại
          </button>
        )}
        {post.status === "sent" && post.postId && (
          <a href={`https://www.facebook.com/${post.postId}`} target="_blank" rel="noreferrer" className="motion-control inline-flex min-h-[32px] items-center gap-1.5 rounded-input border border-neutral-200 px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
            <ExternalLink size={13} />Xem trên Facebook
          </a>
        )}
      </div>
    </div>
  );
}
