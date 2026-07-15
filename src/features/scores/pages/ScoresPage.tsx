import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/layouts/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses, getClass } from "@/services/firestore/classes";
import { listStudents } from "@/services/firestore/students";
import { listScoresByClass, saveClassScores, type ScoreEntry } from "@/services/firestore/scores";
import type { AssessmentType } from "@/types/academic";

const DISTRIBUTION_BUCKETS = [
  { label: "<50%", min: 0, max: 50 },
  { label: "50-65%", min: 50, max: 65 },
  { label: "65-80%", min: 65, max: 80 },
  { label: "80-90%", min: 80, max: 90 },
  { label: "90-100%", min: 90, max: 101 },
];

export default function ScoresPage() {
  const { firebaseUser } = useAuth();
  const [classId, setClassId] = useState("");
  const [meta, setMeta] = useState({ name: "", type: "quiz" as AssessmentType, max: 10, subjectId: "" });
  const [entries, setEntries] = useState<Record<string, ScoreEntry>>({});

  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const klass = useQuery({ queryKey: ["class", classId], queryFn: () => getClass(classId), enabled: !!classId });
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const scores = useQuery({ queryKey: ["scores", classId], queryFn: () => listScoresByClass(classId), enabled: !!classId });
  const classStudents = students.data?.filter((s) => klass.data?.studentIds.includes(s.id)) ?? [];

  const save = useMutation({
    mutationFn: () =>
      saveClassScores({
        classId,
        subjectId: meta.subjectId,
        assessmentName: meta.name,
        assessmentType: meta.type,
        maxScore: Number(meta.max),
        entries: Object.values(entries),
        actorUid: firebaseUser?.uid ?? "unknown",
      }),
    onSuccess: () => scores.refetch(),
  });

  const chart = useMemo(
    () => scores.data?.map((item) => ({ name: item.assessmentName, value: Math.round((item.score / item.maxScore) * 100) })).slice(-20) ?? [],
    [scores.data],
  );

  const distribution = useMemo(() => {
    const buckets = DISTRIBUTION_BUCKETS.map((bucket) => ({ ...bucket, count: 0 }));
    scores.data?.forEach((item) => {
      const percent = (item.score / item.maxScore) * 100;
      const bucket = buckets.find((b) => percent >= b.min && percent < b.max);
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }, [scores.data]);

  return (
    <AppShell>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Chọn lớp" value={classId} onChange={(e) => setClassId(e.target.value)} className="min-h-touch rounded-input border px-3">
          <option value="">Chọn lớp</option>
          {classes.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input aria-label="Tên bài đánh giá" placeholder="Tên bài đánh giá" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} className="min-h-touch rounded-input border px-3" />
        <select aria-label="Loại đánh giá" value={meta.type} onChange={(e) => setMeta({ ...meta, type: e.target.value as AssessmentType })} className="min-h-touch rounded-input border px-3">
          <option value="quiz">Quiz</option>
          <option value="midterm">Giữa kỳ</option>
          <option value="final">Cuối kỳ</option>
          <option value="assignment">Bài tập</option>
        </select>
        <input aria-label="Mã môn" placeholder="Mã môn" value={meta.subjectId} onChange={(e) => setMeta({ ...meta, subjectId: e.target.value })} className="min-h-touch rounded-input border px-3" />
        <input aria-label="Điểm tối đa" type="number" min={1} value={meta.max} onChange={(e) => setMeta({ ...meta, max: Number(e.target.value) })} className="w-24 min-h-touch rounded-input border px-3" />
      </div>

      <ul className="mt-4 divide-y">
        {classStudents.map((student) => (
          <li key={student.id} className="grid gap-2 py-3 md:grid-cols-[1fr_120px_1fr]">
            <span className="text-sm font-medium">{student.fullName}</span>
            <input
              aria-label={`Điểm ${student.fullName}`}
              type="number"
              min={0}
              max={meta.max}
              value={entries[student.id]?.score ?? ""}
              onChange={(e) => setEntries({ ...entries, [student.id]: { studentId: student.id, score: Number(e.target.value), comment: entries[student.id]?.comment ?? "" } })}
              className="min-h-touch rounded-input border px-3"
            />
            <input
              aria-label={`Nhận xét ${student.fullName}`}
              placeholder="Nhận xét"
              value={entries[student.id]?.comment ?? ""}
              onChange={(e) => setEntries({ ...entries, [student.id]: { studentId: student.id, score: entries[student.id]?.score ?? 0, comment: e.target.value } })}
              className="min-h-touch rounded-input border px-3"
            />
          </li>
        ))}
      </ul>

      {classStudents.length > 0 && (
        <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-3 min-h-touch rounded-input bg-primary-500 px-5 text-white disabled:opacity-50">
          {save.isPending ? "Đang lưu..." : "Lưu điểm cả lớp"}
        </button>
      )}
      {save.isError && (
        <p role="alert" className="mt-2 text-sm text-danger-700">
          Lưu thất bại. Kiểm tra mạng và bấm Lưu lại - điểm đã nhập vẫn còn.
        </p>
      )}
      {save.isSuccess && <p className="mt-2 text-sm text-success-700">Đã lưu điểm cả lớp.</p>}

      <section className="mt-5">
        <h2>Lịch sử và tiến bộ</h2>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} aria-label="Biểu đồ tiến bộ điểm trung bình các bài đánh giá gần đây">
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3366F0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-5">
        <h2>Phân phối điểm</h2>
        <p className="mt-1 text-sm text-neutral-500">Số học sinh theo từng khoảng điểm, tính trên toàn bộ bài đánh giá của lớp.</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} aria-label="Biểu đồ phân phối điểm học sinh theo khoảng điểm">
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value: number) => [`${value} học sinh`, "Số lượng"]} />
              <Bar dataKey="count" fill="#3366F0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </AppShell>
  );
}
