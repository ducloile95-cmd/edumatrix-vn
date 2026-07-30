import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/features/invoices/constants";
import { ViewerStudentSwitcher } from "@/features/students/components/ViewerStudentSwitcher";
import { useViewerStudentSelection } from "@/features/students/hooks/useViewerStudentSelection";
import { listInvoicesByStudents, reportPayment } from "@/services/firestore/invoices";
import { getStudent } from "@/services/firestore/students";
import type { InvoiceDoc, InvoiceStatus } from "@/types/academic";
import { formatVnd } from "@/utils/currency";
import { buildVietQrImageUrl } from "@/utils/payment";

type Invoice = InvoiceDoc & { id: string };

const INVOICE_PRIORITY: Record<InvoiceStatus, number> = {
  overdue: 0,
  rejected: 1,
  unpaid: 2,
  pending: 3,
  paid: 4,
};

const REPORTABLE_STATUSES: InvoiceStatus[] = ["unpaid", "overdue", "rejected"];

export default function ViewerTuitionPage() {
  const { firebaseUser, userDoc } = useAuth();
  const client = useQueryClient();
  const studentIds = userDoc?.studentIds ?? [];
  const studentQueries = useQueries({
    queries: studentIds.map((id) => ({ queryKey: ["student", id], queryFn: () => getStudent(id) })),
  });
  const students = studentQueries.flatMap((query) => query.data ? [query.data] : []);
  const { selectedStudentId, selectStudent } = useViewerStudentSelection(students);
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const activeStudentId = selectedStudent?.id ?? "";
  const invoices = useQuery({
    queryKey: ["viewer-invoices", studentIds],
    queryFn: () => listInvoicesByStudents(studentIds),
    enabled: studentIds.length > 0,
  });
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [reference, setReference] = useState("");
  const report = useMutation({
    mutationFn: () => (selected ? reportPayment(selected, firebaseUser?.uid ?? "unknown", reference, "") : Promise.resolve()),
    onSuccess: () => client.invalidateQueries({ queryKey: ["viewer-invoices"] }),
  });

  const visibleInvoices = useMemo(() => (invoices.data ?? [])
    .filter((invoice) => invoice.studentId === activeStudentId)
    .sort((left, right) => {
      const priorityDifference = INVOICE_PRIORITY[left.status] - INVOICE_PRIORITY[right.status];
      return priorityDifference || left.dueAt.toMillis() - right.dueAt.toMillis();
    }), [activeStudentId, invoices.data]);

  const outstandingAmount = visibleInvoices
    .filter((invoice) => REPORTABLE_STATUSES.includes(invoice.status))
    .reduce((total, invoice) => total + invoice.amount, 0);
  const isLoading = studentQueries.some((query) => query.isLoading) || invoices.isLoading;
  const firstError = studentQueries.find((query) => query.error)?.error ?? invoices.error;

  const retry = () => {
    studentQueries.forEach((query) => query.refetch());
    invoices.refetch();
  };

  const openInvoice = (invoice: Invoice) => {
    setSelected(invoice);
    setReference("");
    report.reset();
  };

  const closeInvoice = () => {
    setSelected(null);
    setReference("");
    report.reset();
  };

  return (
    <>
      {isLoading && <LoadingSkeleton rows={4} />}
      {!isLoading && firstError && (
        <ErrorState message="Không thể tải danh sách học phí. Vui lòng kiểm tra kết nối và thử lại." onRetry={retry} />
      )}
      {!isLoading && !firstError && !selectedStudent && (
        <EmptyState title="Chưa liên kết học sinh" description="Tài khoản phụ huynh cần được liên kết với học sinh để theo dõi học phí." />
      )}
      {!isLoading && !firstError && selectedStudent && (
        <div className="space-y-4 pb-5">
          <ViewerStudentSwitcher students={students} selectedStudentId={selectedStudent.id} onSelect={selectStudent} />

          <header>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Học phí</h2>
            <p className="mt-1.5 text-sm text-neutral-500">Theo dõi hóa đơn và xác nhận chuyển khoản.</p>
          </header>

          <section
            aria-label="Tổng quan học phí"
            className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 rounded-card border border-primary-200 bg-primary-50 p-4"
          >
            <div>
              <span className="text-xs font-semibold text-primary-700">Tổng cần thanh toán</span>
              <strong className="mt-1 block text-2xl font-extrabold tabular-nums text-neutral-900">{formatVnd(outstandingAmount)}</strong>
            </div>
            <span className="pb-1 text-xs font-semibold text-neutral-600">
              {visibleInvoices.filter((invoice) => REPORTABLE_STATUSES.includes(invoice.status)).length} khoản
            </span>
          </section>

          {visibleInvoices.length === 0 ? (
            <EmptyState title="Chưa có khoản học phí nào" description="Khi có hóa đơn học phí mới, thông tin sẽ hiển thị ở đây." />
          ) : (
            <section aria-label="Danh sách học phí" className="space-y-2.5">
              {visibleInvoices.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} onOpen={() => openInvoice(invoice)} />
              ))}
            </section>
          )}
        </div>
      )}

      <Modal open={!!selected} onClose={closeInvoice} size="sm" title={selected?.invoiceCode ?? "Hóa đơn"}>
        {selected && <InvoiceDetails invoice={selected} reference={reference} setReference={setReference} report={report} />}
      </Modal>
    </>
  );
}

