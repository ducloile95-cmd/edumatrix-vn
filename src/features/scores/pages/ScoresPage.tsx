import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, RotateCcw, Save } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses, getClass } from "@/services/firestore/classes";
import { listStudents } from "@/services/firestore/students";
import { listSubjects } from "@/services/firestore/subjects";
import { writeAuditLog } from "@/services/firestore/auditLog";
import { listScoresByClass, saveClassScores, type ScoreEntry } from "@/services/firestore/scores";
import type { AssessmentType, ScoreDoc } from "@/types/academic";

interface ScoresPageProps {
  embedded?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

interface DraftScore { score: string; comment: string }

const ASSESSMENT_LABEL: Record<AssessmentType, string> = {
  quiz: "Quiz",
  midterm: "Giữa kỳ",
  final: "Cuối kỳ",
  assignment: "Bài tập",
};

function assessmentKey(score: Pick<ScoreDoc, "subjectId" | "assessmentName" | "assessmentType" | "maxScore">): string {
  return `${score.subjectId}|${score.assessmentType}|${score.assessmentName.trim().toLocaleLowerCase("vi")}|${score.maxScore}`;
}

export default function ScoresPage({ embedded = false, onDirtyChange }: ScoresPageProps) {
  const { firebaseUser, role } = useAuth();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [meta, setMeta] = useState({ name: "", type: "quiz" as AssessmentType, max: 10, subjectId: "" });
  const [entries, setEntries] = useState<Record<string, DraftScore>>({});
  const [baseline, setBaseline] = useState<Record<string, DraftScore>>({});
  const hydratedKey = useRef("");

  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const klass = useQuery({ queryKey: ["class", classId], queryFn: () => getClass(classId), enabled: !!classId });
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const scores = useQuery({
    queryKey: ["scores", "class", classId],
    queryFn: () => listScoresByClass(classId),
    enabled: !!classId,
  });

  const classStudents = useMemo(
    () => students.data?.filter((student) => klass.data?.studentIds.includes(student.id)) ?? [],
    [klass.data?.studentIds, students.data],
  );
  const classSubjects = subjects.data?.filter((subject) => klass.data?.subjectIds.includes(subject.id)) ?? [];
  const currentKey = meta.name.trim() && meta.subjectId
    ? assessmentKey({ subjectId: meta.subjectId, assessmentName: meta.name, assessmentType: meta.type, maxScore: Number(meta.max) })
    : "";
  const dirtyCount = useMemo(() => Object.entries(entries).filter(([studentId, entry]) => {
    const saved = baseline[studentId] ?? { score: "", comment: "" };
    return entry.score !== saved.score || entry.comment !== saved.comment;
  }).length, [baseline, entries]);
  const dirty = dirtyCount > 0;

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const availableIds = klass.data?.subjectIds ?? [];
    if (availableIds.length > 0 && !availableIds.includes(meta.subjectId)) {
      setMeta((current) => ({ ...current, subjectId: availableIds[0] }));
    }
  }, [klass.data?.subjectIds, meta.subjectId]);

  useEffect(() => {
    if (!currentKey || scores.isLoading || hydratedKey.current === currentKey) return;
    const next = Object.fromEntries((scores.data ?? [])
      .filter((score) => assessmentKey(score) === currentKey)
      .map((score) => [score.studentId, { score: String(score.score), comment: score.teacherComment }]));
    hydratedKey.current = currentKey;
    setEntries(next);
    setBaseline(next);
  }, [currentKey, scores.data, scores.isLoading]);

  const columns = useMemo(() => {
    const map = new Map<string, ScoreDoc & { id: string }>();
    (scores.data ?? []).filter((score) => !meta.subjectId || score.subjectId === meta.subjectId).forEach((score) => {
      const key = assessmentKey(score);
      if (!map.has(key)) map.set(key, score);
    });
    return [...map.entries()].slice(-8);
  }, [meta.subjectId, scores.data]);
  const scoreByCell = useMemo(() => new Map((scores.data ?? []).map((score) => [
    `${assessmentKey(score)}|${score.studentId}`,
    score,
  ])), [scores.data]);

  const validEntries: ScoreEntry[] = Object.entries(entries)
    .filter(([, entry]) => entry.score.trim() !== "")
    .map(([studentId, entry]) => ({ studentId, score: Number(entry.score), comment: entry.comment }));
  const incompleteCount = Object.values(entries).filter((entry) => entry.score.trim() === "" && entry.comment.trim() !== "").length;

  const save = useMutation({
    mutationFn: () => saveClassScores({
      classId,
      subjectId: meta.subjectId,
      assessmentName: meta.name.trim(),
      assessmentType: meta.type,
      maxScore: Number(meta.max),
      entries: validEntries,
      actorUid: firebaseUser?.uid ?? "unknown",
    }),
    onSuccess: async () => {
      if (role === "admin" && firebaseUser) {
        void writeAuditLog(firebaseUser, "scores_adjusted", "gradebook", classId, {
          assessmentName: meta.name.trim(),
          subjectId: meta.subjectId,
          changedStudents: String(validEntries.length),
        });
      }
      await scores.refetch();
      const savedEntries = Object.fromEntries(Object.entries(entries).filter(([, entry]) => entry.score.trim() !== ""));
      setEntries(savedEntries);
      setBaseline(savedEntries);
      queryClient.invalidateQueries({ queryKey: ["learning-overview-scores"] });
    },
  });

  function confirmDiscard(): boolean {
    return !dirty || window.confirm("Bạn có thay đổi điểm chưa lưu. Bỏ các thay đổi này?");
  }

  function changeClass(nextClassId: string) {
    if (!confirmDiscard()) return;
    setClassId(nextClassId);
    setMeta({ name: "", type: "quiz", max: 10, subjectId: "" });
    setEntries({});
    setBaseline({});
    hydratedKey.current = "";
    save.reset();
  }

  function updateMeta(changes: Partial<typeof meta>) {
    if (dirty && !window.confirm("Đổi đầu điểm sẽ bỏ dữ liệu chưa lưu. Tiếp tục?")) return;
    setMeta((current) => ({ ...current, ...changes }));
    setEntries({});
    setBaseline({});
    hydratedKey.current = "";
    save.reset();
  }

  function updateEntry(studentId: string, changes: Partial<DraftScore>) {
    save.reset();
    setEntries((current) => ({
      ...current,
      [studentId]: { score: current[studentId]?.score ?? "", comment: current[studentId]?.comment ?? "", ...changes },
    }));
  }

  function exportCsv() {
    if (!klass.data || columns.length === 0) return;
    const escape = (value: string | number) => `"${String(value).split('"').join('""')}"`;
    const header = ["Mã học sinh", "Họ tên", ...columns.map(([, column]) => column.assessmentName), "Trung bình /10"];
    const rows = classStudents.map((student) => {
      const studentScores = (scores.data ?? []).filter((score) => score.studentId === student.id && (!meta.subjectId || score.subjectId === meta.subjectId));
      const average = studentScores.length
        ? studentScores.reduce((sum, score) => sum + score.score / score.maxScore * 10, 0) / studentScores.length
        : "";
      return [
        student.studentCode,
        student.fullName,
        ...columns.map(([key]) => scoreByCell.get(`${key}|${student.id}`)?.score ?? ""),
        typeof average === "number" ? average.toFixed(1) : average,
      ];
    });
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `so-diem-${klass.data.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const content = (
    <div className="space-y-4">
      {role === "admin" && classId && (
        <div className="rounded-input border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <strong>Chế độ điều chỉnh Admin.</strong> Thay đổi điểm sẽ được ghi vào nhật ký quản trị.
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h2 className="font-bold text-neutral-900">Thiết lập sổ điểm</h2>
            {klass.data && <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">{klass.data.name}</span>}
          </div>
          <div className="space-y-4 p-4">
            <Field label="Lớp học" htmlFor="score-class">
              <select id="score-class" value={classId} onChange={(event) => changeClass(event.target.value)} className="min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3">
                <option value="">Chọn lớp</option>
                {classes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="Môn học" htmlFor="score-subject" help="Danh sách lấy từ môn đã gán cho lớp.">
              <select id="score-subject" disabled={!classId} value={meta.subjectId} onChange={(event) => updateMeta({ subjectId: event.target.value })} className="min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 disabled:opacity-50">
                <option value="">Chọn môn</option>
                {classSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="Tên đầu điểm" htmlFor="score-name">
              <input id="score-name" value={meta.name} onChange={(event) => updateMeta({ name: event.target.value })} placeholder="VD: Quiz 1" className="min-h-touch w-full rounded-input border border-neutral-300 px-3" />
            </Field>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Field label="Loại đánh giá" htmlFor="score-type">
                <select id="score-type" value={meta.type} onChange={(event) => updateMeta({ type: event.target.value as AssessmentType })} className="min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3">
                  {Object.entries(ASSESSMENT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Điểm tối đa" htmlFor="score-max">
                <input id="score-max" type="number" min={1} value={meta.max} onChange={(event) => updateMeta({ max: Number(event.target.value) })} className="min-h-touch w-full rounded-input border border-neutral-300 px-3" />
              </Field>
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{klass.data ? `Sổ điểm ${klass.data.name}` : "Chọn lớp để mở sổ điểm"}</h2>
              {klass.data && <p className="mt-1 text-xs text-neutral-500">{classStudents.length} học sinh · {columns.length} đầu điểm đã lưu</p>}
            </div>
            {classId && <div className="flex gap-2"><Button icon={<Download size={17} />} disabled={columns.length === 0} onClick={exportCsv}>Xuất CSV</Button><Button variant="primary" icon={<Plus size={17} />} onClick={() => document.getElementById("score-name")?.focus()}>Nhập điểm mới</Button></div>}
          </div>

          {!classId && <div className="p-6"><EmptyState title="Chưa chọn lớp" description="Chọn lớp và môn học để xem các điểm đã lưu hoặc thêm đầu điểm mới." /></div>}
          {classId && (klass.isLoading || students.isLoading || scores.isLoading) && <div className="p-5"><LoadingSkeleton rows={5} /></div>}
          {classId && (klass.isError || students.isError || scores.isError) && (
            <div className="p-5"><ErrorState message="Không thể tải sổ điểm. Vui lòng kiểm tra kết nối và thử lại." onRetry={() => { klass.refetch(); students.refetch(); scores.refetch(); }} /></div>
          )}
          {classId && !klass.isLoading && !students.isLoading && !scores.isLoading && classStudents.length === 0 && (
            <div className="p-5"><EmptyState title="Lớp chưa có học sinh" description="Thêm học sinh vào lớp trước khi nhập điểm." /></div>
          )}

          {classStudents.length > 0 && (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="sticky left-0 z-10 min-w-52 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left">Học sinh</th>
                      {columns.map(([key, column]) => <th key={key} className="min-w-28 border-b border-neutral-200 px-3 py-3 text-center">{column.assessmentName}<span className="block text-2xs font-normal normal-case">/{column.maxScore}</span></th>)}
                      {currentKey && !columns.some(([key]) => key === currentKey) && <th className="min-w-32 border-b border-primary-100 bg-primary-50 px-3 py-3 text-center text-primary-700">{meta.name}<span className="block text-2xs font-normal normal-case">/{meta.max}</span></th>}
                      {currentKey && <th className="min-w-52 border-b border-neutral-200 px-3 py-3 text-left">Nhận xét</th>}
                      <th className="min-w-28 border-b border-neutral-200 px-3 py-3 text-center">Trung bình</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => {
                      const publishedScores = (scores.data ?? []).filter((score) => score.studentId === student.id && (!meta.subjectId || score.subjectId === meta.subjectId));
                      const average = publishedScores.length ? publishedScores.reduce((sum, score) => sum + score.score / score.maxScore * 10, 0) / publishedScores.length : null;
                      return (
                        <tr key={student.id} className="hover:bg-neutral-50/70">
                          <td className="sticky left-0 z-[1] border-b border-neutral-100 bg-white px-4 py-3 font-semibold">{student.fullName}<span className="block text-xs font-normal text-neutral-500">{student.studentCode}</span></td>
                          {columns.map(([key]) => {
                            const score = scoreByCell.get(`${key}|${student.id}`);
                            const editable = key === currentKey;
                            return <td key={key} className={`border-b border-neutral-100 px-3 py-2 text-center font-semibold tabular-nums ${editable ? "bg-warning-50" : ""}`}>{editable ? <input aria-label={`Điểm ${student.fullName}`} type="number" min={0} max={meta.max} value={entries[student.id]?.score ?? ""} onChange={(event) => updateEntry(student.id, { score: event.target.value })} className="min-h-10 w-20 rounded-input border border-neutral-300 bg-white px-2 text-center" /> : score?.score ?? "--"}</td>;
                          })}
                          {currentKey && !columns.some(([key]) => key === currentKey) && <td className="border-b border-primary-50 bg-primary-50/60 px-3 py-2 text-center"><input aria-label={`Điểm ${student.fullName}`} type="number" min={0} max={meta.max} value={entries[student.id]?.score ?? ""} onChange={(event) => updateEntry(student.id, { score: event.target.value })} className="min-h-10 w-20 rounded-input border border-neutral-300 bg-white px-2 text-center" /></td>}
                          {currentKey && <td className="border-b border-neutral-100 px-3 py-2"><input aria-label={`Nhận xét ${student.fullName}`} value={entries[student.id]?.comment ?? ""} onChange={(event) => updateEntry(student.id, { comment: event.target.value })} placeholder="Nhận xét" className="min-h-10 w-full rounded-input border border-neutral-300 bg-white px-2" /></td>}
                          <td className="border-b border-neutral-100 px-3 py-3 text-center font-bold tabular-nums text-primary-700">{average == null ? "--" : average.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {classStudents.map((student) => (
                  <article key={student.id} className="rounded-input border border-neutral-200 p-3">
                    <div className="mb-3 flex items-start justify-between gap-2"><div><h3 className="font-semibold">{student.fullName}</h3><p className="text-xs text-neutral-500">{student.studentCode}</p></div>{entries[student.id]?.score && <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">{entries[student.id].score}/{meta.max}</span>}</div>
                    {currentKey ? <div className="grid grid-cols-[90px_1fr] gap-2"><input aria-label={`Điểm ${student.fullName}`} type="number" min={0} max={meta.max} value={entries[student.id]?.score ?? ""} onChange={(event) => updateEntry(student.id, { score: event.target.value })} placeholder="Điểm" className="min-h-touch rounded-input border border-neutral-300 px-3" /><input aria-label={`Nhận xét ${student.fullName}`} value={entries[student.id]?.comment ?? ""} onChange={(event) => updateEntry(student.id, { comment: event.target.value })} placeholder="Nhận xét" className="min-h-touch min-w-0 rounded-input border border-neutral-300 px-3" /></div> : <p className="text-sm text-neutral-500">Nhập tên đầu điểm để bắt đầu nhập điểm.</p>}
                  </article>
                ))}
              </div>

              <div className="sticky bottom-0 flex flex-col gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-neutral-600"><strong>{dirtyCount} thay đổi chưa lưu.</strong>{incompleteCount > 0 && <span className="ml-1 text-warning-700">{incompleteCount} nhận xét chưa có điểm sẽ không được lưu.</span>}</div>
                <div className="flex gap-2">
                  {dirty && <Button icon={<RotateCcw size={17} />} onClick={() => { setEntries(baseline); save.reset(); }}>Hoàn tác</Button>}
                  <Button type="button" variant="primary" icon={<Save size={17} />} disabled={!dirty || validEntries.length === 0 || !classId || !meta.subjectId || !meta.name.trim() || meta.max <= 0 || save.isPending} onClick={() => save.mutate()}>
                    {save.isPending ? "Đang lưu..." : role === "admin" ? `Lưu điều chỉnh (${validEntries.length})` : `Lưu điểm (${validEntries.length})`}
                  </Button>
                </div>
              </div>
              {save.isError && <p role="alert" className="px-4 pb-3 text-sm text-danger-700">{save.error instanceof Error && save.error.message === "SCORE_INVALID" ? `Có điểm nằm ngoài khoảng 0-${meta.max}. Kiểm tra lại rồi lưu tiếp.` : "Lưu thất bại. Dữ liệu đã nhập vẫn được giữ lại."}</p>}
              {save.isSuccess && <p aria-live="polite" className="px-4 pb-3 text-sm text-success-700">Đã lưu điểm thành công.</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );

  return embedded ? content : <AppShell>{content}</AppShell>;
}

function Field({ label, htmlFor, help, children }: { label: string; htmlFor: string; help?: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-neutral-700">{label}</label>{children}{help && <p className="mt-1 text-xs text-neutral-500">{help}</p>}</div>;
}
