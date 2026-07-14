import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { AppShell } from "@/components/layouts/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createInvoice, listInvoicesPage, listPayments, reconcilePayment } from "@/services/firestore/invoices";
import { listStudents } from "@/services/firestore/students";

export default function InvoicesPage() {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceCursors, setInvoiceCursors] = useState<Record<number, QueryDocumentSnapshot>>({});
  const invoices = useQuery({ queryKey: ["invoices", invoicePage], queryFn: () => listInvoicesPage(50, invoiceCursors[invoicePage]) });
  const payments = useQuery({ queryKey: ["payments"], queryFn: listPayments });
  const [form, setForm] = useState({ studentId: "", title: "Hoc phi", amount: 0, dueAt: "", bankBin: "970436", accountNumber: "", accountName: "EDUMATRIX" });
  const create = useMutation({
    mutationFn: () => createInvoice({ ...form, courseId: null, amount: Number(form.amount), dueAt: new Date(form.dueAt), actorUid: firebaseUser?.uid ?? "unknown" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["invoices"] }),
  });
  const reconcile = useMutation({
    mutationFn: ({ payment, status }: { payment: NonNullable<typeof payments.data>[number]; status: "verified" | "rejected" }) => reconcilePayment(payment, status, firebaseUser?.uid ?? "unknown"),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["payments"] }); client.invalidateQueries({ queryKey: ["invoices"] }); },
  });
  const setField = (field: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [field]: value }));
  return <AppShell>
    <form onSubmit={(event) => { event.preventDefault(); if (!create.isPending) create.mutate(); }} className="mt-5 grid gap-3 border-y py-5 md:grid-cols-3">
      <select aria-label="Hoc sinh" required value={form.studentId} onChange={(event) => setField("studentId", event.target.value)} className="min-h-touch rounded-input border px-3"><option value="">Chon hoc sinh</option>{students.data?.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select>
      <input aria-label="Tieu de hoa don" value={form.title} onChange={(event) => setField("title", event.target.value)} className="min-h-touch rounded-input border px-3" />
      <input aria-label="So tien" required type="number" min={1} placeholder="So tien" value={form.amount || ""} onChange={(event) => setField("amount", Number(event.target.value))} className="min-h-touch rounded-input border px-3" />
      <input aria-label="Han thanh toan" required type="date" value={form.dueAt} onChange={(event) => setField("dueAt", event.target.value)} className="min-h-touch rounded-input border px-3" />
      <input aria-label="Ma ngan hang" placeholder="Bank BIN" value={form.bankBin} onChange={(event) => setField("bankBin", event.target.value)} className="min-h-touch rounded-input border px-3" />
      <input aria-label="So tai khoan" required placeholder="So tai khoan" value={form.accountNumber} onChange={(event) => setField("accountNumber", event.target.value)} className="min-h-touch rounded-input border px-3" />
      <input aria-label="Ten tai khoan" placeholder="Ten tai khoan" value={form.accountName} onChange={(event) => setField("accountName", event.target.value)} className="min-h-touch rounded-input border px-3" />
      <button disabled={create.isPending} className="min-h-touch rounded-input bg-primary-500 px-5 text-white disabled:opacity-50">{create.isPending ? "Dang tao..." : "Tao hoa don"}</button>
      {create.isError && <p role="alert" className="text-sm text-danger-700 md:col-span-3">Khong the tao hoa don. Du lieu van con, vui long thu lai.</p>}
    </form>
    <section className="mt-6"><h2>Cong no</h2><ul className="divide-y">{invoices.data?.items.map((invoice) => <li key={invoice.id} className="flex justify-between py-3 text-sm"><span>{invoice.invoiceCode} · {invoice.studentId} · {invoice.amount.toLocaleString("vi-VN")} d</span><strong>{invoice.status}</strong></li>)}</ul><div className="mt-3 flex items-center justify-between text-sm"><button type="button" disabled={invoicePage <= 1 || invoices.isFetching} onClick={() => setInvoicePage((page) => page - 1)} className="rounded-input border px-3 py-2 disabled:opacity-40">Trang truoc</button><span>Trang {invoicePage}</span><button type="button" disabled={!invoices.data?.nextCursor || invoices.isFetching} onClick={() => { if (invoices.data?.nextCursor) setInvoiceCursors((current) => ({ ...current, [invoicePage + 1]: invoices.data!.nextCursor! })); setInvoicePage((page) => page + 1); }} className="rounded-input border px-3 py-2 disabled:opacity-40">Trang sau</button></div></section>
    <section className="mt-6"><h2>Thanh toan cho doi soat</h2><ul className="divide-y">{payments.data?.map((payment) => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm">{payment.studentId} · {payment.amount.toLocaleString("vi-VN")} d · {payment.transactionReference || "Khong co ma GD"} · {payment.status}</span>{payment.status === "reported" && <div className="flex gap-2"><button type="button" disabled={reconcile.isPending} onClick={() => reconcile.mutate({ payment, status: "verified" })} className="rounded-input bg-primary-500 px-3 py-2 text-sm text-white disabled:opacity-50">Xac nhan</button><button type="button" disabled={reconcile.isPending} onClick={() => reconcile.mutate({ payment, status: "rejected" })} className="rounded-input border px-3 py-2 text-sm disabled:opacity-50">Tu choi</button></div>}</li>)}</ul>{reconcile.isError && <p role="alert" className="mt-3 text-sm text-danger-700">Khong the doi soat. Vui long kiem tra mang va thu lai.</p>}</section>
  </AppShell>;
}
