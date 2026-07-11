import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, subDays } from "date-fns";
import { Save } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listSessions } from "@/services/firestore/sessions";
import { getClass } from "@/services/firestore/classes";
import { listStudents } from "@/services/firestore/students";
import { listAttendanceBySession, saveAttendance, type AttendanceEntry } from "@/services/firestore/attendance";
import type { AttendanceStatus } from "@/types/academic";

const STATUS_LABEL: Record<AttendanceStatus, string> = { present: "Co mat", absent: "Vang", late: "Di muon", excused: "Co phep" };

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

  useEffect(() => {
    if (!sessionId || !classStudents.length || existing.isLoading) return;
    setEntries(Object.fromEntries(classStudents.map((student) => { const saved = existing.data?.find((item) => item.studentId === student.id); return [student.id, { studentId: student.id, status: saved?.status ?? "present", note: saved?.note ?? "" }]; })));
  }, [sessionId, classStudents, existing.data, existing.isLoading]);

  const mutation = useMutation({ mutationFn: () => saveAttendance(sessionId, selectedSession?.classId ?? "", Object.values(entries), firebaseUser?.uid ?? "unknown"), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] }); } });
  const updateEntry = (studentId: string, changes: Partial<AttendanceEntry>) => setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], studentId, status: current[studentId]?.status ?? "present", note: current[studentId]?.note ?? "", ...changes } }));

  return (
    <AppShell>
      <h1>Diem danh</h1><p className="mt-1 text-sm text-neutral-500">Tai danh sach lop, danh dau nhanh va luu ca lop trong mot batch.</p>
      <label htmlFor="attendance-session" className="sr-only">Chon buoi hoc</label><select id="attendance-session" aria-label="Chon buoi hoc" value={sessionId} onChange={(event) => setSessionId(event.target.value)} className="mt-5 min-h-touch w-full max-w-xl rounded-input border border-neutral-300 px-3 text-sm"><option value="">Chon buoi hoc</option>{sessions.data?.map((session) => <option key={session.id} value={session.id}>{format(session.startAt.toDate(), "dd/MM/yyyy HH:mm")} - {session.title}</option>)}</select>
      {(klass.isLoading || students.isLoading || existing.isLoading) && sessionId && <LoadingSkeleton rows={5} />}
      {sessionId && classStudents.length === 0 && !students.isLoading && <EmptyState title="Lop chua co hoc sinh" />}
      {classStudents.length > 0 && <div className="mt-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2>{klass.data?.name} · {classStudents.length} hoc sinh</h2><button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="inline-flex min-h-touch items-center gap-2 rounded-input bg-primary-500 px-5 text-sm font-medium text-white disabled:opacity-50"><Save size={17} />{mutation.isPending ? "Dang luu..." : "Luu diem danh"}</button></div><ul className="divide-y divide-neutral-100">{classStudents.map((student) => <li key={student.id} className="grid items-center gap-2 py-3 md:grid-cols-[1fr_180px_1fr]"><div><p className="text-sm font-medium">{student.fullName}</p><p className="text-xs text-neutral-500">{student.studentCode}</p></div><select aria-label={`Trang thai ${student.fullName}`} value={entries[student.id]?.status ?? "present"} onChange={(event) => updateEntry(student.id, { status: event.target.value as AttendanceStatus })} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm">{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input aria-label={`Ghi chu ${student.fullName}`} placeholder="Ghi chu" value={entries[student.id]?.note ?? ""} onChange={(event) => updateEntry(student.id, { note: event.target.value })} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm" /></li>)}</ul>{mutation.isError && <p role="alert" className="mt-3 text-sm text-danger-700">Luu that bai. Kiem tra mang va bam Luu lai - du lieu diem danh van con tren man hinh.</p>}{mutation.isSuccess && <p className="mt-3 text-sm text-success-700">Da luu diem danh va cap nhat tong hop.</p>}</div>}
    </AppShell>
  );
}