function InvoiceCard({ invoice, onOpen }: { invoice: Invoice; onOpen: () => void }) {
  const canReport = REPORTABLE_STATUSES.includes(invoice.status);

  return (
    <article className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_4px_18px_rgba(37,61,124,.035)] transition-colors hover:border-primary-200 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wide text-neutral-500">{invoice.invoiceCode}</p>
          <h3 className="mt-1 text-base font-bold text-neutral-900">{invoice.title}</h3>
        </div>
        <StatusBadge tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</StatusBadge>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-neutral-100 pt-4">
        <div>
          <strong className="block text-xl font-extrabold tabular-nums text-neutral-900">{formatVnd(invoice.amount)}</strong>
          <span className={`mt-1 block text-xs font-semibold ${invoice.status === "overdue" ? "text-danger-700" : "text-neutral-500"}`}>
            {invoice.status === "overdue" ? "Đã quá hạn" : `Hạn ${format(invoice.dueAt.toDate(), "dd/MM/yyyy")}`}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="motion-control min-h-touch w-full rounded-input border border-primary-300 px-4 text-sm font-bold text-primary-700 hover:border-primary-500 hover:bg-primary-50 active:scale-[.98] sm:w-auto"
        >
          {canReport ? "Mở mã QR" : "Xem chi tiết"}
        </button>
      </div>
    </article>
  );
}

function InvoiceDetails({
  invoice,
  reference,
  setReference,
  report,
}: {
  invoice: Invoice;
  reference: string;
  setReference: (value: string) => void;
  report: ReturnType<typeof useMutation<void, Error, void>>;
}) {
  const canReport = REPORTABLE_STATUSES.includes(invoice.status);

  return (
    <div className="text-center">
      {canReport && (
        <img
          className="mx-auto mt-1 aspect-square h-auto w-full max-w-[260px] rounded-card object-contain"
          width={260}
          height={260}
          alt={`VietQR thanh toán hóa đơn ${invoice.invoiceCode}`}
          src={buildVietQrImageUrl({
            bankBin: invoice.bankBin,
            accountNumber: invoice.accountNumber,
            accountName: invoice.accountName,
            amount: invoice.amount,
            content: invoice.paymentContent,
          })}
        />
      )}
      <p className="mt-3 text-sm text-neutral-600">{invoice.accountNumber} · {formatVnd(invoice.amount)}</p>
      <p className="font-semibold text-neutral-900">{invoice.paymentContent}</p>

      {canReport && !report.isSuccess && (
        <>
          <label htmlFor="payment-reference" className="sr-only">Mã giao dịch</label>
          <input
            id="payment-reference"
            placeholder="Mã giao dịch (tùy chọn)"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="mt-4 min-h-touch w-full rounded-input border border-neutral-300 px-3 text-base"
          />
          <button
            type="button"
            onClick={() => report.mutate()}
            disabled={report.isPending}
            className="mt-2 min-h-touch w-full rounded-input bg-primary-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {report.isPending ? "Đang gửi..." : "Tôi đã chuyển khoản"}
          </button>
        </>
      )}

      {report.isSuccess && (
        <p role="status" className="mt-4 rounded-card bg-success-50 px-4 py-3 text-sm font-semibold text-success-700">
          Đã ghi nhận báo chuyển khoản. Nhà trường sẽ kiểm tra và xác nhận.
        </p>
      )}
      {!canReport && (
        <p role="status" className="mt-4 rounded-card bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700">
          {invoice.status === "paid"
            ? "Khoản học phí này đã được xác nhận thanh toán."
            : "Báo chuyển khoản đã được gửi và đang chờ nhà trường xác nhận."}
        </p>
      )}
      {report.isError && (
        <p role="alert" className="mt-2 text-sm text-danger-700">
          Không thể ghi nhận báo chuyển khoản. Vui lòng thử lại hoặc liên hệ nhà trường.
        </p>
      )}
    </div>
  );
}
