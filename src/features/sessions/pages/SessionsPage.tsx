import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listClasses } from "@/services/firestore/classes";
import { createSessions, listSessions, updateSession } from "@/services/firestore/sessions";
import { sessionFormSchema, type SessionFormValues } from "@/schemas/session";
import type { SessionStatus } from "@/types/academic";

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Da len lich",
  rescheduled: "Da doi lich",
  cancelled: "Da huy",
  completed: "Da hoc",
};
const ADD_BTN = "inline-flex min-h-touch items-center gap-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(35,72,214,.25)] transition active:scale-[.98]";
const INPUT = "min-h-touch rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500";

export default function SessionsPage() {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const range = useMemo(() => view === "week"
    ? { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) }
    : { from: startOfMonth(anchor), to: endOfMonth(anchor) }, [anchor, view]);

  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const sessionsQuery = useQuery({
    queryKey: ["sessions", range.from.toISOString(), range.to.toISOString()],
    queryFn: () => listSessions(range.from, range.to),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: { classId: "", title: "Buoi hoc", startAt: "", endAt: "", location: "", note: "", repeatCount: 1, makeUpForSessionId: null },
  });
  const createMutation = useMutation({
    mutationFn: (values: SessionFormValues) => createSessions({ ...values, startAt: new Date(values.startAt), endAt: new Date(values.endAt) }),
    onSuccess: () => { reset(); queryClient.invalidateQueries({ queryKey: ["sessions"] }); setOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Parameters<typeof updateSession>[1] }) => updateSession(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  return (
    <AppShell>
      <PageHeader title="Lịch học" description="Tạo chuỗi buổi học, đổi lịch, hủy và sắp xếp buổi học bù."
        actions={<button type="button" onClick={() => setOpen(true)} className={ADD_BTN}><Plus size={18} />Tạo buổi học</button>} />

      <section className="glass-panel rounded-2xl border border-white/70 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2>{format(range.from, "dd/MM")} - {format(range.to, "dd/MM/yyyy")}</h2>
          <div className="flex gap-2">
            <select aria-label="Che do lich" value={view} onChange={(event) => setView(event.target.value as "week" | "month")} className={INPUT}>
              <option value="week">Theo tuan</option><option value="month">Theo thang</option>
            </select>
            <input aria-label="Ngay xem lich" type="date" value={format(anchor, "yyyy-MM-dd")} onChange={(event) => setAnchor(new Date(`${event.target.value}T12:00:00`))} className={INPUT} />
            <button type="button" onClick={() => setAnchor(addDays(anchor, view === "week" ? 7 : 31))} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm hover:bg-white/70">Ky tiep</button>
          </div>
        </div>
        {sessionsQuery.isLoading && <LoadingSkeleton rows={5} />}
        {sessionsQuery.isError && <ErrorState message="Khong tai duoc lich hoc." onRetry={() => sessionsQuery.refetch()} />}
        {sessionsQuery.data?.length === 0 && <EmptyState title="Chua co buoi hoc trong khoang nay" />}
        <ul className="divide-y divide-neutral-100">
          {sessionsQuery.data?.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-medium text-neutral-800">{session.title}</p><p className="text-xs text-neutral-500">{format(session.startAt.toDate(), "dd/MM/yyyy HH:mm")} - {format(session.endAt.toDate(), "HH:mm")} · {session.location || "Chua co dia diem"}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={session.status === "cancelled" ? "danger" : session.status === "completed" ? "success" : "warning"}>{STATUS_LABEL[session.status]}</StatusBadge>
                <input
                  aria-label={`Doi lich ${session.title}`}
                  type="datetime-local"
                  defaultValue={format(session.startAt.toDate(), "yyyy-MM-dd'T'HH:mm")}
                  onBlur={(event) => {
                    const nextStart = new Date(event.target.value);
                    if (nextStart.getTime() === session.startAt.toMillis()) return;
                    const duration = session.endAt.toMillis() - session.startAt.toMillis();
                    updateMutation.mutate({ id: session.id, changes: { startAt: nextStart, endAt: new Date(nextStart.getTime() + duration), status: "rescheduled", note: "Lich hoc da duoc cap nhat." } });
                  }}
                  className="min-h-touch rounded-input border border-neutral-300 px-2 text-xs"
                />
                <select aria-label={`Cap nhat ${session.title}`} value={session.status} onChange={(event) => updateMutation.mutate({ id: session.id, changes: { status: event.target.value as SessionStatus } })} className="min-h-touch rounded-input border border-neutral-300 px-2 text-xs"><option value="scheduled">Da len lich</option><option value="rescheduled">Doi lich</option><option value="cancelled">Huy</option><option value="completed">Da hoc</option></select>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title="Tạo lịch học" description="Tạo một hoặc chuỗi buổi học lặp theo tuần.">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))}>
          <div className="grid gap-3 md:grid-cols-2">
            <select aria-label="Lop hoc" {...register("classId")} className={INPUT}><option value="">Chon lop</option>{classesQuery.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input aria-label="Ten buoi hoc" {...register("title")} className={INPUT} />
            <input aria-label="Bat dau" type="datetime-local" {...register("startAt")} className={INPUT} />
            <input aria-label="Ket thuc" type="datetime-local" {...register("endAt")} className={INPUT} />
            <input aria-label="Dia diem" placeholder="Dia diem" {...register("location")} className={INPUT} />
            <input aria-label="So tuan lap" type="number" min={1} max={52} {...register("repeatCount")} className={INPUT} />
            <input aria-label="Ghi chu" placeholder="Ghi chu" {...register("note")} className={`${INPUT} md:col-span-2`} />
            <select aria-label="Buoi hoc goc can hoc bu" {...register("makeUpForSessionId")} className={`${INPUT} md:col-span-2`}><option value="">Khong phai buoi hoc bu</option>{sessionsQuery.data?.filter((item) => item.status === "cancelled").map((item) => <option key={item.id} value={item.id}>Hoc bu: {item.title} - {format(item.startAt.toDate(), "dd/MM")}</option>)}</select>
          </div>
          {Object.keys(errors).length > 0 && <p role="alert" className="mt-2 text-sm text-danger-700">Vui long kiem tra thoi gian va thong tin bat buoc.</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="min-h-touch rounded-input border border-neutral-300 px-5 text-sm font-medium text-neutral-600 hover:bg-neutral-50">Hủy</button>
            <button type="submit" disabled={createMutation.isPending} className={ADD_BTN}>{createMutation.isPending ? "Dang tao..." : "Tao buoi hoc"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
