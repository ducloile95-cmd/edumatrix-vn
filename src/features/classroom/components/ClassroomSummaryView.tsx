import { EmptyState } from "@/components/feedback/EmptyState";
import {
  Metric,
  SummaryBlock,
} from "@/features/classroom/components/ClassroomInteractionUi";
import {
  ATTENDANCE_OPTIONS,
  HOMEWORK_OPTIONS,
} from "@/features/classroom/components/classroomInteractionOptions";
import type { ClassroomStudentEntry } from "@/services/firestore/classroomInteractions";
import type { listStudents } from "@/services/firestore/students";

type Student = Awaited<ReturnType<typeof listStudents>>[number];

interface ClassroomSummaryViewProps {
  active: boolean;
  attendanceLate: number;
  attendancePresent: number;
  attentionStudents: Student[];
  classStudents: Student[];
  entries: Record<string, ClassroomStudentEntry>;
  homeworkDone: number;
  homeworkText: string;
  quickSummary: string;
  taughtContent: string;
}

export function ClassroomSummaryView({
  active,
  attendanceLate,
  attendancePresent,
  attentionStudents,
  classStudents,
  entries,
  homeworkDone,
  homeworkText,
  quickSummary,
  taughtContent,
}: ClassroomSummaryViewProps) {
  return (
    <>
{active && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]">
            <h2 className="text-lg font-bold text-neutral-950">Tổng kết buổi học</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric value={`${attendancePresent}/${classStudents.length}`} label="Có mặt" />
              <Metric value={attendanceLate} label="Đi muộn" />
              <Metric value={`${homeworkDone}/${classStudents.length}`} label="Hoàn thành bài" />
              <Metric value={attentionStudents.length} label="Cần lưu ý" />
            </div>
            <div className="mt-5 space-y-4 text-sm text-neutral-700">
              <SummaryBlock title="Nội dung đã dạy" value={taughtContent} empty="Chưa nhập nội dung đã dạy." />
              <SummaryBlock title="Đánh giá chung" value={quickSummary} empty="Chưa nhập tổng kết nhanh." />
              <SummaryBlock title="Bài tập về nhà" value={homeworkText} empty="Chưa nhập bài tập về nhà." />
            </div>
          </section>
          <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]">
            <h2 className="text-lg font-bold text-neutral-950">Học sinh cần chú ý</h2>
            {attentionStudents.length ? <ul className="mt-4 space-y-2">{attentionStudents.map((student) => { const entry = entries[student.id]; return <li key={student.id} className="rounded-input border border-warning-100 bg-warning-50 p-3"><p className="text-sm font-bold text-neutral-900">{student.fullName}</p><p className="mt-1 text-xs text-warning-800">{ATTENDANCE_OPTIONS.find((item) => item.value === entry.attendanceStatus)?.label} · {HOMEWORK_OPTIONS.find((item) => item.value === entry.previousHomeworkStatus)?.label}</p><p className="mt-2 text-sm text-neutral-700">{entry.individualComment || "Chưa có nhận xét riêng."}</p></li>; })}</ul> : <div className="mt-4"><EmptyState title="Không có học sinh cần chú ý" /></div>}
          </section>
        </div>
      )}
    </>
  );
}
