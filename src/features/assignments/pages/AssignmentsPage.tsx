import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { addDays, format, subDays } from "date-fns";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses } from "@/services/firestore/classes";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { listLessonPlans } from "@/services/firestore/lessonPlans";
import { formatSessionLabel } from "@/utils/lessonPlan";
import { createAssignment, gradeSubmission, listAssignments, listSubmissions, remindMissing } from "@/services/firestore/assignments";
import type { AssignmentDoc, SubmissionStatus } from "@/types/academic";

export default function AssignmentsPage({ embedded = false }: { embedded?: boolean }) {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: listAssignments });
  const [selected, setSelected] = useState<(AssignmentDoc & { id: string }) | null>(null);
  const submissions = useQuery({ queryKey: ["submissions", selected?.id], queryFn: () => listSubmissions(selected?.id ?? "", selected?.classId ?? ""), enabled: !!selected });
  const [form, setForm] = useState({ title: "", description: "", classId: "", dueAt: "", maxScore: 10, lessonPlanId: "", sessionId: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const lessonPlans = useQuery({ queryKey: ["lesson-plans"], queryFn: listLessonPlans });
  const lessonPlansForClass = lessonPlans.data?.filter((item) => item.classId === form.classId) ?? [];
  const classSessions = useQuery({
    queryKey: ["sessions-by-class", form.classId],
    queryFn: () => listSessionsByClass(form.classId, subDays(new Date(), 30), addDays(new Date(), 120), 100),
    enabled: !!form.classId,
  });
  const create = useMutation({
    mutationFn: () => {
      const klass = classes.data?.find((item) => item.id === form.classId);
      return createAssignment(
        { title: form.title, description: form.description, classId: form.classId, subjectId: klass?.subjectIds[0] ?? "", lessonPlanId: form.lessonPlanId || null, sessionId: form.sessionId || null, dueAt: Timestamp.fromDate(new Date(form.dueAt)), submissionType: "text", maxScore: Number(form.maxScore), status: "published", createdBy: firebaseUser?.uid ?? "unknown" },
        klass?.studentIds.length ?? 0,
      );
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["assignments"] });
      client.invalidateQueries({ queryKey: ["assignment-summaries"] });
      setForm({ title: "", description: "", classId: "", dueAt: "", maxScore: 10, lessonPlanId: "", sessionId: "" });
      setCreateOpen(false);
    },
  });
  const grade = useMutation({
    mutationFn: ({ id, score, comment, status }: { id: string; score: number | null; comment: string; status: SubmissionStatus }) =>
      selected ? gradeSubmission(id, selected, { score, teacherComment: comment, status, checkedBy: firebaseUser?.uid ?? "unknown" }) : Promise.reject(new Error("ASSIGNMENT_NOT_SELECTED")),
    onSuccess: () => { submissions.refetch(); client.invalidateQueries({ queryKey: ["assignment-summaries"] }); },
  });

  const content = (
    <>
      <PageHeader actions={<Button variant="primary" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Tạo bài tập</Button>} />
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo bài tập" description="Giao bài mới và theo dõi kết quả trong cùng sổ điểm." size="lg">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!create.isPending) create.mutate();
        }}
        className="grid gap-3 md:grid-cols-3"
      >
        <input aria-label="Tên bài tập" required placeholder="Tên bài tập" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="min-h-touch rounded-input border px-3" />
        <select
          aria-label="Lớp học"
          required
          value={form.classId}
          onChange={(e) => setForm({ ...form, classId: e.target.value, lessonPlanId: "", sessionId: "" })}
          className="min-h-touch rounded-input border px-3"
        >
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
        <select
          aria-label="Giáo án liên kết"
          value={form.lessonPlanId}
          disabled={!form.classId}
          onChange={(e) => setForm({ ...form, lessonPlanId: e.target.value })}
          className="min-h-touch rounded-input border px-3 disabled:opacity-50"
        >
          <option value="">-- Không gắn giáo án --</option>
          {lessonPlansForClass.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Buổi học liên kết"
          value={form.sessionId}
          disabled={!form.classId}
          onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
          className="min-h-touch rounded-input border px-3 disabled:opacity-50"
        >
          <option value="">-- Không gắn buổi học --</option>
          {classSessions.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {formatSessionLabel(item)}
            </option>
          ))}
        </select>
        <button disabled={create.isPending} className="min-h-touch rounded-input bg-primary-500 px-5 text-white disabled:opacity-50">
          {create.isPending ? "Đang giao..." : "Giao bài"}
        </button>
        {create.isError && (
          <p role="alert" className="text-sm text-danger-700 md:col-span-3">
            Không thể giao bài. Dữ liệu vẫn còn, vui lòng thử lại.
          </p>
        )}
      </form>
      </Modal>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-card border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h2 className="text-sm font-semibold">Danh sách bài</h2>
            <span className="text-xs text-neutral-500">{assignments.data?.length ?? 0} bài</span>
          </div>
          <ul className="divide-y">
            {assignments.data?.map((item) => (
              <li key={item.id} className={selected?.id === item.id ? "bg-primary-50 shadow-[inset_3px_0_0_theme(colors.primary.500)]" : ""}>
                <button onClick={() => setSelected(item)} className="w-full px-4 py-3 text-left transition hover:bg-neutral-50">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-neutral-500">Hạn {format(item.dueAt.toDate(), "dd/MM HH:mm")}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="overflow-hidden rounded-card border border-neutral-200 bg-white">
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-4">
            <div><h2 className="text-base font-semibold">{selected ? selected.title : "Chọn bài tập để chấm"}</h2>{selected && <p className="mt-1 text-xs text-neutral-500">Thang điểm {selected.maxScore} · Hạn {format(selected.dueAt.toDate(), "dd/MM HH:mm")}</p>}</div>
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
          <ul className="divide-y px-4">
            {submissions.data?.map((item) => (
              <SubmissionRow key={item.id} item={item} maxScore={selected?.maxScore ?? 10} onGrade={(score, comment, status) => grade.mutate({ id: item.id, score, comment, status })} />
            ))}
          </ul>
        </section>
      </div>

    </>
  );

  return embedded ? content : <AppShell>{content}</AppShell>;
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
