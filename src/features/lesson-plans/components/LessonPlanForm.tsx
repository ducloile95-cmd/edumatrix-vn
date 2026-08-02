import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, subDays } from "date-fns";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LessonPlanActivitiesSection } from "@/features/lesson-plans/components/LessonPlanActivitiesSection";
import { LessonPlanBasicsSection } from "@/features/lesson-plans/components/LessonPlanBasicsSection";
import { LessonPlanDriveSection } from "@/features/lesson-plans/components/LessonPlanDriveSection";
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
  mapDriveMetadata,
  openGoogleDrivePicker,
  uploadGoogleDriveFile,
} from "@/services/integrations/googleDrive";
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

const TEXTAREA = "min-h-20 w-full rounded-input border border-neutral-300 p-3 text-sm focus:border-primary-500";
const LABEL = "mb-1 block text-sm font-medium text-neutral-700";
const SECTION_TITLE = "mb-3 text-xs font-bold uppercase tracking-wide text-primary-700";
/** Khung ngăn cách các khối trong 1 cột (không dùng card lồng card vì cột đã có viền riêng). */
const BLOCK = "rounded-card border border-neutral-200 bg-white p-4 shadow-[var(--shadow-1)]";

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
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(360px,400px)_minmax(0,1fr)] lg:overflow-hidden 2xl:grid-cols-[minmax(380px,420px)_minmax(0,1fr)]">
        <div className="space-y-4 border-b border-neutral-200 bg-neutral-100/70 p-4 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-5">
          <LessonPlanBasicsSection
            classes={classes}
            classId={classId}
            errors={errors}
            onSelectClass={onSelectClass}
            register={register}
            selectedClass={selectedClass}
            sessionDurationMinutes={sessionDurationMinutes}
            sessions={sessions}
          />

          <LessonPlanDriveSection
            driveAttachment={driveAttachment}
            driveBusy={driveBusy}
            driveConfigured={driveConfigured}
            driveFolderId={driveFolderId}
            driveError={driveError}
            driveInputRef={driveInputRef}
            pickDriveFile={pickDriveFile}
            uploadDriveFile={uploadDriveFile}
            register={register}
            errors={errors}
          />
        </div>

        <div className="space-y-4 bg-neutral-50/60 p-4 lg:min-h-0 lg:overflow-y-auto lg:p-5">
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

          <LessonPlanActivitiesSection
            activities={activities}
            register={register}
            errors={errors}
            sessionDurationMinutes={sessionDurationMinutes}
            durationMatches={durationMatches}
            totalMinutes={totalMinutes}
          />

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

      <div className="flex flex-none flex-col gap-2 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(28,26,21,.06)] backdrop-blur sm:px-5">
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
