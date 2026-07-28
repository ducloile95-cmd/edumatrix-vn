import type { FieldErrors, UseFieldArrayReturn, UseFormRegister } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LessonPlanFormValues } from "@/schemas/lessonPlan";

const SECTION_TITLE = "mb-3 text-xs font-bold uppercase tracking-wide text-primary-700";
const BLOCK = "border-b border-neutral-200 pb-4 last:border-b-0 last:pb-0";

interface LessonPlanActivitiesSectionProps {
  activities: UseFieldArrayReturn<LessonPlanFormValues, "activities", "id">;
  register: UseFormRegister<LessonPlanFormValues>;
  errors: FieldErrors<LessonPlanFormValues>;
  sessionDurationMinutes: number | null;
  durationMatches: boolean;
  totalMinutes: number;
}

export function LessonPlanActivitiesSection({
  activities,
  register,
  errors,
  sessionDurationMinutes,
  durationMatches,
  totalMinutes,
}: LessonPlanActivitiesSectionProps) {
  return (
<div className={BLOCK}>
            <h3 className={SECTION_TITLE}>Tiến trình buổi học</h3>
            <div className="space-y-3">
              {activities.fields.map((field, index) => (
                <div key={field.id} className="rounded-input border border-neutral-200 bg-neutral-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <input
                      aria-label={`Tên hoạt động ${index + 1}`}
                      className="min-h-9 flex-1 rounded-input border border-neutral-300 bg-white px-2.5 text-sm font-semibold focus:border-primary-500"
                      {...register(`activities.${index}.name`)}
                    />
                    <input
                      aria-label={`Thời gian hoạt động ${index + 1} (phút)`}
                      type="number"
                      min={0}
                      className="min-h-9 w-16 rounded-input border border-neutral-300 bg-white px-2 text-center text-sm focus:border-primary-500"
                      {...register(`activities.${index}.durationMinutes`)}
                    />
                    <span className="shrink-0 text-xs text-neutral-500">phút</span>
                    <button
                      type="button"
                      aria-label="Xóa hoạt động"
                      onClick={() => activities.remove(index)}
                      disabled={activities.fields.length <= 1}
                      className="flex size-8 shrink-0 items-center justify-center rounded-input border border-neutral-300 bg-white text-neutral-500 hover:border-danger-500 hover:text-danger-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`lp-act-content-${index}`} className="mb-1 block text-xs font-semibold text-neutral-500">
                        Nội dung / cách thực hiện
                      </label>
                      <textarea id={`lp-act-content-${index}`} className="min-h-14 w-full rounded-input border border-neutral-300 bg-white p-2 text-xs" {...register(`activities.${index}.content`)} />
                    </div>
                    <div>
                      <label htmlFor={`lp-act-outcome-${index}`} className="mb-1 block text-xs font-semibold text-neutral-500">
                        Sản phẩm / kết quả mong đợi
                      </label>
                      <textarea id={`lp-act-outcome-${index}`} className="min-h-14 w-full rounded-input border border-neutral-300 bg-white p-2 text-xs" {...register(`activities.${index}.expectedOutcome`)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.activities && <p role="alert" className="mt-2 text-xs text-danger-700">{errors.activities.message}</p>}

            <Button
              type="button"
              className="mt-3"
              onClick={() => activities.append({ name: "Hoạt động mới", durationMinutes: 0, content: "", expectedOutcome: "" })}
              icon={<Plus size={16} />}
            >
              Thêm hoạt động
            </Button>

            {sessionDurationMinutes != null && (
              <div className={`mt-3 flex items-center justify-between gap-3 rounded-input border px-3 py-2 text-xs font-semibold ${durationMatches ? "border-success-200 bg-success-50 text-success-700" : "border-warning-100 bg-warning-50 text-warning-700"}`}>
                <span>Tổng thời gian các hoạt động: {totalMinutes} / {sessionDurationMinutes} phút của buổi học</span>
                <span>{durationMatches ? "Khớp thời lượng" : "Chưa khớp thời lượng"}</span>
              </div>
            )}
          </div>
  );
}
