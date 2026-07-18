import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, subDays } from "date-fns";
import { Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses } from "@/services/firestore/classes";
import { listSessionsByClass } from "@/services/firestore/sessions";
import {
  createLessonPlan,
  createLessonPlanTemplate,
  listLessonPlanTemplates,
  updateLessonPlan,
} from "@/services/firestore/lessonPlans";
import { formatSessionLabel } from "@/utils/lessonPlan";
import { lessonPlanFormSchema, type LessonPlanFormValues } from "@/schemas/lessonPlan";
import type { LessonPlanDoc } from "@/types/academic";

interface LessonPlanFormProps {
  /** Neu co gia tri => form o che do sua. */
  editingPlan?: (LessonPlanDoc & { id: string }) | null;
  onDone?: () => void;
}

const DEFAULT_VALUES: LessonPlanFormValues = {
  title: "",
  classId: null,
  courseId: null,
  subjectId: null,
  sessionId: null,
  objectives: { knowledge: "", skills: "", attitude: "" },
  preparation: { teacher: "", student: "" },
  activities: [
    { name: "Khởi động", durationMinutes: 10, content: "", expectedOutcome: "" },
    { name: "Hình thành kiến thức", durationMinutes: 25, content: "", expectedOutcome: "" },
    { name: "Luyện tập - Vận dụng", durationMinutes: 40, content: "", expectedOutcome: "" },
    { name: "Củng cố - Dặn dò", durationMinutes: 15, content: "", expectedOutcome: "" },
  ],
  homework: "",
  notesAfterTeaching: "",
  attachmentUrl: null,
  attachmentLabel: "",
  publicSummary: "",
  status: "draft",
};

const INPUT = "min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500";
const TEXTAREA = "min-h-20 w-full rounded-input border border-neutral-300 p-3 text-sm focus:border-primary-500";
const LABEL = "mb-1 block text-sm font-medium text-neutral-700";
const SECTION_TITLE = "mb-3 text-xs font-bold uppercase tracking-wide text-primary-700";
/** Khung ngăn cách các khối trong 1 cột (không dùng card lồng card vì cột đã có viền riêng). */
const BLOCK = "border-b border-neutral-200 pb-4 last:border-b-0 last:pb-0";

