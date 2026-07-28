import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { formatSessionLabel } from "@/utils/lessonPlan";
import type { LessonPlanFormValues } from "@/schemas/lessonPlan";
import type { listClasses } from "@/services/firestore/classes";
import type { listSessionsByClass } from "@/services/firestore/sessions";

const INPUT = "min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500";
const TEXTAREA = "min-h-20 w-full rounded-input border border-neutral-300 p-3 text-sm focus:border-primary-500";
const LABEL = "mb-1 block text-sm font-medium text-neutral-700";
const SECTION_TITLE = "mb-3 text-xs font-bold uppercase tracking-wide text-primary-700";
const BLOCK = "border-b border-neutral-200 pb-4 last:border-b-0 last:pb-0";

type ClassItem = Awaited<ReturnType<typeof listClasses>>[number];
type SessionItem = Awaited<ReturnType<typeof listSessionsByClass>>[number];

interface LessonPlanBasicsSectionProps {
  classes?: ClassItem[];
  classId: string | null;
  errors: FieldErrors<LessonPlanFormValues>;
  onSelectClass: (value: string) => void;
  register: UseFormRegister<LessonPlanFormValues>;
  selectedClass: ClassItem | null;
  sessionDurationMinutes: number | null;
  sessions?: SessionItem[];
}

export function LessonPlanBasicsSection({
  classes,
  classId,
  errors,
  onSelectClass,
  register,
  selectedClass,
  sessionDurationMinutes,
  sessions,
}: LessonPlanBasicsSectionProps) {
  return (
    <>
<div className={BLOCK}>
            <h3 className={SECTION_TITLE}>Thông tin chung</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="lp-title" className={LABEL}>
                  Tiêu đề bài học<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input id="lp-title" type="text" placeholder="VD: Unit 5 — Describing People" className={INPUT} {...register("title")} />
                {errors.title && <p role="alert" className="mt-1 text-xs text-danger-700">{errors.title.message}</p>}
              </div>

              <div>
                <label htmlFor="lp-class" className={LABEL}>
                  Lớp<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <select id="lp-class" className={INPUT} value={classId ?? ""} onChange={(event) => onSelectClass(event.target.value)}>
                  <option value="">-- Chọn lớp --</option>
                  {classes?.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {errors.classId && <p role="alert" className="mt-1 text-xs text-danger-700">{errors.classId.message}</p>}
              </div>

              <div>
                <label htmlFor="lp-status" className={LABEL}>Trạng thái</label>
                <select id="lp-status" className={INPUT} {...register("status")}>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Xuất bản</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </div>

              <div>
                <label htmlFor="lp-session" className={LABEL}>
                  Buổi học <span className="text-xs font-normal text-neutral-500">lọc theo lớp</span>
                </label>
                <select
                  id="lp-session"
                  className={INPUT}
                  disabled={!classId}
                  {...register("sessionId")}
                >
                  <option value="">-- Chọn buổi học --</option>
                  {sessions?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatSessionLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-600">
                    Khóa học liên kết theo lớp đã chọn
                  </span>
                  {sessionDurationMinutes != null && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-600">
                      Thời lượng buổi học: {sessionDurationMinutes} phút
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={BLOCK}>
            <h3 className={SECTION_TITLE}>Mục tiêu buổi học</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="lp-obj-knowledge" className={LABEL}>Kiến thức</label>
                <textarea id="lp-obj-knowledge" className={TEXTAREA} {...register("objectives.knowledge")} />
              </div>
              <div>
                <label htmlFor="lp-obj-skills" className={LABEL}>Kỹ năng</label>
                <textarea id="lp-obj-skills" className={TEXTAREA} {...register("objectives.skills")} />
              </div>
              <div>
                <label htmlFor="lp-obj-attitude" className={LABEL}>Thái độ / Năng lực</label>
                <textarea id="lp-obj-attitude" className={TEXTAREA} {...register("objectives.attitude")} />
              </div>
            </div>
          </div>

          <div className={BLOCK}>
            <h3 className={SECTION_TITLE}>Chuẩn bị</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="lp-prep-teacher" className={LABEL}>Giáo viên</label>
                <textarea id="lp-prep-teacher" className={TEXTAREA} {...register("preparation.teacher")} />
              </div>
              <div>
                <label htmlFor="lp-prep-student" className={LABEL}>Học sinh</label>
                <textarea id="lp-prep-student" className={TEXTAREA} {...register("preparation.student")} />
              </div>
            </div>
          </div>
    </>
  );
}
