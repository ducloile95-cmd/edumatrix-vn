import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
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
  scheduled: "Đã lên lịch",
  rescheduled: "Đã đổi lịch",
  cancelled: "Đã hủy",
  completed: "Đã học",
};
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
    defaultValues: { classId: "", title: "Buổi học", startAt: "", endAt: "", location: "", note: "", repeatCount: 1, makeUpForSessionId: null },
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
        actions={(
          <Button variant="primary" onClick={() => setOpen(true)} icon={<Plus size={18} />}>
            Tạo buổi học
          </Button>
        )} />

      <section className="rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2>{format(range.from, "dd/MM")} - {format(range.to, "dd/MM/yyyy")}</h2>
          <div className="flex gap-2">
            <select aria-label="Chế độ lịch" value={view} onChange={(event) => setView(event.target.value as "week" | "month")} className={INPUT}>
              <option value="week">Theo tuần</option><option value="month">Theo tháng</option>
            </select>
            <input aria-label="Ngày xem lịch" type="date" value={format(anchor, "yyyy-MM-dd")} onChange={(event) => setAnchor(new Date(`${event.target.value}T12:00:00`))} className={INPUT} />
            <Button variant="secondary" onClick={() => setAnchor(addDays(anchor, view === "week" ? 7 : 31))}>
              Kỳ tiếp
            </Button>
          </div>
        </div>
        {sessionsQuery.isLoading && <LoadingSkeleton rows={5} />}
        {sessionsQuery.isError && <ErrorState message="Không tải được lịch học." onRetry={() => sessionsQuery.refetch()} />}
        {sessionsQuery.data?.length === 0 && <EmptyState title="Chưa có buổi học trong khoảng này" />}
        <ul className="divide-y divide-neutral-100">
          {sessionsQuery.data?.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-medium text-neutral-800">{session.title}</p><p className="text-xs text-neutral-500">{format(session.startAt.toDate(), "dd/MM/yyyy HH:mm")} - {format(session.endAt.toDate(), "HH:mm")} · {session.location || "Chưa có địa điểm"}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={session.status === "cancelled" ? "danger" : session.status === "completed" ? "success" : "warning"}>{STATUS_LABEL[session.status]}</StatusBadge>
                <input
                  aria-label={`Đổi lịch ${session.title}`}
                  type="datetime-local"
                  defaultValue={format(session.startAt.toDate(), "yyyy-MM-dd'T'HH:mm")}
                  onBlur={(event) => {
                    const nextStart = new Date(event.target.value);
                    if (nextStart.getTime() === session.startAt.toMillis()) return;
                    const duration = session.endAt.toMillis() - session.startAt.toMillis();
                    updateMutation.mutate({ id: session.id, changes: { startAt: nextStart, endAt: new Date(nextStart.getTime() + duration), status: "rescheduled", note: "Lịch học đã được cập nhật." } });
                  }}
                  className="min-h-touch rounded-input border border-neutral-300 px-2 text-xs"
                />
                <select aria-label={`Cập nhật ${session.title}`} value={session.status} onChange={(event) => updateMutation.mutate({ id: session.id, changes: { status: event.target.value as SessionStatus } })} className="min-h-touch rounded-input border border-neutral-300 px-2 text-xs"><option value="scheduled">Đã lên lịch</option><option value="rescheduled">Đổi lịch</option><option value="cancelled">Hủy</option><option value="completed">Đã học</option></select>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title="Tạo lịch học" description="Tạo một hoặc chuỗi buổi học lặp theo tuần.">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))}>
          <div className="grid gap-3 md:grid-cols-2">
            <select aria-label="Lớp học" {...register("classId")} className={INPUT}><option value="">Chọn lớp</option>{classesQuery.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input aria-label="Tên buổi học" {...register("title")} className={INPUT} />
            <input aria-label="Bắt đầu" type="datetime-local" {...register("startAt")} className={INPUT} />
            <input aria-label="Kết thúc" type="datetime-local" {...register("endAt")} className={INPUT} />
            <input aria-label="Địa điểm" placeholder="Địa điểm" {...register("location")} className={INPUT} />
            <input aria-label="Số tuần lặp" type="number" min={1} max={52} {...register("repeatCount")} className={INPUT} />
            <input aria-label="Ghi chú" placeholder="Ghi chú" {...register("note")} className={`${INPUT} md:col-span-2`} />
            <select aria-label="Buổi học gốc cần học bù" {...register("makeUpForSessionId")} className={`${INPUT} md:col-span-2`}><option value="">Không phải buổi học bù</option>{sessionsQuery.data?.filter((item) => item.status === "cancelled").map((item) => <option key={item.id} value={item.id}>Học bù: {item.title} - {format(item.startAt.toDate(), "dd/MM")}</option>)}</select>
          </div>
          {Object.keys(errors).length > 0 && <p role="alert" className="mt-2 text-sm text-danger-700">Vui lòng kiểm tra thời gian và thông tin bắt buộc.</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang tạo..." : "Tạo buổi học"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
