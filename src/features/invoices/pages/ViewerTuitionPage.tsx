import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listInvoicesByStudents, reportPayment } from "@/services/firestore/invoices";
import { buildPaymentQrPayload } from "@/utils/payment";
import type { InvoiceDoc } from "@/types/academic";

export default function ViewerTuitionPage() {
  const { firebaseUser, userDoc } = useAuth(); const client = useQueryClient(); const ids = userDoc?.studentIds ?? [];
  const invoices = useQuery({ queryKey: ["viewer-invoices", ids], queryFn: () => listInvoicesByStudents(ids), enabled: ids.length > 0 });
  const [selected, setSelected] = useState<(InvoiceDoc & { id: string }) | null>(null); const [reference, setReference] = useState("");
  const report = useMutation({ mutationFn: () => selected ? reportPayment(selected, firebaseUser?.uid ?? "unknown", reference, "") : Promise.resolve(), onSuccess: () => client.invalidateQueries({ queryKey: ["viewer-invoices"] }) });
  return <ViewerShell><PageHeader title="Học phí" description="Theo dõi khoản cần thanh toán và xác nhận chuyển khoản." /><div className="space-y-3">{invoices.data?.map((invoice) => <article key={invoice.id} className="border-b border-neutral-200 py-4"><div className="flex items-center justify-between gap-4"><div><h2 className="text-base">{invoice.title}</h2><p className="text-sm">{invoice.amount.toLocaleString("vi-VN")} đ · {invoice.status}</p></div><button type="button" onClick={() => setSelected(invoice)} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm transition hover:border-primary-300 hover:text-primary-700" style={{ transitionDuration: "var(--motion-duration)" }}>Mở QR</button></div></article>)}</div>{selected && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-neutral-900/50 p-4"><div className="w-full max-w-sm rounded-modal bg-white p-5 text-center"><h2>{selected.invoiceCode}</h2><QRCodeSVG className="mx-auto mt-4" size={220} value={buildPaymentQrPayload({ bankBin: selected.bankBin, accountNumber: selected.accountNumber, accountName: selected.accountName, amount: selected.amount, content: selected.paymentContent })} /><p className="mt-3 text-sm">{selected.accountNumber} · {selected.amount.toLocaleString("vi-VN")} đ</p><p className="font-medium">{selected.paymentContent}</p><label htmlFor="payment-reference" className="sr-only">Mã giao dịch</label><input id="payment-reference" placeholder="Mã giao dịch (tùy chọn)" value={reference} onChange={(event) => setReference(event.target.value)} className="mt-3 min-h-touch w-full rounded-input border px-3" /><button type="button" onClick={() => report.mutate()} disabled={report.isPending} className="mt-2 min-h-touch w-full rounded-input bg-primary-500 text-white disabled:opacity-50">{report.isPending ? "Đang gửi..." : "Tôi đã chuyển khoản"}</button><button type="button" onClick={() => setSelected(null)} className="mt-2 min-h-touch w-full text-sm">Đóng</button></div></div>}</ViewerShell>;
}
