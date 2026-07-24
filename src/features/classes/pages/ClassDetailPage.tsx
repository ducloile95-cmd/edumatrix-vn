import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layouts/AppShell";
import { getClass } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
import { EnrollmentManager } from "@/features/classes/components/EnrollmentManager";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";

const STATUS_LABEL = {
  active: "Đang hoạt động",
  completed: "Đã kết thúc",
  cancelled: "Đã hủy",
} as const;

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const { role } = useAuth();
  const canManageEnrollments = role === USER_ROLES.ADMIN || role === USER_ROLES.TEACHER;
  const canUnenroll = role === USER_ROLES.ADMIN || role === USER_ROLES.TEACHER;

  const { data: klass, isLoading, isError, refetch } = useQuery({
    queryKey: ["class", classId],
    queryFn: () => getClass(classId as string),
    enabled: !!classId,
  });

  // Tái dùng listCourses/listSubjects/listUsersByRole (đã dùng ở ClassForm/ClassesList) để hiện
  // tên khóa học, môn học và giáo viên trong hero thay vì chỉ ID — cùng queryKey nên React Query
  // dùng chung cache, không phát sinh loại truy vấn Firestore mới.
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses, staleTime: 60_000 });
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: listSubjects, staleTime: 60_000 });
  const teachersQuery = useQuery({
    queryKey: ["users", "teacher"],
    queryFn: () => listUsersByRole(USER_ROLES.TEACHER),
    staleTime: 60_000,
  });

  const courseName = useMemo(
    () => coursesQuery.data?.find((c) => c.id === klass?.courseId)?.name,
    [coursesQuery.data, klass?.courseId],
  );
  const subjectNames = useMemo(() => {
    if (!klass) return [];
    const byId = new Map((subjectsQuery.data ?? []).map((s) => [s.id, s.name]));
    return klass.subjectIds.map((id) => byId.get(id)).filter((name): name is string => !!name);
  }, [klass, subjectsQuery.data]);
  const teacherNames = useMemo(() => {
    if (!klass) return [];
    const byId = new Map((teachersQuery.data ?? []).map((t) => [t.uid, t.displayName]));
    return klass.teacherIds.map((id) => byId.get(id)).filter((name): name is string => !!name);
  }, [klass, teachersQuery.data]);

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
            <div className="rounded-card border border-neutral-200 bg-neutral-0 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2>{klass.name}</h2>
                <StatusBadge tone={klass.status === "active" ? "success" : klass.status === "cancelled" ? "danger" : "neutral"}>
                  {STATUS_LABEL[klass.status]}
                </StatusBadge>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                {courseName ?? "Chưa gắn khóa học"}
                {subjectNames.map((name) => (
                  <span key={name} className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                    {name}
                  </span>
                ))}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-4">
                <HeroItem label="Giáo viên phụ trách" value={teacherNames.join(", ") || "Chưa gán"} />
                <HeroItem label="Lịch học" value={klass.scheduleText || "Chưa có lịch"} />
                <HeroItem label="Địa điểm" value={klass.location || "Chưa có địa điểm"} />
                <HeroItem label="Sĩ số hiện tại" value={`${klass.studentIds.length} học sinh`} tabular />
              </div>
            </div>

            {canManageEnrollments && (
            <div className="mt-6 rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5">
              <h2 className="mb-1">Ghi danh học sinh</h2>
              <p className="mb-3 text-sm text-neutral-500">
                {canUnenroll
                  ? "Tìm và thêm học sinh vào lớp, hoặc rút học sinh khỏi lớp (cần xác nhận)."
                  : "Tìm và thêm học sinh vào lớp được phân công."}
              </p>
              <EnrollmentManager
                classId={klass.id}
                courseId={klass.courseId}
                enrolledStudentIds={klass.studentIds}
                canUnenroll={canUnenroll}
              />
            </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function HeroItem({ label, value, tabular }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div>
      <p className="text-2xs font-bold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-neutral-900 ${tabular ? "tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}
