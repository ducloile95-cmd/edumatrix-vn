import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layouts/AppShell";
import { getClass } from "@/services/firestore/classes";
import { EnrollmentManager } from "@/features/classes/components/EnrollmentManager";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROUTES } from "@/constants/routes";

const STATUS_LABEL = {
  active: "Đang hoạt động",
  completed: "Đã kết thúc",
  cancelled: "Đã hủy",
} as const;

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();

  const { data: klass, isLoading, isError, refetch } = useQuery({
    queryKey: ["class", classId],
    queryFn: () => getClass(classId as string),
    enabled: !!classId,
  });

  return (
    <AppShell>
      <Link to={ROUTES.STAFF_CLASSES} className="text-sm text-primary-700 hover:underline">
        ← Quay lại danh sách lớp
      </Link>

      <div className="mt-3">
        {isLoading && <LoadingSkeleton rows={4} />}
        {isError && <ErrorState message="Không tải được thông tin lớp học." onRetry={() => refetch()} />}
        {!isLoading && !isError && !klass && (
          <EmptyState title="Không tìm thấy lớp học" description="Lớp học có thể đã bị xóa." />
        )}

        {klass && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1>{klass.name}</h1>
              <StatusBadge tone={klass.status === "active" ? "success" : klass.status === "cancelled" ? "danger" : "neutral"}>
                {STATUS_LABEL[klass.status]}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {klass.scheduleText || "Chưa có lịch"} · {klass.location || "Chưa có địa điểm"}
            </p>

            <div className="mt-6 rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5">
              <h2 className="mb-3">Ghi danh học sinh</h2>
              <EnrollmentManager
                classId={klass.id}
                courseId={klass.courseId}
                enrolledStudentIds={klass.studentIds}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
