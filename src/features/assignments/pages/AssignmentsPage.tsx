import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/layouts/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses } from "@/services/firestore/classes";
import { createAssignment, gradeSubmission, listAssignments, listAssignmentSummaries, listSubmissions, remindMissing } from "@/services/firestore/assignments";
import type { AssignmentDoc, SubmissionStatus } from "@/types/academic";

const FUNNEL_STAGES = [
  { key: "totalStudents" as const, label: "Giao bài" },
  { key: "submittedCount" as const, label: "Đã nộp" },
  { key: "gradedCount" as const, label: "Đã chấm" },
  { key: "redoCount" as const, label: "Cần làm lại" },
];

export default function AssignmentsPage() {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: listAssignments });
  const summaries = useQuery({ queryKey: ["assignment-summaries"], queryFn: listAssignmentSummaries });
  const [selected, setSelected] = useState<(AssignmentDoc & { id: string }) | null>(null);
  const submissions = useQuery({ queryKey: ["submissions", selected?.id], queryFn: () => listSubmissions(selected?.id ?? ""), enabled: !!selected });
  const [form, setForm] = useState({ title: "", description: "", classId: "", dueAt: "", maxScore: 10, lessonPlanId: "", sessionId: "" });
  const create = useMutation({
    mutationFn: () => {
      const klass = classes.data?.find((item) => item.id === form.classId);
      return createAssignment(
        { title: form.title, description: form.description, classId: form.classId, lessonPlanId: form.lessonPlanId || null, sessionId: form.sessionId || null, dueAt: Timestamp.fromDate(new Date(form.dueAt)), submissionType: "text", maxScore: Number(form.maxScore), status: "published", createdBy: firebaseUser?.uid ?? "unknown" },
        klass?.studentIds.length ?? 0,
      );
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["assignments"] });
      client.invalidateQueries({ queryKey: ["assignment-summaries"] });
      setForm({ title: "", description: "", classId: "", dueAt: "", maxScore: 10, lessonPlanId: "", sessionId: "" });
    },
  });
  const grade = useMutation({
    mutationFn: ({ id, score, comment, status }: { id: string; score: number | null; comment: string; status: SubmissionStatus }) =>
      gradeSubmission(id, selected?.id ?? "", { score, teacherComment: comment, status, checkedBy: firebaseUser?.uid ?? "unknown" }),
    onSuccess: () => { submissions.refetch(); client.invalidateQueries({ queryKey: ["assignment-summaries"] }); },
  });

  const funnelData = useMemo(() => {
    const totals = { totalStudents: 0, submittedCount: 0, gradedCount: 0, redoCount: 0 };
    summaries.data?.forEach((item) => {
      totals.totalStudents += item.totalStudents;
      totals.submittedCount += item.submittedCount;
      totals.gradedCount += item.gradedCount;
      totals.redoCount += item.redoCount;
    });
    return FUNNEL_STAGES.map((stage) => ({ stage: stage.label, value: totals[stage.key] }));
  }, [summaries.data]);

  const perClassData = useMemo(() => {
    if (!assignments.data || !summaries.data || !classes.data) return [];
    const summaryByAssignment = new Map(summaries.data.map((item) => [item.assignmentId, item]));
    const classNameById = new Map(classes.data.map((item) => [item.id, item.name]));
    const byClass = new Map<string, { classId: string; submitted: number; total: number }>();
    assignments.data.forEach((assignment) => {
      const summary = summaryByAssignment.get(assignment.id);
      if (!summary || summary.totalStudents === 0) return;
      const bucket = byClass.get(assignment.classId) ?? { classId: assignment.classId, submitted: 0, total: 0 };
      bucket.submitted += summary.submittedCount;
      bucket.total += summary.totalStudents;
      byClass.set(assignment.classId, bucket);
    });
    return [...byClass.values()]
      .map((item) => ({ className: classNameById.get(item.classId) ?? item.classId, percent: Math.round((item.submitted / item.total) * 100) }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 8);
  }, [assignments.data, summaries.data, classes.data]);

  return (
    <AppShell>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!create.isPending) create.mutate();
        }}
        className="grid gap-3 border-y border-neutral-200 py-4 md:grid-cols-3"
      >
        <input aria-label="Tên bài tập" required placeholder="Tên bài tập" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="min-h-touch rounded-input border px-3" />
        <select aria-label="Lớp học" required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="min-h-touch rounded-input border px-3">
          <option value="">Chọn lớp</option>
          {classes.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input aria-label="Hạn nộp" required type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className="min-h-touch rounded-input border px-3" />
        <textarea aria-label="Yêu cầu bài tập" placeholder="Yêu cầu bài tập" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-20 rounded-input border p-3 md:col-span-2" />
        <input aria-label="Điểm tối đa" type="number" min={1} value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Mã giáo án" placeholder="Mã giáo án" value={form.lessonPlanId} onChange={(e) => setForm({ ...form, lessonPlanId: e.target.value })} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Mã buổi học" placeholder="Mã buổi học" value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })} className="min-h-touch rounded-input border px-3" />
        <button disabled={create.isPending} className="min-h-touch rounded-input bg-primary-500 px-5 text-white disabled:opacity-50">
          {create.isPending ? "Đang giao..." : "Giao bài"}
        </button>
        {create.isError && (
          <p role="alert" className="text-sm text-danger-700 md:col-span-3">
            Không thể giao bài. Dữ liệu vẫn còn, vui lòng thử lại.
          </p>
        )}
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <section>
          <h2 className="mb-3">Bài tập</h2>
          <ul className="divide-y">
            {assignments.data?.map((item) => (
              <li key={item.id} className="py-3">
                <button onClick={() => setSelected(item)} className="text-left">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-neutral-500">Hạn {format(item.dueAt.toDate(), "dd/MM HH:mm")}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <div className="flex justify-between">
            <h2>{selected ? `Chấm: ${selected.title}` : "Chọn bài tập"}</h2>
            {selected && (
              <button
                type="button"
                onClick={() => remindMissing(selected, classes.data?.find((item) => item.id === selected.classId)?.studentIds ?? [])}
                className="min-h-touch rounded-input border px-3 text-sm"
              >
                Nhắc chưa nộp
              </button>
            )}
          </div>
          <ul className="divide-y">
            {submissions.data?.map((item) => (
              <SubmissionRow key={item.id} item={item} maxScore={selected?.maxScore ?? 10} onGrade={(score, comment, status) => grade.mutate({ id: item.id, score, comment, status })} />
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2>Phễu Giao → Nộp → Chấm → Làm lại</h2>
          <p className="mt-1 text-sm text-neutral-500">Tổng hợp trên toàn bộ bài tập đang có.</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" aria-label="Biểu đồ phễu số lượt giao, nộp, chấm và cần làm lại">
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="stage" width={90} />
                <Tooltip formatter={(value: number) => [`${value} lượt`, "Số lượng"]} />
                <Bar dataKey="value" fill="#3366F0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2>Tỉ lệ nộp bài theo lớp</h2>
          <div className="mt-3 h-64">
            {perClassData.length === 0 ? (
              <p className="mt-8 text-center text-sm text-neutral-500">Chưa có dữ liệu bài nộp.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perClassData} aria-label="Biểu đồ tỉ lệ phần trăm nộp bài theo từng lớp">
                  <XAxis dataKey="className" />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Đã nộp"]} />
                  <Bar dataKey="percent" fill="#FF8A3D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function SubmissionRow({
  item,
  maxScore,
  onGrade,
}: {
  item: Awaited<ReturnType<typeof listSubmissions>>[number];
  maxScore: number;
  onGrade: (score: number | null, comment: string, status: SubmissionStatus) => void;
}) {
  const [score, setScore] = useState(item.score?.toString() ?? "");
  const [comment, setComment] = useState(item.teacherComment);
  return (
    <li className="grid gap-2 py-3 md:grid-cols-[1fr_100px_1fr_auto]">
      <div>
        <p className="text-sm font-medium">{item.studentId}</p>
        <p className="text-xs">{item.submissionText || item.submissionUrl}</p>
      </div>
      <input aria-label="Điểm" type="number" min={0} max={maxScore} value={score} onChange={(e) => setScore(e.target.value)} className="min-h-touch rounded-input border px-2" />
      <input aria-label="Nhận xét" value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-touch rounded-input border px-2" />
      <div className="flex gap-2">
        <button onClick={() => onGrade(score ? Number(score) : null, comment, "graded")} className="rounded-input bg-primary-500 px-3 text-sm text-white">
          Chấm
        </button>
        <button onClick={() => onGrade(null, comment, "redo_required")} className="rounded-input border px-3 text-sm">
          Làm lại
        </button>
      </div>
    </li>
  );
}
