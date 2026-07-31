import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { addDays, format, subDays } from "date-fns";
import { Bell, CheckCircle2, Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses } from "@/services/firestore/classes";
import { listStudents } from "@/services/firestore/students";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { listLessonPlans } from "@/services/firestore/lessonPlans";
import { listSubjects } from "@/services/firestore/subjects";
import { formatSessionLabel } from "@/utils/lessonPlan";
import { createAssignment, gradeSubmission, listAssignmentSummariesByIds, listAssignments, listSubmissions, remindMissing } from "@/services/firestore/assignments";
import type { AssignmentDoc, SubmissionStatus } from "@/types/academic";

export default function AssignmentsPage({ embedded = false }: { embedded?: boolean }) {
  const { firebaseUser, role } = useAuth();
  const client = useQueryClient();
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const studentNames = new Map(students.data?.map((student) => [student.id, student.fullName]));
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: listAssignments });
  const summaries = useQuery({
    queryKey: ["assignment-summaries", assignments.data?.map((item) => item.id)],
    queryFn: () => listAssignmentSummariesByIds(assignments.data?.map((item) => item.id) ?? []),
    enabled: !!assignments.data,
  });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const [selected, setSelected] = useState<(AssignmentDoc & { id: string }) | null>(null);
  const [queryText, setQueryText] = useState("");
  const submissions = useQuery({ queryKey: ["submissions", selected?.id], queryFn: () => listSubmissions(selected?.id ?? "", selected?.classId ?? ""), enabled: !!selected });
  const emptyForm = { title: "", description: "", classId: "", subjectId: "", dueAt: "", maxScore: 10, lessonPlanId: "", sessionId: "", status: "published" as AssignmentDoc["status"] };
  const [form, setForm] = useState(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const lessonPlans = useQuery({ queryKey: ["lesson-plans"], queryFn: listLessonPlans });
  const lessonPlansForClass = lessonPlans.data?.filter((item) => item.classId === form.classId) ?? [];
  const selectedClass = classes.data?.find((item) => item.id === form.classId);
  const subjectsForClass = subjects.data?.filter((item) => selectedClass?.subjectIds.includes(item.id)) ?? [];
  const summaryById = useMemo(() => new Map(summaries.data?.map((item) => [item.id, item])), [summaries.data]);
  const filteredAssignments = assignments.data?.filter((item) => item.title.toLocaleLowerCase("vi").includes(queryText.trim().toLocaleLowerCase("vi"))) ?? [];

  useEffect(() => {
    if (!selected && assignments.data?.[0]) setSelected(assignments.data[0]);
  }, [assignments.data, selected]);
  const classSessions = useQuery({
    queryKey: ["sessions-by-class", form.classId],
    queryFn: () => listSessionsByClass(form.classId, subDays(new Date(), 30), addDays(new Date(), 120), 100),
    enabled: !!form.classId,
  });
  const create = useMutation({
    mutationFn: () => {
      const klass = classes.data?.find((item) => item.id === form.classId);
      return createAssignment(
        { title: form.title.trim(), description: form.description.trim(), classId: form.classId, subjectId: form.subjectId, lessonPlanId: form.lessonPlanId || null, sessionId: form.sessionId || null, dueAt: Timestamp.fromDate(new Date(form.dueAt)), submissionType: "text", maxScore: Number(form.maxScore), status: form.status, createdBy: firebaseUser?.uid ?? "unknown" },
        klass?.studentIds.length ?? 0,
      );
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["assignments"] });
      client.invalidateQueries({ queryKey: ["assignment-summaries"] });
      setForm(emptyForm);
      setCreateOpen(false);
    },
  });
  const grade = useMutation({
    mutationFn: ({ id, score, comment, status }: { id: string; score: number | null; comment: string; status: SubmissionStatus }) =>
      selected ? gradeSubmission(id, selected, { score, teacherComment: comment, status, checkedBy: firebaseUser?.uid ?? "unknown" }) : Promise.reject(new Error("ASSIGNMENT_NOT_SELECTED")),
    onSuccess: () => { submissions.refetch(); client.invalidateQueries({ queryKey: ["assignment-summaries"] }); },
  });
  const remind = useMutation({
    mutationFn: () => selected ? remindMissing(selected, classes.data?.find((item) => item.id === selected.classId)?.studentIds ?? []) : Promise.reject(new Error("ASSIGNMENT_NOT_SELECTED")),
  });

  const content = (
    <>
      <PageHeader actions={<Button variant="primary" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Tạo bài tập</Button>} />
      {role === "admin" && (
        <div className="mb-4 rounded-input border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <strong>Chế độ Admin.</strong> Bạn đang xem và thao tác trên bài tập của toàn bộ lớp học.
        </div>
      )}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo bài tập" description="Giao bài mới và theo dõi kết quả trong cùng sổ điểm." size="lg">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!create.isPending) create.mutate();
        }}
        className="grid gap-3 md:grid-cols-3"
      >
        <FormField label="Tên bài tập" htmlFor="assignment-title"><input id="assignment-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="min-h-touch w-full rounded-input border px-3" /></FormField>
        <FormField label="Lớp học" htmlFor="assignment-class"><select id="assignment-class" required value={form.classId} onChange={(e) => {
          const klass = classes.data?.find((item) => item.id === e.target.value);
          setForm({ ...form, classId: e.target.value, subjectId: klass?.subjectIds.length === 1 ? klass.subjectIds[0] : "", lessonPlanId: "", sessionId: "" });
        }} className="min-h-touch w-full rounded-input border px-3"><option value="">Chọn lớp</option>{classes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Môn học" htmlFor="assignment-subject"><select id="assignment-subject" required disabled={!form.classId} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="min-h-touch w-full rounded-input border px-3 disabled:opacity-50"><option value="">Chọn môn</option>{subjectsForClass.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Hạn nộp" htmlFor="assignment-due"><input id="assignment-due" required type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className="min-h-touch w-full rounded-input border px-3" /></FormField>
        <FormField label="Điểm tối đa" htmlFor="assignment-max"><input id="assignment-max" type="number" min={1} value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} className="min-h-touch w-full rounded-input border px-3" /></FormField>
        <FormField label="Trạng thái" htmlFor="assignment-status"><select id="assignment-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AssignmentDoc["status"] })} className="min-h-touch w-full rounded-input border px-3"><option value="published">Giao ngay</option><option value="draft">Lưu nháp</option></select></FormField>
        <FormField label="Yêu cầu bài tập" htmlFor="assignment-description" className="md:col-span-3"><textarea id="assignment-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded-input border p-3" /></FormField>
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
        <Button type="submit" variant="primary" disabled={create.isPending || !form.subjectId}>
          {create.isPending ? "Đang giao..." : "Giao bài"}
        </Button>
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
          <div className="border-b border-neutral-200 p-3">
            <SearchInput value={queryText} onChange={setQueryText} placeholder="Tìm bài tập..." />
          </div>
          {assignments.isLoading && <div className="p-4"><LoadingSkeleton rows={4} /></div>}
          {assignments.isError && (
            <div className="p-4"><ErrorState message="Không thể tải danh sách bài tập. Vui lòng kiểm tra kết nối và thử lại." onRetry={() => assignments.refetch()} /></div>
          )}
          {!assignments.isLoading && !assignments.isError && (assignments.data?.length ?? 0) === 0 && (
            <div className="p-4"><EmptyState title="Chưa có bài tập nào" description="Bấm 'Tạo bài tập' để giao bài đầu tiên." /></div>
          )}
          <ul className="divide-y">
            {filteredAssignments.map((item) => {
              const summary = summaryById.get(item.id);
              return (
              <li key={item.id} className={selected?.id === item.id ? "bg-primary-50 shadow-[inset_3px_0_0_theme(colors.primary.500)]" : ""}>
                <button onClick={() => setSelected(item)} className="w-full px-4 py-3 text-left transition hover:bg-neutral-50">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{item.title}</p><span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${item.status === "published" ? "bg-success-50 text-success-700" : "bg-neutral-100 text-neutral-600"}`}>{item.status === "published" ? "Đã giao" : "Bản nháp"}</span></div>
                  <p className="mt-1 text-xs text-neutral-500">Hạn {format(item.dueAt.toDate(), "dd/MM HH:mm")}</p>
                  {summary && <p className="mt-2 text-xs font-medium text-neutral-600">{summary.submittedCount}/{summary.totalStudents} đã nộp · {summary.gradedCount} đã chấm</p>}
                </button>
              </li>
            );})}
          </ul>
        </section>
        <section className="overflow-hidden rounded-card border border-neutral-200 bg-white">
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-4">
            <div><h2 className="text-base font-semibold">{selected ? selected.title : "Chọn bài tập để chấm"}</h2>{selected && <p className="mt-1 text-xs text-neutral-500">Thang điểm {selected.maxScore} · Hạn {format(selected.dueAt.toDate(), "dd/MM HH:mm")}</p>}</div>
            {selected && (
              <Button
                variant="secondary"
                icon={<Bell size={16} />}
                disabled={remind.isPending}
                onClick={() => remind.mutate()}
              >
                {remind.isPending ? "Đang gửi..." : "Nhắc chưa nộp"}
              </Button>
            )}
          </div>
          {remind.isSuccess && <p aria-live="polite" className="border-b border-success-100 bg-success-50 px-4 py-2 text-sm text-success-700">Đã tạo thông báo nhắc cho học sinh chưa nộp.</p>}
          {remind.isError && <p role="alert" className="border-b border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700">Không thể gửi nhắc bài. Vui lòng thử lại.</p>}
          {selected && submissions.isLoading && <div className="p-4"><LoadingSkeleton rows={3} /></div>}
          {selected && submissions.isError && (
            <div className="p-4"><ErrorState message="Không thể tải bài nộp. Vui lòng kiểm tra kết nối và thử lại." onRetry={() => submissions.refetch()} /></div>
          )}
          {selected && !submissions.isLoading && !submissions.isError && (submissions.data?.length ?? 0) === 0 && (
            <div className="p-4"><EmptyState title="Chưa có bài nộp nào" description="Khi học sinh nộp bài, danh sách sẽ hiển thị ở đây." /></div>
          )}
          <ul className="divide-y px-4">
            {submissions.data?.map((item) => (
              <SubmissionRow key={item.id} item={item} studentName={studentNames.get(item.studentId) ?? item.studentId} maxScore={selected?.maxScore ?? 10} pending={grade.isPending && grade.variables?.id === item.id} succeeded={grade.isSuccess && grade.variables?.id === item.id} error={grade.isError && grade.variables?.id === item.id} onGrade={(score, comment, status) => grade.mutate({ id: item.id, score, comment, status })} />
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
  studentName,
  maxScore,
  pending,
  succeeded,
  error,
  onGrade,
}: {
  item: Awaited<ReturnType<typeof listSubmissions>>[number];
  studentName: string;
  maxScore: number;
  pending: boolean;
  succeeded: boolean;
  error: boolean;
  onGrade: (score: number | null, comment: string, status: SubmissionStatus) => void;
}) {
  const [score, setScore] = useState(item.score?.toString() ?? "");
  const [comment, setComment] = useState(item.teacherComment);
  useEffect(() => {
    setScore(item.score?.toString() ?? "");
    setComment(item.teacherComment);
  }, [item.score, item.teacherComment]);
  const scoreNumber = score.trim() === "" ? null : Number(score);
  const scoreInvalid = scoreNumber == null || !Number.isFinite(scoreNumber) || scoreNumber < 0 || scoreNumber > maxScore;
  return (
    <li className="grid gap-2 py-4 md:grid-cols-[minmax(150px,1fr)_100px_minmax(180px,1fr)_auto]">
      <div>
        <p className="text-sm font-medium">{studentName}</p>
        <p className="line-clamp-2 text-xs text-neutral-500">{item.submissionText || item.submissionUrl || "Không có nội dung văn bản"}</p>
      </div>
      <input aria-label={`Điểm ${studentName}`} type="number" min={0} max={maxScore} value={score} onChange={(e) => setScore(e.target.value)} className={`min-h-touch rounded-input border px-2 ${score && scoreInvalid ? "border-danger-400" : ""}`} />
      <input aria-label="Nhận xét" value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-touch rounded-input border px-2" />
      <div className="flex gap-2">
        <Button variant="primary" disabled={pending || scoreInvalid} onClick={() => onGrade(scoreNumber, comment, "graded")}>
          {pending ? "Đang lưu..." : "Chấm"}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => onGrade(null, comment, "redo_required")}>
          Làm lại
        </Button>
      </div>
      {(succeeded || error) && <p className={`flex items-center gap-1 text-xs md:col-start-2 md:col-span-3 ${error ? "text-danger-700" : "text-success-700"}`}>{!error && <CheckCircle2 size={14} />}{error ? "Không thể lưu kết quả. Dữ liệu nhập vẫn được giữ lại." : "Đã cập nhật kết quả."}</p>}
    </li>
  );
}

function FormField({ label, htmlFor, className = "", children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-neutral-700">{label}</label>{children}</div>;
}
