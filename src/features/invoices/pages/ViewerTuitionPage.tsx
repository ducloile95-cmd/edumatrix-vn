import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listInvoicesByStudents, reportPayment } from "@/services/firestore/invoices";
import { buildVietQrImageUrl } from "@/utils/payment";
import { formatVnd } from "@/utils/currency";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "@/features/invoices/constants";
import type { InvoiceDoc } from "@/types/academic";

export default function ViewerTuitionPage() {
  const { firebaseUser, userDoc } = useAuth();
  const client = useQueryClient();
  const ids = userDoc?.studentIds ?? [];
  const invoices = useQuery({ queryKey: ["viewer-invoices", ids], queryFn: () => listInvoicesByStudents(ids), enabled: ids.length > 0 });
  const [selected, setSelected] = useState<(InvoiceDoc & { id: string }) | null>(null);
  const [reference, setReference] = useState("");
  const report = useMutation({
    mutationFn: () => (selected ? reportPayment(selected, firebaseUser?.uid ?? "unknown", reference, "") : Promise.resolve()),
    onSuccess: () => client.invalidateQueries({ queryKey: ["viewer-invoices"] }),
  });

  return (
    <ViewerShell>
      {invoices.isLoading && <LoadingSkeleton rows={3} />}
      {invoices.error && (
        <ErrorState message="Không thể tải danh sách học phí. Vui lòng kiểm tra kết nối và thử lại." onRetry={() => invoices.refetch()} />
      )}
      {!invoices.isLoading && !invoices.error && (invoices.data?.length ?? 0) === 0 && (
        <EmptyState title="Chưa có khoản học phí nào" description="Khi có hóa đơn học phí mới, thông tin sẽ hiển thị ở đây." />
      )}
      {!!invoices.data?.length && (
        <div className="space-y-3">
          {invoices.data.map((invoice) => (
            <article key={invoice.id} className="border-b border-neutral-200 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">{invoice.title}</h2>
                  <p className="text-sm">
                    {formatVnd(invoice.amount)}{" "}
                    <StatusBadge tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</StatusBadge>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(invoice)}
                  className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm transition hover:border-primary-300 hover:text-primary-700"
                  style={{ transitionDuration: "var(--motion-duration)" }}
                >
                  Mở QR
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} size="sm" title={selected?.invoiceCode ?? "Hóa đơn"}>
        {selected && (
          <div className="text-center">
            <img
              className="mx-auto mt-1 size-[260px] rounded-card object-contain"
              width={260}
              height={260}
              alt={`VietQR thanh toán hóa đơn ${selected.invoiceCode}`}
              src={buildVietQrImageUrl({
                bankBin: selected.bankBin,
                accountNumber: selected.accountNumber,
                accountName: selected.accountName,
                amount: selected.amount,
                content: selected.paymentContent,
              })}
            />
            <p className="mt-3 text-sm">
              {selected.accountNumber} · {formatVnd(selected.amount)}
            </p>
            <p className="font-medium">{selected.paymentContent}</p>
            <label htmlFor="payment-reference" className="sr-only">
              Mã giao dịch
            </label>
            <input
              id="payment-reference"
              placeholder="Mã giao dịch (tùy chọn)"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="mt-3 min-h-touch w-full rounded-input border px-3"
            />
            <button
              type="button"
              onClick={() => report.mutate()}
              disabled={report.isPending}
              className="mt-2 min-h-touch w-full rounded-input bg-primary-500 text-white disabled:opacity-50"
            >
              {report.isPending ? "Đang gửi..." : "Tôi đã chuyển khoản"}
            </button>
            {report.isError && (
              <p role="alert" className="mt-2 text-sm text-danger-700">
                Không thể ghi nhận báo chuyển khoản. Vui lòng thử lại hoặc liên hệ nhà trường.
              </p>
            )}
          </div>
        )}
      </Modal>
    </ViewerShell>
  );
}
