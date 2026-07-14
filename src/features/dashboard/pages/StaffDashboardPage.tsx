import { type ComponentType, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, format, isSameDay, subDays } from "date-fns";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  UserX,
  Wallet,
  type LucideProps,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/layouts/AppShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ROUTES } from "@/constants/routes";
import { getStaffDashboard } from "@/services/firestore/staffDashboard";
import { listSessions } from "@/services/firestore/sessions";
import { listAttendanceSummariesBySessionIds } from "@/services/firestore/attendance";
import { listInvoices } from "@/services/firestore/invoices";
import type { InvoiceStatus } from "@/types/academic";

type Tone = "primary" | "warning" | "accent" | "danger";

const TONE_CHIP: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-500",
  warning: "bg-warning-50 text-warning-700",
  accent: "bg-accent-50 text-accent-700",
  danger: "bg-danger-50 text-danger-700",
};
const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: "Đã thanh toán",
  pending: "Chờ xác nhận",
  unpaid: "Chưa thanh toán",
  overdue: "Quá hạn",
  rejected: "Từ chối",
};

function StatCard({ icon: Icon, tone, value, label, hint }: { icon: ComponentType<LucideProps>; tone: Tone; value: number; label: string; hint: string; }) {
  return (
    <div className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-input ${TONE_CHIP[tone]}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <p className="text-2xl font-bold tabular-nums text-neutral-900">{value}</p>
      <p className="text-sm font-semibold text-neutral-700">{label}</p>
      <p className="text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

function ActionRow({ to, tone, title, hint }: { to: string; tone: Tone; title: string; hint: string; }) {
  const dot = { primary: "bg-primary-500", warning: "bg-warning-500", accent: "bg-accent-500", danger: "bg-danger-500" }[tone];
  return (
    <Link to={to} className="flex min-h-touch items-center gap-3 border-t border-neutral-100 py-3 first:border-t-0 hover:bg-neutral-50">
      <span className={`h-2.5 w-2.5 flex-none rounded-full ${dot}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-neutral-800">{title}</span>
        <span className="block text-xs text-neutral-500">{hint}</span>
      </span>
      <ChevronRight size={17} className="flex-none text-neutral-300" aria-hidden="true" />
    </Link>
  );
}

export default function StaffDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: () => getStaffDashboard(),
  });

  const rangeStart = useMemo(() => subDays(new Date(), 13), []);
  const sessions14 = useQuery({ queryKey: ["dashboard-sessions-14"], queryFn: () => listSessions(rangeStart, new Date()) });
  const sessionIds14 = useMemo(() => sessions14.data?.map((item) => item.id) ?? [], [sessions14.data]);
  const summaries14 = useQuery({
    queryKey: ["dashboard-attendance-summaries", sessionIds14],
    queryFn: () => listAttendanceSummariesBySessionIds(sessionIds14),
    enabled: sessionIds14.length > 0,
  });
  const invoicesAll = useQuery({ queryKey: ["dashboard-invoices"], queryFn: listInvoices });

  const attendanceTrend = useMemo(() => {
    const days = eachDayOfInterval({ start: rangeStart, end: new Date() });
    const sessionById = new Map((sessions14.data ?? []).map((item) => [item.id, item]));
    return days.map((day) => {
      let present = 0;
      let total = 0;
      summaries14.data?.forEach((summary) => {
        const session = sessionById.get(summary.sessionId);
        if (session && isSameDay(session.startAt.toDate(), day)) {
          present += summary.present;
          total += summary.total;
        }
      });
      return { date: format(day, "dd/MM"), rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    });
  }, [rangeStart, sessions14.data, summaries14.data]);

  const invoiceStatusData = useMemo(() => {
    const counts: Record<InvoiceStatus, number> = { unpaid: 0, pending: 0, paid: 0, overdue: 0, rejected: 0 };
    invoicesAll.data?.forEach((invoice) => { counts[invoice.status] += 1; });
    return (Object.keys(counts) as InvoiceStatus[]).map((status) => ({ status: INVOICE_STATUS_LABEL[status], count: counts[status] }));
  }, [invoicesAll.data]);

  const actions: { to: string; tone: Tone; title: string; hint: string }[] = [];
  if (data) {
    if (data.ungraded > 0) actions.push({ to: ROUTES.STAFF_ASSIGNMENTS, tone: "accent", title: `Chấm ${data.ungraded} bài tập`, hint: "học sinh đã nộp, chờ chấm" });
    if (data.pendingInvoices > 0) actions.push({ to: ROUTES.STAFF_INVOICES, tone: "danger", title: `Xác nhận ${data.pendingInvoices} hóa đơn`, hint: "phụ huynh đã báo chuyển khoản" });
    if (data.absentToday > 0) actions.push({ to: ROUTES.STAFF_ATTENDANCE, tone: "warning", title: `${data.absentToday} lượt vắng/đi muộn hôm nay`, hint: "xem lại và nhắn phụ huynh" });
  }

  return (
    <AppShell>
      <PageHeader title="Tổng quan" description="Những việc cần chú ý hôm nay, lịch lớp sắp tới và tiến độ học tập." />
      {isLoading && <div className="mt-5"><LoadingSkeleton rows={4} /></div>}
      {isError && <div className="mt-5"><ErrorState message="Không tải được dữ liệu tổng quan." onRetry={() => refetch()} /></div>}

      {data && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={CalendarDays} tone="primary" value={data.today.total} label="Lớp hôm nay" hint={`${data.today.done} đã xong · ${data.today.upcoming} sắp tới`} />
            <StatCard icon={UserX} tone="warning" value={data.absentToday} label="Vắng/muộn hôm nay" hint="trên các buổi đã điểm danh" />
            <StatCard icon={ClipboardCheck} tone="accent" value={data.ungraded} label="Bài chưa chấm" hint="tổng các lớp" />
            <StatCard icon={Wallet} tone="danger" value={data.pendingInvoices} label="Hóa đơn chờ" hint="cần đối soát" />
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
              <h2 className="mb-2 text-base">Lớp sắp diễn ra hôm nay</h2>
              {data.upcomingSessions.length === 0 ? (
                <EmptyState title="Hôm nay không còn lớp nào" description="Các buổi hôm nay đã kết thúc hoặc chưa có lịch." />
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {data.upcomingSessions.map((session) => (
                    <li key={session.id} className="flex items-center gap-3 py-3">
                      <span className="min-w-[52px] rounded-input bg-primary-50 px-2 py-1 text-center text-xs font-bold tabular-nums text-primary-700">
                        {format(session.startAt, "HH:mm")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">{session.className}</p>
                        <p className="truncate text-xs text-neutral-500">{session.title}{session.location ? ` · ${session.location}` : ""}</p>
                      </div>
                      <Link
                        to={`${ROUTES.STAFF_ATTENDANCE}?session=${session.id}`}
                        className="flex min-h-touch items-center rounded-input bg-primary-500 px-3 text-xs font-semibold text-white hover:bg-primary-600"
                      >
                        Điểm danh
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
              <h2 className="mb-2 text-base">Cần xử lý</h2>
              {actions.length === 0 ? (
                <EmptyState title="Không có việc cần xử lý" description="Bạn đã chấm bài, đối soát hóa đơn và điểm danh xong." />
              ) : (
                <div>
                  {actions.map((action) => (
                    <ActionRow key={action.title} to={action.to} tone={action.tone} title={action.title} hint={action.hint} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
              <h2 className="mb-2 text-base">Xu hướng chuyên cần 14 ngày</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend} aria-label="Biểu đồ tỉ lệ có mặt theo ngày trong 14 ngày gần đây">
                    <XAxis dataKey="date" />
                    <YAxis unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => [`${value}%`, "Tỉ lệ có mặt"]} />
                    <Line type="monotone" dataKey="rate" stroke="#3366F0" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-card border border-neutral-200 bg-neutral-0 p-4">
              <h2 className="mb-2 text-base">Hóa đơn theo trạng thái</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={invoiceStatusData} layout="vertical" aria-label="Biểu đồ số lượng hóa đơn theo trạng thái">
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="status" width={100} />
                    <Tooltip formatter={(value: number) => [`${value} hóa đơn`, "Số lượng"]} />
                    <Bar dataKey="count" fill="#3366F0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
