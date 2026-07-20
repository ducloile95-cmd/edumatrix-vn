import { useQueries } from "@tanstack/react-query";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listAnnouncementsByStudent } from "@/services/firestore/announcements";

export default function ViewerAnnouncementsPage() {
  const { userDoc } = useAuth();
  const groups = useQueries({
    queries: (userDoc?.studentIds ?? []).map((studentId) => ({
      queryKey: ["announcements", studentId],
      queryFn: () => listAnnouncementsByStudent(studentId, 50),
    })),
  });
  const items = groups.flatMap((group) => group.data ?? []);
  const isLoading = groups.some((group) => group.isLoading);
  const firstError = groups.find((group) => group.error)?.error;

  return (
    <ViewerShell>
      {isLoading && <LoadingSkeleton rows={3} />}
      {!isLoading && firstError && (
        <ErrorState
          message="Không thể tải thông báo. Vui lòng kiểm tra kết nối và thử lại."
          onRetry={() => groups.forEach((group) => group.refetch())}
        />
      )}
      {!isLoading && !firstError && items.length === 0 && (
        <EmptyState title="Chưa có thông báo mới" description="Thông báo từ giáo viên và nhà trường sẽ hiển thị ở đây." />
      )}
      {!isLoading && !firstError && items.length > 0 && (
        <ul className="divide-y divide-neutral-100">
          {items.map((item) => (
            <li key={String(item.id)} className="py-3">
              <p className="text-sm font-medium">{String(item.title ?? "Thông báo")}</p>
              <p className="text-xs text-neutral-500">{String(item.message ?? "")}</p>
            </li>
          ))}
        </ul>
      )}
    </ViewerShell>
  );
}
