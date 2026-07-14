import { useQuery } from "@tanstack/react-query";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { buildViewerDashboard } from "@/services/firestore/viewerDashboard";

export default function ViewerDashboardPage() {
  const { userDoc } = useAuth();
  const studentIds = userDoc?.studentIds ?? [];
  const dashboard = useQuery({ queryKey: ["viewer-dashboard", studentIds], queryFn: () => buildViewerDashboard(studentIds), enabled: !!userDoc });
  const data = dashboard.data;

  return <ViewerShell>
    <PageHeader title="Tổng quan" description="Lịch học, bài tập, điểm số và học phí cần theo dõi." actions={<button type="button" onClick={() => dashboard.refetch()} disabled={dashboard.isFetching} className="min-h-touch rounded-input border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 transition hover:border-primary-300 hover:text-primary-700 disabled:cursor-wait disabled:opacity-60" style={{ transitionDuration: "var(--motion-duration)" }}>{dashboard.isFetching ? "Đang cập nhật" : "Làm mới"}</button>} />
    {dashboard.isLoading && <LoadingSkeleton rows={5} />}
    {dashboard.error && <ErrorState message="Không thể tải dữ liệu tổng quan. Vui lòng kiểm tra kết nối và thử lại." onRetry={() => dashboard.refetch()} />}
    {!dashboard.isLoading && !dashboard.error && !data && <EmptyState title="Chưa có dữ liệu tổng quan" description="Khi có lịch học, bài tập hoặc học phí, thông tin sẽ hiển thị ở đây." />}
    {data && <div className="grid gap-5 md:grid-cols-2">{
      [
        ["Lịch học sắp tới", data.nextSessions, "title"], ["Bài tập cần nộp", data.pendingAssignments, "title"], ["Giáo án tóm tắt", data.lessonPlans, "publicSummary"],
        ["Điểm gần nhất", data.latestScores, "assessmentName"], ["Chuyên cần", data.attendance, "status"], ["Học phí chưa xong", data.unpaidInvoices, "title"], ["Thông báo", data.announcements, "title"],
      ].map(([title, items, label]) => <DashboardSection key={String(title)} title={String(title)} items={items as Record<string, unknown>[]} label={String(label)} />)
    }</div>}
  </ViewerShell>;
}

function DashboardSection({ title, items, label }: { title: string; items: Record<string, unknown>[]; label: string }) {
  return <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4 shadow-[var(--shadow-1)]"><h2 className="text-base">{title}</h2>{items.length === 0 ? <p className="mt-3 text-sm text-neutral-500">Chưa có thông tin cần hiển thị.</p> : <ul className="mt-2 divide-y divide-neutral-100">{items.slice(0, 5).map((item, index) => <li key={String(item.id ?? index)} className="py-3 text-sm text-neutral-700">{String(item[label] ?? "Chưa có nội dung")}</li>)}</ul>}</section>;
}
