import { useQuery } from "@tanstack/react-query";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { buildViewerDashboard } from "@/services/firestore/viewerDashboard";

export default function ViewerDashboardPage() {
  const { userDoc } = useAuth();
  const studentIds = userDoc?.studentIds ?? [];
  const dashboard = useQuery({ queryKey: ["viewer-dashboard", studentIds], queryFn: () => buildViewerDashboard(studentIds), enabled: !!userDoc });
  const data = dashboard.data;
  return <ViewerShell><div className="flex items-center justify-between"><h1>Tong quan</h1><button onClick={() => dashboard.refetch()} disabled={dashboard.isFetching} className="min-h-touch rounded-input border px-3 text-sm">{dashboard.isFetching ? "Dang tai" : "Lam moi"}</button></div>{dashboard.isLoading ? <p className="mt-5 text-sm text-neutral-500">Dang tong hop du lieu</p> : dashboard.error ? <p className="mt-5 text-sm text-danger-600">Khong the tai du lieu. Vui long thu lai.</p> : !data ? <p className="mt-5 text-sm text-neutral-500">Chua co du lieu</p> : <div className="mt-5 grid gap-6 md:grid-cols-2"><DashboardSection title="Lich hoc sap toi" items={data.nextSessions} label="title"/><DashboardSection title="Bai tap can nop" items={data.pendingAssignments} label="title"/><DashboardSection title="Giao an tom tat" items={data.lessonPlans} label="publicSummary"/><DashboardSection title="Diem gan nhat" items={data.latestScores} label="assessmentName"/><DashboardSection title="Chuyen can" items={data.attendance} label="status"/><DashboardSection title="Hoc phi chua xong" items={data.unpaidInvoices} label="title"/><DashboardSection title="Thong bao" items={data.announcements} label="title"/></div>}</ViewerShell>;
}
function DashboardSection({ title, items, label }: { title: string; items: Record<string, unknown>[]; label: string }) { return <section className="border-t border-neutral-200 pt-3"><h2>{title}</h2>{items.length===0?<p className="mt-2 text-sm text-neutral-500">Khong co du lieu</p>:<ul className="mt-2 divide-y">{items.slice(0,5).map((item,index)=><li key={String(item.id??index)} className="py-2 text-sm">{String(item[label]??"")}</li>)}</ul>}</section>; }
