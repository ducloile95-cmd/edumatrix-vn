import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import { Save } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listSessions } from "@/services/firestore/sessions";
import { getClass } from "@/services/firestore/classes";
import { listStudents } from "@/services/firestore/students";
import { listAttendanceBySession, listAttendanceSummariesBySessionIds, saveAttendance, type AttendanceEntry } from "@/services/firestore/attendance";
import type { AttendanceStatus } from "@/types/academic";

const STATUS_LABEL: Record<AttendanceStatus, string> = { present: "Có mặt", absent: "Vắng", late: "Đi muộn", excused: "Có phép" };
const STATUS_COLOR: Record<AttendanceStatus, string> = { present: "#16A34A", late: "#F59E0B", absent: "#E4453A", excused: "#0EA5E9" };

export default function AttendancePage() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(searchParams.get("session") ?? "");
  const [entries, setEntries] = useState<Record<string, AttendanceEntry>>({});
  const sessions = useQuery({ queryKey: ["attendance-sessions"], queryFn: () => listSessions(subDays(new Date(), 180), addDays(new Date(), 180)) });
  const selectedSession = sessions.data?.find((item) => item.id === sessionId);
  const klass = useQuery({ queryKey: ["class", selectedSession?.classId], queryFn: () => getClass(selectedSession?.classId ?? ""), enabled: !!selectedSession });
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const existing = useQuery({ queryKey: ["attendance", sessionId], queryFn: () => listAttendanceBySession(sessionId), enabled: !!sessionId });
  const classStudents = useMemo(() => students.data?.filter((student) => klass.data?.studentIds.includes(student.id)) ?? [], [students.data, klass.data]);

  const sessionIds = useMemo(() => sessions.data?.map((item) => item.id) ?? [], [sessions.data]);
  const summaries = useQuery({
    queryKey: ["attendance-summaries", sessionIds],
    queryFn: () => listAttendanceSummariesBySessionIds(sessionIds),
    enabled: sessionIds.length > 0,
  });

  const weeklyChart = useMemo(() => {
    if (!summaries.data || !sessions.data) return [];
    const sessionById = new Map(sessions.data.map((item) => [item.id, item]));
    const buckets = new Map<string, { week: string; sortKey: number; present: number; late: number; absent: number; excused: number }>();
    summaries.data.forEach((summary) => {
      const session = sessionById.get(summary.sessionId);
      if (!session) return;
      const weekStart = startOfWeek(session.startAt.toDate(), { weekStartsOn: 1 });
      const key = format(weekStart, "dd/MM");
      const bucket = buckets.get(key) ?? { week: key, sortKey: weekStart.getTime(), present: 0, late: 0, absent: 0, excused: 0 };
      bucket.present += summary.present;
      bucket.late += summary.late;
      bucket.absent += summary.absent;
      bucket.excused += summary.excused;
      buckets.set(key, bucket);
    });
    return [...buckets.values()].sort((a, b) => a.sortKey - b.sortKey).slice(-8);
  }, [summaries.data, sessions.data]);

  const donutData = useMemo(() => {
    const totals: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    summaries.data?.forEach((summary) => {
      totals.present += summary.present;
      totals.absent += summary.absent;
      totals.late += summary.late;
      totals.excused += summary.excused;
    });
    return (Object.keys(totals) as AttendanceStatus[])
      .map((status) => ({ status, label: STATUS_LABEL[status], value: totals[status] }))
      .filter((item) => item.value > 0);
  }, [summaries.data]);

  useEffect(() => {
    if (!sessionId || !classStudents.length || existing.isLoading) return;
    setEntries(Object.fromEntries(classStudents.map((student) => { const saved = existing.data?.find((item) => item.studentId === student.id); return [student.id, { studentId: student.id, status: saved?.status ?? "present", note: saved?.note ?? "" }]; })));
  }, [sessionId, classStudents, existing.data, existing.isLoading]);

  const mutation = useMutation({ mutationFn: () => saveAttendance(sessionId, selectedSession?.classId ?? "", Object.values(entries), firebaseUser?.uid ?? "unknown"), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] }); queryClient.invalidateQueries({ queryKey: ["attendance-summaries"] }); } });
  const updateEntry = (studentId: string, changes: Partial<AttendanceEntry>) => setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], studentId, status: current[studentId]?.status ?? "present", note: current[studentId]?.note ?? "", ...changes } }));

  return (
    <AppShell>
      <PageHeader title="Điểm danh" description="Tải danh sách lớp, đánh dấu nhanh và lưu cả lớp trong một lần." />

      <label htmlFor="attendance-session" className="sr-only">
        Chọn buổi học
      </label>
      <select
        id="attendance-session"
        aria-label="Chọn buổi học"
        value={sessionId}
        onChange={(event) => setSessionId(event.target.value)}
        className="mt-5 min-h-touch w-full max-w-xl rounded-input border border-neutral-300 px-3 text-sm"
      >
        <option value="">Chọn buổi học</option>
        {sessions.data?.map((session) => (
          <option key={session.id} value={session.id}>
            {format(session.startAt.toDate(), "dd/MM/yyyy HH:mm")} - {session.title}
          </option>
        ))}
      </select>

      {(klass.isLoading || students.isLoading || existing.isLoading) && sessionId && <LoadingSkeleton rows={5} />}
      {sessionId && classStudents.length === 0 && !students.isLoading && (
        <EmptyState title="Lớp chưa có học sinh" />
      )}

      {classStudents.length > 0 && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2>
              {klass.data?.name} · {classStudents.length} học sinh
            </h2>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="inline-flex min-h-touch items-center gap-2 rounded-input bg-primary-500 px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Save size={17} />
              {mutation.isPending ? "Đang lưu..." : "Lưu điểm danh"}
            </button>
          </div>

          <ul className="divide-y divide-neutral-100">
            {classStudents.map((student) => (
              <li key={student.id} className="grid items-center gap-2 py-3 md:grid-cols-[1fr_180px_1fr]">
                <div>
                  <p className="text-sm font-medium">{student.fullName}</p>
                  <p className="text-xs text-neutral-500">{student.studentCode}</p>
                </div>
                <select
                  aria-label={`Trạng thái ${student.fullName}`}
                  value={entries[student.id]?.status ?? "present"}
                  onChange={(event) => updateEntry(student.id, { status: event.target.value as AttendanceStatus })}
                  className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm"
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Ghi chú ${student.fullName}`}
                  placeholder="Ghi chú"
                  value={entries[student.id]?.note ?? ""}
                  onChange={(event) => updateEntry(student.id, { note: event.target.value })}
                  className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm"
                />
              </li>
            ))}
          </ul>

          {mutation.isError && (
            <p role="alert" className="mt-3 text-sm text-danger-700">
              Lưu thất bại. Kiểm tra mạng và bấm Lưu lại - dữ liệu điểm danh vẫn còn trên màn hình.
            </p>
          )}
          {mutation.isSuccess && <p className="mt-3 text-sm text-success-700">Đã lưu điểm danh và cập nhật tổng hợp.</p>}
        </div>
      )}

      <section className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2>Chuyên cần theo tuần</h2>
          <p className="mt-1 text-sm text-neutral-500">Tổng hợp trên các buổi đã điểm danh trong 180 ngày gần đây.</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart} aria-label="Biểu đồ chuyên cần theo tuần, chia theo có mặt, đi muộn, vắng và có phép">
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" name={STATUS_LABEL.present} stackId="a" fill={STATUS_COLOR.present} />
                <Bar dataKey="late" name={STATUS_LABEL.late} stackId="a" fill={STATUS_COLOR.late} />
                <Bar dataKey="absent" name={STATUS_LABEL.absent} stackId="a" fill={STATUS_COLOR.absent} />
                <Bar dataKey="excused" name={STATUS_LABEL.excused} stackId="a" fill={STATUS_COLOR.excused} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2>Tổng hợp trạng thái</h2>
          <div className="mt-3 h-64">
            {donutData.length === 0 ? (
              <p className="mt-8 text-center text-sm text-neutral-500">Chưa có dữ liệu điểm danh.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart aria-label="Biểu đồ tròn tổng hợp trạng thái điểm danh">
                  <Pie data={donutData} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {donutData.map((item) => (
                      <Cell key={item.status} fill={STATUS_COLOR[item.status]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, _name, entry) => [`${value} lượt`, entry.payload.label]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