export function LessonPlanForm({ editingPlan, onDone }: LessonPlanFormProps) {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!editingPlan;

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const { data: templates } = useQuery({ queryKey: ["lesson-plan-templates"], queryFn: listLessonPlanTemplates });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LessonPlanFormValues>({
    resolver: zodResolver(lessonPlanFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const activities = useFieldArray({ control, name: "activities" });

  useEffect(() => {
    if (editingPlan) {
      reset({
        title: editingPlan.title,
        classId: editingPlan.classId,
        courseId: editingPlan.courseId,
        subjectId: editingPlan.subjectId,
        sessionId: editingPlan.sessionId,
        objectives: editingPlan.objectives,
        preparation: editingPlan.preparation,
        activities: editingPlan.activities,
        homework: editingPlan.homework,
        notesAfterTeaching: editingPlan.notesAfterTeaching,
        attachmentUrl: editingPlan.attachmentUrl,
        attachmentLabel: editingPlan.attachmentLabel,
        publicSummary: editingPlan.publicSummary,
        status: editingPlan.status,
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [editingPlan, reset]);

  const classId = watch("classId");
  const selectedClass = classes?.find((item) => item.id === classId) ?? null;

  const { data: sessions } = useQuery({
    queryKey: ["sessions-by-class", classId],
    queryFn: () => listSessionsByClass(classId as string, subDays(new Date(), 30), addDays(new Date(), 120), 100),
    enabled: !!classId,
  });
  const selectedSession = sessions?.find((item) => item.id === watch("sessionId")) ?? null;
  const sessionDurationMinutes = selectedSession
    ? Math.round((selectedSession.endAt.toMillis() - selectedSession.startAt.toMillis()) / 60000)
    : null;

  const activityValues = watch("activities");
  const totalMinutes = activityValues.reduce((sum, item) => sum + (Number(item.durationMinutes) || 0), 0);
  const durationMatches = sessionDurationMinutes != null && totalMinutes === sessionDurationMinutes;

  const saveMutation = useMutation({
    mutationFn: (values: LessonPlanFormValues) =>
      isEditing ? updateLessonPlan(editingPlan.id, values) : createLessonPlan(values, firebaseUser?.uid ?? "unknown"),
    onSuccess: () => {
      reset(DEFAULT_VALUES);
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      onDone?.();
    },
  });

  const templateMutation = useMutation({
    mutationFn: () => {
      const values = getValues();
      return createLessonPlanTemplate(values.title || "Mẫu giáo án", {
        objectives: values.objectives,
        preparation: values.preparation,
        activities: values.activities,
        homework: values.homework,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-plan-templates"] }),
  });

  const applyTemplate = (template: NonNullable<typeof templates>[number]) => {
    setValue("objectives", template.objectives);
    setValue("preparation", template.preparation);
    setValue("activities", template.activities);
    setValue("homework", template.homework);
  };

  const onSelectClass = (value: string) => {
    const found = classes?.find((item) => item.id === value) ?? null;
    setValue("classId", value || null);
    setValue("courseId", found?.courseId ?? null);
    setValue("subjectId", found?.subjectIds[0] ?? null);
    setValue("sessionId", null);
  };

  return (
    <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="flex h-full min-h-0 flex-col">
      {/* Popup ngang: 1 cột trái gọn (thông tin/mục tiêu/chuẩn bị/đính kèm) + 1 cột phải nội dung chính (tiến trình buổi học). Không tab, không phân nhánh. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[340px_1fr] lg:overflow-hidden">
        <div className="space-y-4 border-b border-neutral-200 bg-white/60 p-4 sm:p-5 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
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

          <div className={BLOCK}>
            <h3 className={SECTION_TITLE}>
              Tài liệu đính kèm <span className="text-xs font-normal normal-case tracking-normal text-neutral-500">— dán link, không upload</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="lp-attach-label" className={LABEL}>Tên hiển thị</label>
                <input id="lp-attach-label" type="text" placeholder="VD: Đề luyện tập Unit 5.pdf" className={INPUT} {...register("attachmentLabel")} />
              </div>
              <div>
                <label htmlFor="lp-attach-url" className={LABEL}>Link chia sẻ (Google Drive / OneDrive...)</label>
                <input id="lp-attach-url" type="url" placeholder="https://drive.google.com/..." className={INPUT} {...register("attachmentUrl")} />
                {errors.attachmentUrl && <p role="alert" className="mt-1 text-xs text-danger-700">{errors.attachmentUrl.message}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5 lg:min-h-0 lg:overflow-y-auto">
          {templates && templates.length > 0 && (
            <div className={BLOCK}>
              <h3 className={SECTION_TITLE}>Thư viện mẫu</h3>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="min-w-[200px] shrink-0 rounded-input border border-neutral-200 bg-white p-3 text-left text-sm transition hover:border-primary-300 hover:shadow-sm"
                  >
                    <p className="font-semibold text-neutral-900">{template.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">{template.activities.length} hoạt động</p>
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <div className={BLOCK}>
            <h3 className={SECTION_TITLE}>Bài tập về nhà &amp; ghi chú</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="lp-homework" className={LABEL}>Bài tập về nhà</label>
                <textarea id="lp-homework" className={TEXTAREA} {...register("homework")} />
              </div>
              <div>
                <label htmlFor="lp-notes" className={LABEL}>
                  Ghi chú sau buổi dạy <span className="text-xs font-normal text-neutral-500">điền sau khi dạy xong</span>
                </label>
                <textarea id="lp-notes" className={TEXTAREA} {...register("notesAfterTeaching")} />
              </div>
            </div>
          </div>

          <div className={BLOCK}>
            <h3 className={SECTION_TITLE}>Tóm tắt công khai <span className="text-xs font-normal normal-case tracking-normal text-neutral-500">— phụ huynh xem khi giáo án được xuất bản</span></h3>
            <textarea className={TEXTAREA} {...register("publicSummary")} />
          </div>
        </div>
      </div>

      <div className="flex flex-none flex-col gap-2 border-t border-neutral-200 bg-white px-4 py-3 sm:px-5">
        {saveMutation.isError && (
          <p role="alert" className="text-sm text-danger-700">Không thể lưu giáo án. Vui lòng thử lại.</p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={() => templateMutation.mutate()} disabled={templateMutation.isPending}>
            Lưu thành mẫu
          </Button>
          <Button type="button" onClick={() => onDone?.()}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={saveMutation.isPending} icon={<Save size={16} />}>
            {saveMutation.isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Lưu giáo án"}
          </Button>
        </div>
      </div>
    </form>
  );
}
