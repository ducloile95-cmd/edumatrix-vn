import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, subDays } from "date-fns";
import { AlertTriangle, BookMarked, Copy, Eye, FileEdit, FileText, PenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { usePagination } from "@/hooks/usePagination";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses } from "@/services/firestore/classes";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { copyLessonPlan, listLessonPlans, listUpcomingSessionsWithoutLessonPlan } from "@/services/firestore/lessonPlans";
import { formatSessionLabel } from "@/utils/lessonPlan";
import { LessonPlanDetail } from "@/features/lesson-plans/components/LessonPlanDetail";
import type { LessonPlanDoc, LessonPlanStatus } from "@/types/academic";

interface LessonPlanListProps {
  onEdit: (plan: LessonPlanDoc & { id: string }) => void;
  onCreateNew: () => void;
}

const STATUS_TONE: Record<LessonPlanStatus, "success" | "neutral" | "warning"> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};
const STATUS_LABEL: Record<LessonPlanStatus, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};
const STATUS_FILTERS: { value: LessonPlanStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã xuất bản" },
  { value: "archived", label: "Lưu trữ" },
];

export function LessonPlanList({ onEdit, onCreateNew }: LessonPlanListProps) {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LessonPlanStatus | "all">("all");
  const [classFilter, setClassFilter] = useState("all");
  const [viewingPlan, setViewingPlan] = useState<(LessonPlanDoc & { id: string }) | null>(null);

  const { data: plans, isLoading, isError, refetch } = useQuery({ queryKey: ["lesson-plans"], queryFn: listLessonPlans });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const classById = useMemo(() => new Map((classes ?? []).map((item) => [item.id, item])), [classes]);
  const classIds = useMemo(() => (classes ?? []).map((item) => item.id), [classes]);

  const { data: gapSessions } = useQuery({
    queryKey: ["lesson-plan-gaps", classIds],
    queryFn: () => listUpcomingSessionsWithoutLessonPlan(classIds, 7),
    enabled: classIds.length > 0,
  });

  const { data: viewingSessions } = useQuery({
    queryKey: ["sessions-by-class", viewingPlan?.classId, "view"],
    queryFn: () => listSessionsByClass(viewingPlan?.classId as string, subDays(new Date(), 365), addDays(new Date(), 365), 300),
    enabled: !!viewingPlan?.classId && !!viewingPlan?.sessionId,
  });
  const viewingSession = viewingSessions?.find((item) => item.id === viewingPlan?.sessionId) ?? null;

  const copyMutation = useMutation({
    mutationFn: (id: string) => copyLessonPlan(id, firebaseUser?.uid ?? "unknown"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-plans"] }),
  });

  const filtered = useMemo(() => {
    if (!plans) return [];
    const keyword = search.trim().toLowerCase();
    return plans.filter((plan) => {
      const matchesKeyword = !keyword || plan.title.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
      const matchesClass = classFilter === "all" || plan.classId === classFilter;
      return matchesKeyword && matchesStatus && matchesClass;
    });
  }, [plans, search, statusFilter, classFilter]);
  const { page, pageSize, pageItems, setPage } = usePagination(filtered);

  const totalCount = plans?.length ?? 0;
  const draftCount = plans?.filter((plan) => plan.status === "draft").length ?? 0;
  const publishedCount = plans?.filter((plan) => plan.status === "published").length ?? 0;
  const archivedCount = plans?.filter((plan) => plan.status === "archived").length ?? 0;
  const gapCount = gapSessions?.length ?? 0;

  const hasRows = !isLoading && !isError && filtered.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} tone="primary" value={totalCount} label="Tổng số giáo án" hint="Tất cả trạng thái" />
        <StatCard icon={PenLine} tone="warning" value={draftCount} label="Bản nháp" hint="Chưa xuất bản cho phụ huynh" />
        <StatCard icon={BookMarked} tone="success" value={publishedCount} label="Đã xuất bản" hint={`${archivedCount} đã lưu trữ`} />
        <StatCard icon={AlertTriangle} tone="warning" value={gapCount} label="Buổi thiếu giáo án" hint="Trong 7 ngày tới" />
      </div>

      {gapSessions && gapSessions.length > 0 && (
        <div className="rounded-card border border-warning-100 bg-warning-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-warning-700">
            <AlertTriangle size={16} /> Buổi học sắp tới chưa có giáo án
          </p>
          <div className="space-y-2">
            {gapSessions.map((session) => (
              <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-warning-100 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {classById.get(session.classId)?.name ?? "Lớp"} · {formatSessionLabel(session)}
                  </p>
                </div>
                <Button size="sm" onClick={onCreateNew}>Soạn ngay</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataListPanel className="rounded-card border border-neutral-200 bg-white">
        <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Danh sách giáo án</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {plans ? `${filtered.length} giáo án phù hợp bộ lọc` : "Đang tải..."}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="lp-search" className="mb-1 block text-xs font-semibold text-neutral-500">Tìm kiếm</label>
              <SearchInput id="lp-search" value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Tìm theo tiêu đề giáo án" />
            </div>
            <div>
              <label htmlFor="lp-class-filter" className="mb-1 block text-xs font-semibold text-neutral-500">Lớp</label>
              <select
                id="lp-class-filter"
                value={classFilter}
                onChange={(event) => { setClassFilter(event.target.value); setPage(1); }}
                className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
              >
                <option value="all">Tất cả lớp</option>
                {classes?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-neutral-500">Trạng thái</p>
              <div className="grid min-h-touch grid-cols-4 gap-1 rounded-input border border-neutral-300 bg-neutral-50 p-1">
                {STATUS_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setStatusFilter(value); setPage(1); }}
                    className={`rounded-[7px] px-2 text-xs font-semibold transition ${
                      statusFilter === value ? "bg-primary-500 text-white shadow-[0_4px_12px_rgba(51,102,240,.18)]" : "text-neutral-600 hover:bg-white hover:text-primary-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`${DATA_LIST_SCROLL} p-4 sm:p-5`}>
          {isLoading && <LoadingSkeleton rows={5} />}
          {isError && <ErrorState message="Không tải được danh sách giáo án." onRetry={() => refetch()} />}
          {!isLoading && !isError && (!plans || plans.length === 0) && (
            <EmptyState title="Chưa có giáo án nào" description="Bấm Soạn giáo án mới để bắt đầu." />
          )}
          {!isLoading && !isError && plans && plans.length > 0 && filtered.length === 0 && (
            <EmptyState title="Không tìm thấy giáo án phù hợp" />
          )}

          {hasRows && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th scope="col" className="px-3 py-2.5">Tiêu đề</th>
                    <th scope="col" className="px-3 py-2.5">Lớp</th>
                    <th scope="col" className="px-3 py-2.5">Buổi học</th>
                    <th scope="col" className="px-3 py-2.5">Hoạt động</th>
                    <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                    <th scope="col" className="px-3 py-2.5">Cập nhật</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((plan) => {
                    const totalMinutes = plan.activities.reduce((sum, item) => sum + item.durationMinutes, 0);
                    return (
                      <tr key={plan.id} className="transition hover:bg-neutral-50">
                        <td className="px-3 py-3 font-medium text-neutral-900">{plan.title}</td>
                        <td className="px-3 py-3 text-neutral-600">{plan.classId ? classById.get(plan.classId)?.name ?? "—" : "Chưa gắn lớp"}</td>
                        <td className="px-3 py-3 text-neutral-600">{plan.sessionId ? "Đã gắn buổi học" : "Chưa gắn"}</td>
                        <td className="px-3 py-3 tabular-nums text-neutral-600">{plan.activities.length} hoạt động · {totalMinutes} phút</td>
                        <td className="px-3 py-3"><StatusBadge tone={STATUS_TONE[plan.status]}>{STATUS_LABEL[plan.status]}</StatusBadge></td>
                        <td className="px-3 py-3 tabular-nums text-neutral-500">{format(plan.updatedAt.toDate(), "dd/MM/yyyy")}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button type="button" title="Xem" aria-label="Xem" onClick={() => setViewingPlan(plan)} className="flex size-8 items-center justify-center rounded-input border border-neutral-300 text-neutral-500 hover:border-primary-300 hover:text-primary-700">
                              <Eye size={15} />
                            </button>
                            <button type="button" title="Sao chép" aria-label="Sao chép" onClick={() => copyMutation.mutate(plan.id)} className="flex size-8 items-center justify-center rounded-input border border-neutral-300 text-neutral-500 hover:border-primary-300 hover:text-primary-700">
                              <Copy size={15} />
                            </button>
                            <button type="button" title="Sửa" aria-label="Sửa" onClick={() => onEdit(plan)} className="flex size-8 items-center justify-center rounded-input border border-neutral-300 text-neutral-500 hover:border-primary-300 hover:text-primary-700">
                              <FileEdit size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
        {hasRows && <div className={DATA_LIST_FOOTER}><Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} itemLabel="giáo án" /></div>}
      </DataListPanel>

      <Modal open={!!viewingPlan} onClose={() => setViewingPlan(null)} size="lg" title="Giáo án">
        {viewingPlan && (
          <LessonPlanDetail
            plan={viewingPlan}
            classLabel={viewingPlan.classId ? classById.get(viewingPlan.classId)?.name : null}
            sessionLabel={viewingSession ? formatSessionLabel(viewingSession) : null}
          />
        )}
      </Modal>
    </div>
  );
}
