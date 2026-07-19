import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleDollarSign, Clock3, Plus, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { ChartEmpty, ChartPanel } from "@/components/charts/ChartPanel";
import { ChartGradientDefs, CHART_DEPTH_FILTER, CHART_GRADIENT } from "@/components/charts/ChartGradientDefs";
import { CHART_AXIS_TICK, CHART_TOOLTIP_STYLE } from "@/components/charts/chartTheme";
import { Button } from "@/components/ui/Button";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createInvoice, listInvoices, listPayments, reconcilePayment } from "@/services/firestore/invoices";
import { getPaymentSettings } from "@/services/firestore/settings";
import { listStudents } from "@/services/firestore/students";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { formatVnd } from "@/utils/currency";
import type { InvoiceStatus } from "@/types/academic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { USER_ROLES } from "@/constants/roles";

type FinanceTab = "overview" | "invoices" | "reconcile";

const INVOICE_STATUS_TONE: Record<InvoiceStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  paid: "success",
  pending: "info",
  unpaid: "neutral",
  overdue: "danger",
  rejected: "warning",
};

const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: "Đã thanh toán",
  pending: "Chờ xác nhận",
  unpaid: "Chưa thanh toán",
  overdue: "Quá hạn",
  rejected: "Từ chối",
};

const STATUS_FILTER_OPTIONS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "unpaid", label: INVOICE_STATUS_LABEL.unpaid },
  { value: "pending", label: INVOICE_STATUS_LABEL.pending },
  { value: "paid", label: INVOICE_STATUS_LABEL.paid },
  { value: "overdue", label: INVOICE_STATUS_LABEL.overdue },
  { value: "rejected", label: INVOICE_STATUS_LABEL.rejected },
];

const TABS: Array<{ value: FinanceTab; label: string }> = [
  { value: "overview", label: "Tổng quan" },
  { value: "invoices", label: "Công nợ" },
  { value: "reconcile", label: "Đối soát" },
];

const INITIAL_FORM = {
  studentId: "",
  classId: "",
  sessionCount: 1,
  title: "Học phí",
  amount: 0,
  dueAt: "",
  bankBin: "970436",
  accountNumber: "",
  accountName: "EDUMATRIX",
};

