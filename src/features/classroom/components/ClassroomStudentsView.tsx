import type { Dispatch, SetStateAction } from "react";
import { format } from "date-fns";
import { BookOpen, BookOpenCheck, ClipboardCheck, Eye, MessageSquareText, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import {
  OptionGroup,
  TextArea,
} from "@/features/classroom/components/ClassroomInteractionUi";
import {
  ATTENDANCE_OPTIONS,
  HOMEWORK_OPTIONS,
} from "@/features/classroom/components/classroomInteractionOptions";
import type { getLessonPlanBySession } from "@/services/firestore/lessonPlans";
import type { listStudents } from "@/services/firestore/students";
import type { ClassroomStudentEntry } from "@/services/firestore/classroomInteractions";
import type { AttendanceStatus, PreviousHomeworkStatus } from "@/types/academic";

type Student = Awaited<ReturnType<typeof listStudents>>[number];
type LessonPlan = Awaited<ReturnType<typeof getLessonPlanBySession>>;

interface ClassroomStudentsViewProps {
  active: boolean;
  classStudents: Student[];
  entries: Record<string, ClassroomStudentEntry>;
  homeworkText: string;
  isPublished: boolean;
  lastSavedAt: Date | null;
  lessonPlan: { data: LessonPlan | undefined; isLoading: boolean; isError: boolean };
  mutation: { isPending: boolean; isError: boolean; mutate: () => void };
  quickSummary: string;
  setAll: (patch: Partial<ClassroomStudentEntry>) => void;
  setHomeworkText: Dispatch<SetStateAction<string>>;
  setLessonPlanOpen: Dispatch<SetStateAction<boolean>>;
  setQuickSummary: Dispatch<SetStateAction<string>>;
  setTaughtContent: Dispatch<SetStateAction<string>>;
  taughtContent: string;
  updateEntry: (studentId: string, patch: Partial<ClassroomStudentEntry>) => void;
}

export function ClassroomStudentsView({
  active,
  classStudents,
  entries,
  homeworkText,
  isPublished,
  lastSavedAt,
  lessonPlan,
  mutation,
  quickSummary,
  setAll,
  setHomeworkText,
  setLessonPlanOpen,
  setQuickSummary,
  setTaughtContent,
  taughtContent,
  updateEntry,
}: ClassroomStudentsViewProps) {
  return (
    <>
{active && <div className="grid gap-4 xl:grid-cols-[minmax(620px,1.4fr)_minmax(340px,.6fr)]">
        <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="flex flex-col gap-4 border-b border-neutral-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold">Ghi nhận học sinh</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="border-primary-200 bg-primary-50 text-primary-700" disabled={isPublished} onClick={() => setAll({ attendanceStatus: "present" })} icon={<ClipboardCheck size={15} />}>Tất cả có mặt</Button>
              <Button size="sm" className="border-accent-100 bg-accent-50 text-accent-700" disabled={isPublished} onClick={() => setAll({ previousHomeworkStatus: "done" })} icon={<BookOpenCheck size={15} />}>Tất cả đã làm</Button>
            </div>
          </div>
          {classStudents.length ? <ul className="space-y-3 bg-neutral-50/80 p-3 sm:p-4">{classStudents.map((student, index) => {
            const entry = entries[student.id];
            return <li key={student.id} className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(28,51,137,.04)]">
              <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-input bg-neutral-100 text-xs font-black tabular-nums text-neutral-500">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-bold text-neutral-950">{student.fullName}</p><p className="mt-0.5 text-xs text-neutral-500">{student.studentCode}</p></div>
                <div className="hidden items-center gap-2 text-2xs font-semibold text-neutral-500 sm:flex"><span>{ATTENDANCE_OPTIONS.find((item) => item.value === (entry?.attendanceStatus ?? "present"))?.label}</span><span className="text-neutral-300">•</span><span>{HOMEWORK_OPTIONS.find((item) => item.value === (entry?.previousHomeworkStatus ?? "not_assigned"))?.label}</span></div>
              </div>
              <div className="grid gap-3 p-3 md:grid-cols-2 sm:p-4">
                <OptionGroup kind="attendance" icon={<ClipboardCheck size={16} />} label="Chuyên cần" helper="Tình trạng tham gia buổi học" options={ATTENDANCE_OPTIONS} value={entry?.attendanceStatus ?? "present"} disabled={isPublished} onChange={(value) => updateEntry(student.id, { attendanceStatus: value as AttendanceStatus })} />
                <OptionGroup kind="homework" icon={<BookOpenCheck size={16} />} label="Bài tập buổi trước" helper="Mức độ hoàn thành bài đã giao" options={HOMEWORK_OPTIONS} value={entry?.previousHomeworkStatus ?? "not_assigned"} disabled={isPublished} onChange={(value) => updateEntry(student.id, { previousHomeworkStatus: value as PreviousHomeworkStatus })} />
                <label className="md:col-span-2">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-neutral-600"><MessageSquareText size={14} /> Nhận xét cá nhân <span className="font-normal text-neutral-400">(không bắt buộc)</span></span>
                  <input aria-label={`Nhận xét ${student.fullName}`} value={entry?.individualComment ?? ""} disabled={isPublished} onChange={(event) => updateEntry(student.id, { individualComment: event.target.value })} placeholder="Chỉ nhập khi học sinh cần chú ý, ví dụ: nghỉ không phép hoặc chưa hoàn thành bài" className="min-h-10 w-full rounded-input border border-neutral-300 bg-neutral-50/60 px-3 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60" />
                </label>
              </div>
            </li>;
          })}</ul> : <div className="p-6"><EmptyState title="Lớp chưa có học sinh" /></div>}
        </section>

        <aside className="h-fit overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="border-b border-neutral-100 p-4"><h2 className="text-lg font-bold">Nhật ký buổi học</h2><p className="mt-1 text-xs text-neutral-500">Bản nháp chưa được gửi cho phụ huynh.</p></div>
          <div className="space-y-4 p-4">
            <section aria-labelledby="linked-lesson-plan-title" className="overflow-hidden rounded-card border border-primary-200 bg-primary-50/50">
              <div className="flex items-start gap-3 p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-input bg-primary-100 text-primary-700"><BookOpen size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p id="linked-lesson-plan-title" className="text-2xs font-black uppercase tracking-wide text-primary-700">Giáo án buổi học</p>
                  {lessonPlan.isLoading ? (
                    <p className="mt-1 text-sm text-neutral-500">Đang tải giáo án...</p>
                  ) : lessonPlan.isError ? (
                    <p className="mt-1 text-sm text-danger-700">Không tải được giáo án đã gắn.</p>
                  ) : lessonPlan.data ? (
                    <>
                      <p className="mt-1 truncate text-sm font-bold text-neutral-950">{lessonPlan.data.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">{lessonPlan.data.activities.length} hoạt động · {lessonPlan.data.activities.reduce((total, activity) => total + activity.durationMinutes, 0)} phút</p>
                    </>
                  ) : (
                    <><p className="mt-1 text-sm font-bold text-neutral-800">Chưa gắn giáo án</p><p className="mt-0.5 text-xs text-neutral-500">Buổi học này chưa có giáo án liên kết.</p></>
                  )}
                </div>
              </div>
              <div className="border-t border-primary-100 bg-white/70 p-2.5">
                {lessonPlan.data ? (
                  <Button size="sm" className="w-full" onClick={() => setLessonPlanOpen(true)} icon={<Eye size={15} />}>Xem giáo án</Button>
                ) : (
                  <Link to={ROUTES.STAFF_LESSON_PLANS} className="flex min-h-9 items-center justify-center rounded-input text-xs font-bold text-primary-700 hover:bg-primary-50">Mở Module Giáo án</Link>
                )}
              </div>
            </section>
            <TextArea label="Nội dung đã dạy" value={taughtContent} onChange={setTaughtContent} placeholder="Các nội dung đã hoàn thành trong buổi học" disabled={isPublished} />
            <TextArea label="Tổng kết nhanh" value={quickSummary} onChange={setQuickSummary} placeholder="Mức độ tiếp thu và nội dung cần ôn lại" disabled={isPublished} />
            <TextArea label="Bài tập về nhà" value={homeworkText} onChange={setHomeworkText} placeholder="Nhập bài tập hoặc ghi rõ không có bài tập" disabled={isPublished} />
          </div>
          <div className="border-t border-neutral-100 bg-neutral-50 p-4">
            {isPublished ? (
              <p className="text-center text-xs font-semibold text-success-700">Buổi học đã phát hành — nội dung đã khóa.</p>
            ) : (
              <>
                <Button variant="primary" className="w-full" disabled={mutation.isPending || classStudents.length === 0} onClick={() => mutation.mutate()} icon={<Save size={16} />}>{mutation.isPending ? "Đang lưu..." : "Lưu bản nháp"}</Button>
                {mutation.isPending ? (
                  <p className="mt-3 text-center text-xs font-semibold text-neutral-500">Đang lưu tự động...</p>
                ) : lastSavedAt ? (
                  <p className="mt-3 text-center text-xs font-semibold text-success-700">Đã lưu lúc {format(lastSavedAt, "HH:mm:ss")}</p>
                ) : null}
              </>
            )}
            {mutation.isError && <p role="alert" className="mt-3 text-center text-xs font-semibold text-danger-700">Không lưu được dữ liệu. Vui lòng kiểm tra kết nối và thử lại.</p>}
          </div>
        </aside>
      </div>}
    </>
  );
}
