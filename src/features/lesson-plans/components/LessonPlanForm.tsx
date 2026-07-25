import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, subDays } from "date-fns";
import { Cloud, ExternalLink, FileUp, FolderOpen, Plus, Save, ShieldCheck, X } from "lucide-react";
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
import { getIntegrationSettings } from "@/services/firestore/settings";
import {
  connectGoogleDrive,
  driveErrorMessage,
  isGoogleDriveConfigured,
  isGoogleDriveConnected,
  mapDriveMetadata,
  openGoogleDrivePicker,
  uploadGoogleDriveFile,
} from "@/services/integrations/googleDrive";
import { formatSessionLabel } from "@/utils/lessonPlan";
import { lessonPlanFormSchema, type LessonPlanFormValues } from "@/schemas/lessonPlan";
import type { LessonPlanDoc, LessonPlanDriveAttachment } from "@/types/academic";

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

function driveAttachmentFromPlan(plan?: LessonPlanDoc | null): LessonPlanDriveAttachment | null {
  if (!plan?.driveFileId || !plan.driveFileName || !plan.driveMimeType || !plan.driveWebViewLink || !plan.driveModifiedTime) return null;
  return {
    driveFileId: plan.driveFileId,
    driveFileName: plan.driveFileName,
    driveMimeType: plan.driveMimeType,
    driveWebViewLink: plan.driveWebViewLink,
    driveModifiedTime: plan.driveModifiedTime,
  };
}

export function LessonPlanForm({ editingPlan, onDone }: LessonPlanFormProps) {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!editingPlan;
  const driveInputRef = useRef<HTMLInputElement>(null);
  const [driveAttachment, setDriveAttachment] = useState<LessonPlanDriveAttachment | null>(() => driveAttachmentFromPlan(editingPlan));
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const { data: templates } = useQuery({ queryKey: ["lesson-plan-templates"], queryFn: listLessonPlanTemplates });
  const integrations = useQuery({ queryKey: ["settings", "integrations"], queryFn: getIntegrationSettings });
  const driveFolderId = integrations.data?.driveFolderId?.trim() ?? "";
  const driveConfigured = isGoogleDriveConfigured();

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
    setDriveAttachment(driveAttachmentFromPlan(editingPlan));
    setDriveError(null);
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
    mutationFn: async (values: LessonPlanFormValues) => {
      if (isEditing) await updateLessonPlan(editingPlan.id, values, driveAttachment);
      else await createLessonPlan(values, firebaseUser?.uid ?? "unknown", driveAttachment);
    },
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

  async function runDrive(action: () => Promise<void>) {
    setDriveBusy(true);
    setDriveError(null);
    try {
      await connectGoogleDrive();
      await action();
    } catch (error) {
      setDriveError(driveErrorMessage(error));
    } finally {
      setDriveBusy(false);
    }
  }

  function pickDriveFile() {
    void runDrive(async () => {
      const metadata = await openGoogleDrivePicker(driveFolderId || undefined);
      if (metadata) setDriveAttachment(mapDriveMetadata(metadata));
    });
  }

  function uploadDriveFile(file: File) {
    void runDrive(async () => {
      const metadata = await uploadGoogleDriveFile(file, driveFolderId);
      setDriveAttachment(mapDriveMetadata(metadata));
    });
  }

  return (
    <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="flex h-full min-h-0 flex-col">
      {/* Popup ngang: 1 cột trái gọn (thông tin/mục tiêu/chuẩn bị/đính kèm) + 1 cột phải nội dung chính (tiến trình buổi học). Không tab, không phân nhánh. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(360px,400px)_minmax(0,1fr)] lg:overflow-hidden">
        <div className="space-y-4 border-b border-neutral-200 bg-white/60 p-4 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
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
            <h3 className={SECTION_TITLE}>Tài liệu Google Drive</h3>
            <div className="rounded-card border border-primary-100 bg-white p-3 shadow-[var(--shadow-1)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Cloud size={18} className="text-primary-600" />Google Drive</div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-2xs font-bold ${isGoogleDriveConnected() ? "bg-success-50 text-success-700" : "bg-neutral-100 text-neutral-600"}`}>
                  <ShieldCheck size={12} />{isGoogleDriveConnected() ? "Đã kết nối" : "Sẵn sàng kết nối"}
                </span>
              </div>
              {driveAttachment ? (
                <div className="mt-3 rounded-input border border-neutral-200 bg-neutral-50 p-3">
                  <p className="truncate text-xs font-bold text-neutral-900">{driveAttachment.driveFileName}</p>
                  <p className="mt-1 truncate text-2xs text-neutral-500">{driveAttachment.driveMimeType}</p>
                </div>
              ) : <p className="mt-3 rounded-input border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-center text-xs text-neutral-500">Chưa chọn tệp cho giáo án.</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" size="sm" disabled={!driveConfigured || driveBusy} onClick={pickDriveFile} icon={<FolderOpen size={14} />}>Chọn từ Drive</Button>
                <Button type="button" size="sm" disabled={!driveConfigured || !driveFolderId || driveBusy} onClick={() => driveInputRef.current?.click()} icon={<FileUp size={14} />}>Tải tệp mới</Button>
                {driveAttachment && (
                  <a href={driveAttachment.driveWebViewLink} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-input bg-primary-600 px-3 text-xs font-bold text-white hover:bg-primary-700">
                    Mở trực tiếp trên Drive <ExternalLink size={14} />
                  </a>
                )}
                <input ref={driveInputRef} type="file" className="sr-only" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) uploadDriveFile(file); }} />
              </div>
              {!driveConfigured && <p className="mt-2 text-xs text-warning-700">Google Drive chưa được cấu hình đầy đủ.</p>}
              {driveConfigured && !driveFolderId && <p className="mt-2 text-xs text-warning-700">Chưa có Folder ID; vẫn chọn được tệp nhưng chưa thể tải tệp mới.</p>}
              {driveError && <p role="alert" className="mt-2 text-xs font-semibold text-danger-700">{driveError}</p>}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-neutral-600">Dùng liên kết tài liệu khác</summary>
              <div className="mt-3 space-y-3">
                <div><label htmlFor="lp-attach-label" className={LABEL}>Tên hiển thị</label><input id="lp-attach-label" type="text" className={INPUT} {...register("attachmentLabel")} /></div>
                <div><label htmlFor="lp-attach-url" className={LABEL}>Liên kết HTTPS</label><input id="lp-attach-url" type="url" className={INPUT} {...register("attachmentUrl")} />{errors.attachmentUrl && <p role="alert" className="mt-1 text-xs text-danger-700">{errors.attachmentUrl.message}</p>}</div>
              </div>
            </details>
          </div>
        </div>

        <div className="space-y-4 p-4 lg:min-h-0 lg:overflow-y-auto">
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
