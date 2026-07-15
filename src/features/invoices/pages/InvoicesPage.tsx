import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/layouts/AppShell";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createInvoice, listInvoices, listPayments, reconcilePayment } from "@/services/firestore/invoices";
import { listStudents } from "@/services/firestore/students";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import type { InvoiceStatus, PaymentStatus } from "@/types/academic";

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
const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  reported: "Đã báo chuyển khoản",
  verified: "Đã xác nhận",
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

export default function InvoicesPage() {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const payments = useQuery({ queryKey: ["payments"], queryFn: listPayments });
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [form, setForm] = useState({ studentId: "", classId: "", sessionCount: 1, title: "Học phí", amount: 0, dueAt: "", bankBin: "970436", accountNumber: "", accountName: "EDUMATRIX" });
  const [amountTouched, setAmountTouched] = useState(false);

  const classById = useMemo(() => new Map((classes.data ?? []).map((klass) => [klass.id, klass])), [classes.data]);
  const courseById = useMemo(() => new Map((courses.data ?? []).map((course) => [course.id, course])), [courses.data]);
  const selectedClass = form.classId ? classById.get(form.classId) : undefined;
  const selectedCourse = selectedClass ? courseById.get(selectedClass.courseId) : undefined;
  // Hoc phi tinh tren 1 buoi - khong tinh ca khoa (ke hoach 15/07/2026).
  const computedAmount = selectedCourse
    ? (selectedCourse.pricePerSession ?? Math.round(selectedCourse.tuitionFee / selectedCourse.totalSessions)) * form.sessionCount
    : null;

  useEffect(() => {
    if (computedAmount !== null && !amountTouched) {
      setForm((current) => ({ ...current, amount: computedAmount }));
    }
  }, [computedAmount, amountTouched]);

  const create = useMutation({
    mutationFn: () =>
      createInvoice({
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
    onSuccess: () => { client.invalidateQueries({ queryKey: ["invoices"] }); },
  });
  const reconcile = useMutation({
    mutationFn: ({ payment, status }: { payment: NonNullable<typeof payments.data>[number]; status: "verified" | "rejected" }) => reconcilePayment(payment, status, firebaseUser?.uid ?? "unknown"),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["payments"] }); client.invalidateQueries({ queryKey: ["invoices"] }); },
  });
  const setField = (field: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [field]: value }));

  const studentNameById = useMemo(() => new Map((students.data ?? []).map((student) => [student.id, student.fullName])), [students.data]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (invoices.data ?? []).filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (!term) return true;
      const studentName = studentNameById.get(invoice.studentId) ?? "";
      return invoice.invoiceCode.toLowerCase().includes(term) || studentName.toLowerCase().includes(term);
    });
  }, [invoices.data, search, statusFilter, studentNameById]);

  const monthlyChart = useMemo(() => {
    const buckets = new Map<string, { month: string; duKien: number; thucThu: number }>();
    (invoices.data ?? []).forEach((invoice) => {
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

  return (
    <AppShell>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!create.isPending) create.mutate();
        }}
        className="grid gap-3 border-y py-4 md:grid-cols-3"
      >
        <select aria-label="Học sinh" required value={form.studentId} onChange={(event) => setField("studentId", event.target.value)} className="min-h-touch rounded-input border px-3">
          <option value="">Chọn học sinh</option>
          {students.data?.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName}
            </option>
          ))}
        </select>
        <select aria-label="Lớp học" value={form.classId} onChange={(event) => setField("classId", event.target.value)} className="min-h-touch rounded-input border px-3">
          <option value="">-- Không gắn lớp (nhập tay) --</option>
          {classes.data?.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </select>
        <input aria-label="Số buổi" type="number" min={1} step={1} placeholder="Số buổi" value={form.sessionCount} onChange={(event) => setField("sessionCount", Number(event.target.value))} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Tiêu đề hóa đơn" value={form.title} onChange={(event) => setField("title", event.target.value)} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Số tiền" required type="number" min={1} placeholder="Số tiền" value={form.amount || ""} onChange={(event) => { setAmountTouched(true); setField("amount", Number(event.target.value)); }} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Hạn thanh toán" required type="date" value={form.dueAt} onChange={(event) => setField("dueAt", event.target.value)} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Mã ngân hàng" placeholder="Bank BIN" value={form.bankBin} onChange={(event) => setField("bankBin", event.target.value)} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Số tài khoản" required placeholder="Số tài khoản" value={form.accountNumber} onChange={(event) => setField("accountNumber", event.target.value)} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Tên tài khoản" placeholder="Tên tài khoản" value={form.accountName} onChange={(event) => setField("accountName", event.target.value)} className="min-h-touch rounded-input border px-3" />
        <button disabled={create.isPending} className="min-h-touch rounded-input bg-primary-500 px-5 text-white disabled:opacity-50">
          {create.isPending ? "Đang tạo..." : "Tạo hóa đơn"}
        </button>
        {create.isError && (
          <p role="alert" className="text-sm text-danger-700 md:col-span-3">
            Không thể tạo hóa đơn. Dữ liệu vẫn còn, vui lòng thử lại.
          </p>
        )}
      </form>

      <section className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2>Công nợ</h2>
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo mã hóa đơn hoặc tên học sinh" />
            <select
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as InvoiceStatus | "all")}
              className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredInvoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Không có hóa đơn phù hợp.</p>
        ) : (
          <ul className="divide-y">
            {filteredInvoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  {invoice.invoiceCode} · {studentNameById.get(invoice.studentId) ?? invoice.studentId} · {invoice.amount.toLocaleString("vi-VN")} đ
                </span>
                <StatusBadge tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h2>Dự kiến và thực thu theo tháng</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} aria-label="Biểu đồ học phí dự kiến và thực thu theo tháng">
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}tr`} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString("vi-VN")} đ`} />
                <Legend />
                <Bar dataKey="duKien" name="Dự kiến" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="thucThu" name="Thực thu" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2>Hóa đơn theo trạng thái</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChart} layout="vertical" aria-label="Biểu đồ số lượng hóa đơn theo trạng thái">
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="status" width={110} />
                <Tooltip formatter={(value: number) => [`${value} hóa đơn`, "Số lượng"]} />
                <Bar dataKey="count" fill="#3366F0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <h2>Thanh toán chờ đối soát</h2>
        <ul className="divide-y">
          {payments.data?.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-sm">
                {payment.studentId} · {payment.amount.toLocaleString("vi-VN")} đ · {payment.transactionReference || "Không có mã GD"} ·{" "}
                {PAYMENT_STATUS_LABEL[payment.status]}
              </span>
              {payment.status === "reported" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={reconcile.isPending}
                    onClick={() => reconcile.mutate({ payment, status: "verified" })}
                    className="rounded-input bg-primary-500 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Xác nhận
                  </button>
                  <button
                    type="button"
                    disabled={reconcile.isPending}
                    onClick={() => reconcile.mutate({ payment, status: "rejected" })}
                    className="rounded-input border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {reconcile.isError && (
          <p role="alert" className="mt-3 text-sm text-danger-700">
            Không thể đối soát. Vui lòng kiểm tra mạng và thử lại.
          </p>
        )}
      </section>
    </AppShell>
  );
}