export default function InvoicesPage() {
  const reducedMotion = useReducedMotion();
  const { firebaseUser, role } = useAuth();
  const isAdmin = role === USER_ROLES.ADMIN;
  const client = useQueryClient();
  const students = useQuery({ queryKey: ["students", role, firebaseUser?.uid], queryFn: listStudents });
  const invoices = useQuery({ queryKey: ["invoices", role, firebaseUser?.uid], queryFn: listInvoices });
  const payments = useQuery({ queryKey: ["payments", role, firebaseUser?.uid], queryFn: listPayments });
  const classes = useQuery({ queryKey: ["classes", role, firebaseUser?.uid], queryFn: listClasses });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const paymentSettings = useQuery({
    queryKey: ["settings", "payment"],
    queryFn: getPaymentSettings,
    enabled: isAdmin,
  });
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [form, setForm] = useState(INITIAL_FORM);
  const [amountTouched, setAmountTouched] = useState(false);

  const classById = useMemo(() => new Map((classes.data ?? []).map((klass) => [klass.id, klass])), [classes.data]);
  const courseById = useMemo(() => new Map((courses.data ?? []).map((course) => [course.id, course])), [courses.data]);
  const studentNameById = useMemo(() => new Map((students.data ?? []).map((student) => [student.id, student.fullName])), [students.data]);
  const invoiceById = useMemo(() => new Map((invoices.data ?? []).map((invoice) => [invoice.id, invoice])), [invoices.data]);
  const selectedClass = form.classId ? classById.get(form.classId) : undefined;
  const selectedCourse = selectedClass ? courseById.get(selectedClass.courseId) : undefined;
  const unitPrice = selectedCourse
    ? selectedCourse.pricePerSession ?? Math.round(selectedCourse.tuitionFee / selectedCourse.totalSessions)
    : null;
  const computedAmount = unitPrice === null ? null : unitPrice * form.sessionCount;

  useEffect(() => {
    if (computedAmount !== null && !amountTouched) {
      setForm((current) => ({ ...current, amount: computedAmount }));
    }
  }, [computedAmount, amountTouched]);

  useEffect(() => {
    const payment = paymentSettings.data;
    if (!payment) return;
    setForm((current) => ({
      ...current,
      bankBin: payment.bankBin,
      accountNumber: payment.accountNumber,
      accountName: payment.accountName,
    }));
  }, [paymentSettings.data]);

  const create = useMutation({
    mutationFn: () => createInvoice({
      studentId: form.studentId,
      courseId: selectedCourse?.id ?? null,
      title: form.title,
      amount: Number(form.amount),
      dueAt: new Date(form.dueAt),
      bankBin: form.bankBin,
      accountNumber: form.accountNumber,
      accountName: form.accountName,
      actorUid: firebaseUser?.uid ?? "unknown",
    }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["invoices"] });
      setForm(INITIAL_FORM);
      setAmountTouched(false);
      setCreateOpen(false);
      setActiveTab("invoices");
    },
  });

  const reconcile = useMutation({
    mutationFn: ({ payment, status }: { payment: NonNullable<typeof payments.data>[number]; status: "verified" | "rejected" }) => {
      if (!isAdmin) throw new Error("Chỉ Admin được đối soát thanh toán");
      return reconcilePayment(payment, status, firebaseUser?.uid ?? "unknown");
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["payments"] });
      client.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const setField = (field: keyof typeof form, value: string | number) =>
    setForm((current) => ({ ...current, [field]: value }));

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    return (invoices.data ?? []).filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (!term) return true;
      const studentName = studentNameById.get(invoice.studentId) ?? "";
      return `${invoice.invoiceCode} ${studentName} ${invoice.title}`.toLocaleLowerCase("vi").includes(term);
    });
  }, [invoices.data, search, statusFilter, studentNameById]);

  const financeSummary = useMemo(() => {
    const list = invoices.data ?? [];
    const valid = list.filter((invoice) => invoice.status !== "rejected");
    const billed = valid.reduce((sum, invoice) => sum + invoice.amount, 0);
    const collected = valid.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.amount, 0);
    const outstanding = valid.filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + invoice.amount, 0);
    const pendingCount = (payments.data ?? []).filter((payment) => payment.status === "reported").length;
    const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
    return { billed, collected, outstanding, pendingCount, collectionRate };
  }, [invoices.data, payments.data]);

  const monthlyChart = useMemo(() => {
    const buckets = new Map<string, { month: string; duKien: number; thucThu: number }>();
    (invoices.data ?? []).forEach((invoice) => {
      if (invoice.status === "rejected") return;
      const key = format(invoice.dueAt.toDate(), "MM/yyyy");
      const bucket = buckets.get(key) ?? { month: key, duKien: 0, thucThu: 0 };
      bucket.duKien += invoice.amount;
      if (invoice.status === "paid") bucket.thucThu += invoice.amount;
      buckets.set(key, bucket);
    });
    return [...buckets.values()]
      .sort((a, b) => a.month.split("/").reverse().join("").localeCompare(b.month.split("/").reverse().join("")))
      .slice(-6);
  }, [invoices.data]);

  const statusChart = useMemo(() => {
    const counts: Record<InvoiceStatus, number> = { unpaid: 0, pending: 0, paid: 0, overdue: 0, rejected: 0 };
    (invoices.data ?? []).forEach((invoice) => { counts[invoice.status] += 1; });
    return (Object.keys(counts) as InvoiceStatus[]).map((status) => ({ status: INVOICE_STATUS_LABEL[status], count: counts[status] }));
  }, [invoices.data]);

  const reportedPayments = (payments.data ?? []).filter((payment) => payment.status === "reported");
  const historyPayments = (payments.data ?? []).filter((payment) => payment.status !== "reported");
  const isLoading = invoices.isLoading || payments.isLoading || students.isLoading;

  return (
    <AppShell>
      <PageHeader
        actions={isAdmin ? <Button variant="primary" icon={<Plus size={17} />} onClick={() => setCreateOpen(true)}>Tạo hóa đơn</Button> : undefined}
      />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-neutral-200" role="tablist" aria-label="Điều hướng tài chính">
        {TABS.filter((tab) => isAdmin || tab.value !== "reconcile").map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`relative min-h-touch shrink-0 px-4 text-sm font-semibold transition ${activeTab === tab.value ? "text-primary-700" : "text-neutral-500 hover:text-neutral-800"}`}
          >
            {tab.label}
            {tab.value === "reconcile" && financeSummary.pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-danger-50 px-2 py-0.5 text-[11px] font-bold text-danger-700">{financeSummary.pendingCount}</span>
            )}
            {activeTab === tab.value && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary-500" />}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="motion-content-enter space-y-4">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard icon={ReceiptText} tone="primary" value={formatCompactVnd(financeSummary.billed)} label="Tổng phải thu" hint={`${invoices.data?.length ?? 0} hóa đơn đã phát hành`} />
            <StatCard icon={CircleDollarSign} tone="success" value={formatCompactVnd(financeSummary.collected)} label="Đã thu" hint={`${financeSummary.collectionRate}% tổng giá trị hóa đơn`} />
            <StatCard icon={WalletCards} tone="warning" value={formatCompactVnd(financeSummary.outstanding)} label="Công nợ còn lại" hint="Chưa thu và đang chờ xác nhận" />
            <StatCard icon={Clock3} tone={financeSummary.pendingCount > 0 ? "danger" : "neutral"} value={financeSummary.pendingCount} label={isAdmin ? "Chờ đối soát" : "Đang chờ Admin"} hint={isAdmin ? "Giao dịch cần xử lý thủ công" : "Teacher chỉ được theo dõi"} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <ChartPanel title="Dòng tiền theo tháng" description="So sánh giá trị phải thu và số tiền đã xác nhận" className="min-h-[390px]">
              {monthlyChart.length === 0 ? <ChartEmpty text="Chưa có dữ liệu dòng tiền." /> : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChart} barGap={8} aria-label="Biểu đồ phải thu và thực thu theo tháng">
                      {ChartGradientDefs()}
                      <XAxis dataKey="month" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatAxisVnd(value)} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => formatVnd(value)} />
                      <Legend />
                      <Bar dataKey="duKien" name="Phải thu" fill={CHART_GRADIENT.primarySoft} filter={CHART_DEPTH_FILTER} radius={[9, 9, 2, 2]} isAnimationActive={!reducedMotion} animationDuration={280} />
                      <Bar dataKey="thucThu" name="Đã thu" fill={CHART_GRADIENT.success} filter={CHART_DEPTH_FILTER} radius={[9, 9, 2, 2]} isAnimationActive={!reducedMotion} animationDuration={280} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

            <ChartPanel title="Trạng thái hóa đơn" description="Khối lượng xử lý ở từng giai đoạn" className="min-h-[390px]">
              {statusChart.every((item) => item.count === 0) ? <ChartEmpty text="Chưa có hóa đơn." /> : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChart} layout="vertical" margin={{ left: 12 }} aria-label="Biểu đồ hóa đơn theo trạng thái">
                      {ChartGradientDefs()}
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis type="category" dataKey="status" width={112} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => [`${value} hóa đơn`, "Số lượng"]} />
                      <Bar dataKey="count" fill={CHART_GRADIENT.primary} filter={CHART_DEPTH_FILTER} radius={[0, 10, 10, 0]} barSize={18} isAnimationActive={!reducedMotion} animationDuration={280} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>
          </section>

          {isAdmin && financeSummary.pendingCount > 0 && (
            <button type="button" onClick={() => setActiveTab("reconcile")} className="flex w-full items-center justify-between rounded-card border border-warning-100 bg-warning-50 p-4 text-left transition hover:border-warning-200">
              <span className="flex items-center gap-3"><ShieldCheck className="text-warning-700" size={21} /><span><span className="block text-sm font-bold text-neutral-900">Có {financeSummary.pendingCount} giao dịch đang chờ</span><span className="text-xs text-neutral-600">Mở hàng đợi đối soát để xác nhận hoặc từ chối.</span></span></span>
              <span className="text-sm font-bold text-warning-700">Xử lý ngay</span>
            </button>
          )}
        </div>
      )}

      {activeTab === "invoices" && (
        <DataListPanel className="motion-content-enter rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="shrink-0 border-b border-neutral-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div><h2 className="text-base font-bold text-neutral-900">Danh sách công nợ</h2><p className="mt-1 text-sm text-neutral-500">{filteredInvoices.length} hóa đơn phù hợp bộ lọc</p></div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="w-full sm:w-80"><SearchInput value={search} onChange={setSearch} placeholder="Tìm mã, học sinh hoặc nội dung" /></div>
                <select aria-label="Lọc trạng thái hóa đơn" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as InvoiceStatus | "all")} className="min-h-touch rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-700">
                  {STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className={DATA_LIST_SCROLL}>
            {isLoading && <div className="p-5"><LoadingSkeleton rows={6} /></div>}
            {invoices.isError && <div className="p-5"><ErrorState message="Không tải được danh sách hóa đơn." onRetry={() => invoices.refetch()} /></div>}
            {!isLoading && !invoices.isError && filteredInvoices.length === 0 && <div className="grid h-full place-items-center p-6"><EmptyState title="Không có hóa đơn phù hợp" /></div>}
            {!isLoading && filteredInvoices.length > 0 && (
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">
                    <th className="px-5 py-3">Hóa đơn</th><th className="px-4 py-3">Học sinh</th><th className="px-4 py-3">Hạn thanh toán</th><th className="px-4 py-3 text-right">Số tiền</th><th className="px-5 py-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="transition hover:bg-neutral-50/80">
                      <td className="px-5 py-4"><p className="font-bold text-neutral-900">{invoice.invoiceCode}</p><p className="mt-0.5 text-xs text-neutral-500">{invoice.title}</p></td>
                      <td className="px-4 py-4 font-medium text-neutral-700">{studentNameById.get(invoice.studentId) ?? invoice.studentId}</td>
                      <td className="px-4 py-4"><p className="tabular-nums text-neutral-700">{format(invoice.dueAt.toDate(), "dd/MM/yyyy")}</p>{invoice.status === "overdue" && <p className="mt-0.5 text-xs font-semibold text-danger-700">Đã quá hạn</p>}</td>
                      <td className="px-4 py-4 text-right font-bold tabular-nums text-neutral-900">{formatVnd(invoice.amount)}</td>
                      <td className="px-5 py-4 text-right"><StatusBadge tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className={DATA_LIST_FOOTER}><p className="text-xs text-neutral-500">Tổng giá trị đang hiển thị: <strong className="text-neutral-800">{formatVnd(filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))}</strong></p></div>
        </DataListPanel>
      )}

      {isAdmin && activeTab === "reconcile" && (
        <DataListPanel className="motion-content-enter rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="shrink-0 border-b border-neutral-200 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-neutral-900">Hàng đợi đối soát</h2><p className="mt-1 text-sm text-neutral-500">Kiểm tra mã giao dịch trước khi xác nhận thu tiền.</p></div><span className="rounded-full bg-warning-50 px-3 py-1 text-xs font-bold text-warning-700">{reportedPayments.length} đang chờ</span></div></div>
          <div className={DATA_LIST_SCROLL}>
            {payments.isLoading && <div className="p-5"><LoadingSkeleton rows={5} /></div>}
            {payments.isError && <div className="p-5"><ErrorState message="Không tải được dữ liệu thanh toán." onRetry={() => payments.refetch()} /></div>}
            {!payments.isLoading && reportedPayments.length === 0 && <div className="grid h-full place-items-center p-6"><EmptyState title="Không có giao dịch chờ đối soát" description="Các giao dịch phụ huynh báo chuyển khoản sẽ xuất hiện tại đây." /></div>}
            <ul className="divide-y divide-neutral-100">
              {reportedPayments.map((payment) => {
                const invoice = invoiceById.get(payment.invoiceId);
                return (
                  <li key={payment.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                    <div><p className="text-sm font-bold text-neutral-900">{studentNameById.get(payment.studentId) ?? payment.studentId}</p><p className="mt-1 text-xs text-neutral-500">{invoice?.invoiceCode ?? payment.invoiceId} · {invoice?.title ?? "Thanh toán học phí"}</p></div>
                    <div><p className="text-lg font-bold tabular-nums text-neutral-900">{formatVnd(payment.amount)}</p><p className="mt-1 font-mono text-xs text-neutral-500">Mã GD: {payment.transactionReference || "Chưa cung cấp"}</p>{payment.note && <p className="mt-1 text-xs text-neutral-500">{payment.note}</p>}</div>
                    <div className="flex gap-2"><Button size="sm" variant="primary" disabled={reconcile.isPending} onClick={() => reconcile.mutate({ payment, status: "verified" })}>Xác nhận</Button><Button size="sm" variant="danger" disabled={reconcile.isPending} onClick={() => reconcile.mutate({ payment, status: "rejected" })}>Từ chối</Button></div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className={DATA_LIST_FOOTER}><p className="text-xs text-neutral-500">Lịch sử đã xử lý: {historyPayments.length} giao dịch</p>{reconcile.isError && <p role="alert" className="mt-1 text-xs font-semibold text-danger-700">Không thể đối soát. Kiểm tra kết nối và thử lại.</p>}</div>
        </DataListPanel>
      )}

      {isAdmin && <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo hóa đơn học phí" description="Chọn học sinh và lớp để hệ thống tính học phí theo số buổi." size="lg">
        <form onSubmit={(event) => { event.preventDefault(); if (!create.isPending) create.mutate(); }} className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,.8fr)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Học sinh" required><select required value={form.studentId} onChange={(event) => setField("studentId", event.target.value)} className={FIELD_CLASS}><option value="">Chọn học sinh</option>{students.data?.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></FormField>
            <FormField label="Lớp học"><select value={form.classId} onChange={(event) => { setField("classId", event.target.value); setAmountTouched(false); }} className={FIELD_CLASS}><option value="">Không gắn lớp, nhập tay</option>{classes.data?.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}</select></FormField>
            <FormField label="Nội dung thu" required><input required value={form.title} onChange={(event) => setField("title", event.target.value)} className={FIELD_CLASS} /></FormField>
            <FormField label="Số buổi" required><input required type="number" min={1} step={1} value={form.sessionCount} onChange={(event) => setField("sessionCount", Number(event.target.value))} className={FIELD_CLASS} /></FormField>
            <FormField label="Số tiền" required><input required type="number" min={1} value={form.amount || ""} onChange={(event) => { setAmountTouched(true); setField("amount", Number(event.target.value)); }} className={FIELD_CLASS} /></FormField>
            <FormField label="Hạn thanh toán" required><input required type="date" value={form.dueAt} onChange={(event) => setField("dueAt", event.target.value)} className={FIELD_CLASS} /></FormField>
            <FormField label="Số tài khoản" required><input required value={form.accountNumber} readOnly className={`${FIELD_CLASS} bg-neutral-100`} /></FormField>
            <FormField label="Tên tài khoản"><input value={form.accountName} readOnly className={`${FIELD_CLASS} bg-neutral-100`} /></FormField>
            <FormField label="Mã ngân hàng"><input value={form.bankBin} readOnly className={`${FIELD_CLASS} bg-neutral-100`} /></FormField>
            <p className="text-xs leading-5 text-neutral-500 sm:col-span-2">Thông tin VietQR được quản lý tại Cài đặt và snapshot vào hóa đơn này.</p>
          </div>
          <aside className="flex flex-col rounded-card border border-primary-100 bg-primary-50/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-700">Xem trước hóa đơn</p>
            <p className="mt-5 text-sm text-neutral-500">Học sinh</p><p className="mt-1 font-bold text-neutral-900">{studentNameById.get(form.studentId) ?? "Chưa chọn học sinh"}</p>
            <p className="mt-4 text-sm text-neutral-500">Khóa học</p><p className="mt-1 font-bold text-neutral-900">{selectedCourse?.name ?? "Nhập thủ công"}</p>
            {unitPrice !== null && <p className="mt-1 text-xs text-neutral-500">{formatVnd(unitPrice)} × {form.sessionCount} buổi</p>}
            <div className="my-5 border-t border-primary-100" />
            <p className="text-sm text-neutral-500">Tổng thanh toán</p><p className="mt-1 text-3xl font-bold tabular-nums text-primary-700">{form.amount ? formatVnd(form.amount) : "0 đ"}</p>
            <div className="mt-auto pt-6"><Button type="submit" variant="primary" className="w-full" disabled={create.isPending}>{create.isPending ? "Đang tạo..." : "Phát hành hóa đơn"}</Button>{create.isError && <p role="alert" className="mt-3 text-xs font-semibold text-danger-700">Không thể tạo hóa đơn. Dữ liệu vẫn được giữ lại.</p>}</div>
          </aside>
        </form>
      </Modal>}
    </AppShell>
  );
}

const FIELD_CLASS = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

function FormField({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-600">{label}{required && <span className="ml-0.5 text-danger-500">*</span>}</span>{children}</label>;
}

function formatCompactVnd(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  return formatVnd(value);
}

function formatAxisVnd(value: number) {
  if (value >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)}tỷ`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}tr`;
  return `${Math.round(value / 1_000)}k`;
}
