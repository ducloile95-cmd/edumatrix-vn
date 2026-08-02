import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { BookOpen, MapPin, UsersRound } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classFormSchema, type ClassFormValues } from "@/schemas/class";
import { createClass, createClassWithSchedule, updateClass } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { generateRecurringSessions } from "@/utils/recurrence";
import {
  ClassSmartSchedulePanel,
  type RecurrenceFormState,
} from "@/features/classes/components/ClassSmartSchedulePanel";
import { ClassFormActions } from "@/features/classes/components/ClassFormActions";
import {
  DEFAULT_CLASS_FORM_VALUES,
  DEFAULT_RECURRENCE,
} from "@/features/classes/components/classFormDefaults";
import type { ClassDoc } from "@/types/academic";

const DAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

interface ClassFormProps {
  editingClass?: (ClassDoc & { id: string }) | null;
  onDone?: () => void;
}

function FormSectionHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">{icon}</span>
      <div>
        <h3 className="text-sm font-bold text-neutral-950">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

export function ClassForm({ editingClass, onDone }: ClassFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingClass;
  const { firebaseUser, role } = useAuth();
  const isAdmin = role === USER_ROLES.ADMIN;
  const ownTeacherUid = firebaseUser?.uid;
  const ownTeacherIds = useMemo(() => ownTeacherUid ? [ownTeacherUid] : [], [ownTeacherUid]);

  const [useSmartSchedule, setUseSmartSchedule] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceFormState>(DEFAULT_RECURRENCE);
  const toggleDay = (day: number) => {
    setRecurrence((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  };
  const recurrencePreview = useMemo(() => {
    if (!useSmartSchedule) return null;
    if (!recurrence.startDate || !recurrence.startTime || !recurrence.endTime) return null;
    if (recurrence.daysOfWeek.length === 0 || recurrence.sessionCount < 1) return null;
    return generateRecurringSessions({
      startDate: new Date(`${recurrence.startDate}T00:00:00`),
      daysOfWeek: recurrence.daysOfWeek,
      startTime: recurrence.startTime,
      endTime: recurrence.endTime,
      sessionCount: recurrence.sessionCount,
    });
  }, [useSmartSchedule, recurrence]);

  const { data: courses } = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const { data: teachers } = useQuery({
    queryKey: ["users", "teacher"],
    queryFn: () => listUsersByRole(USER_ROLES.TEACHER),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: DEFAULT_CLASS_FORM_VALUES,
  });

  useEffect(() => {
    if (editingClass) {
      reset({
        name: editingClass.name,
        courseId: editingClass.courseId,
        subjectIds: editingClass.subjectIds,
        teacherIds: editingClass.teacherIds,
        scheduleText: editingClass.scheduleText,
        location: editingClass.location,
        status: editingClass.status,
      });
    } else {
      reset({ ...DEFAULT_CLASS_FORM_VALUES, teacherIds: isAdmin ? [] : ownTeacherIds });
    }
  }, [editingClass, isAdmin, ownTeacherIds, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ClassFormValues): Promise<void> => {
      const scopedValues = isAdmin
        ? values
        : { ...values, teacherIds: editingClass?.teacherIds ?? ownTeacherIds };
      if (editingClass) {
        await updateClass(editingClass.id, scopedValues);
        return;
      }
      if (useSmartSchedule && recurrencePreview) {
        await createClassWithSchedule({
          ...scopedValues,
          recurrence: {
            daysOfWeek: recurrence.daysOfWeek,
            startTime: recurrence.startTime,
            endTime: recurrence.endTime,
            startDate: new Date(`${recurrence.startDate}T00:00:00`),
            sessionCount: recurrence.sessionCount,
          },
        });
        return;
      }
      await createClass(scopedValues);
    },
    onSuccess: () => {
      reset(DEFAULT_CLASS_FORM_VALUES);
      setUseSmartSchedule(false);
      setRecurrence(DEFAULT_RECURRENCE);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onDone?.();
    },
  });

  const submitDisabled = mutation.isPending || (useSmartSchedule && !recurrencePreview);

  const selectedCourseId = watch("courseId");
  const selectedCourse = courses?.find((course) => course.id === selectedCourseId);
  const activeCourses = courses?.filter((c) =>
    (c.status === "active" || c.id === editingClass?.courseId) &&
    (isAdmin || (c.teacherIds ?? []).includes(ownTeacherUid ?? ""))
  ) ?? [];
  const activeSubjects = subjects?.filter((s) =>
    s.status === "active" &&
    (!selectedCourse || selectedCourse.subjectIds.includes(s.id))
  ) ?? [];

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 overflow-y-auto bg-neutral-50/80 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)] xl:overflow-hidden">
        <div className="space-y-4 border-b border-neutral-200 p-4 sm:p-5 xl:overflow-y-auto xl:border-b-0 xl:border-r">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <FormSectionHeader icon={<BookOpen size={18} />} title="Thông tin lớp" description="Thông tin nhận diện và trạng thái vận hành của lớp." />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="class-name" className="mb-1 block text-sm font-medium text-neutral-700">
              Tên lớp<span className="ml-0.5 text-danger-500">*</span>
            </label>
            <input
              id="class-name"
              type="text"
              placeholder="HN53 Essentials"
              className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
              {...register("name")}
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-xs text-danger-700">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="class-course" className="mb-1 block text-sm font-medium text-neutral-700">
              Khóa học<span className="ml-0.5 text-danger-500">*</span>
            </label>
            <select
              id="class-course"
              className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
              {...register("courseId")}
            >
              <option value="">-- Chọn khóa học --</option>
              {activeCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            {errors.courseId && (
              <p role="alert" className="mt-1 text-xs text-danger-700">
                {errors.courseId.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="class-status" className="mb-1 block text-sm font-medium text-neutral-700">
              Trạng thái
            </label>
            <select
              id="class-status"
              className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
              {...register("status")}
            >
              <option value="active">Đang hoạt động</option>
              <option value="completed">Đã kết thúc</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <FormSectionHeader icon={<UsersRound size={18} />} title="Phân công" description="Chọn môn học và giáo viên phụ trách lớp." />

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-neutral-700">
            Môn học<span className="ml-0.5 text-danger-500">*</span>
          </span>
          <Controller
            control={control}
            name="subjectIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn môn học">
                {activeSubjects.map((subject) => {
                  const checked = field.value.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      aria-pressed={checked}
                      onClick={() =>
                        field.onChange(
                          checked ? field.value.filter((id) => id !== subject.id) : [...field.value, subject.id],
                        )
                      }
                      className={`min-h-touch rounded-full border px-3.5 text-xs font-semibold transition ${
                        checked
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-neutral-300 bg-white text-neutral-600 hover:border-primary-300"
                      }`}
                    >
                      {subject.name}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.subjectIds && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.subjectIds.message}
            </p>
          )}
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-neutral-700">Giáo viên phụ trách</span>
          {isAdmin ? <Controller
            control={control}
            name="teacherIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn giáo viên phụ trách">
                {(teachers ?? []).map((teacher) => {
                  const checked = field.value.includes(teacher.uid);
                  return (
                    <button
                      key={teacher.uid}
                      type="button"
                      aria-pressed={checked}
                      onClick={() =>
                        field.onChange(
                          checked ? field.value.filter((id) => id !== teacher.uid) : [...field.value, teacher.uid],
                        )
                      }
                      className={`min-h-touch rounded-full border px-3.5 text-xs font-semibold transition ${
                        checked
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-neutral-300 bg-white text-neutral-600 hover:border-primary-300"
                      }`}
                    >
                      {teacher.displayName}
                    </button>
                  );
                })}
              </div>
            )}
          /> : (
            <p className="rounded-input border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              {editingClass
                ? (teachers ?? []).filter((teacher) => editingClass.teacherIds.includes(teacher.uid)).map((teacher) => teacher.displayName).join(", ") || "Lớp của bạn"
                : "Bạn sẽ được gán làm giáo viên phụ trách lớp này."}
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            {isAdmin ? "Bấm để chọn/bỏ chọn, có thể chọn nhiều giáo viên." : "Giáo viên không thể thay đổi phân công của lớp."}
          </p>
        </div>
      </div>

        </div>
        <div className="space-y-4 p-4 sm:p-5 xl:overflow-y-auto">

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <FormSectionHeader icon={<MapPin size={18} />} title="Lịch và địa điểm" description="Mô tả lịch được đồng bộ từ lịch thông minh hoặc nhập thủ công." />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="class-schedule" className="mb-1 block text-sm font-medium text-neutral-700">
              Lịch học (mô tả)
            </label>
            {useSmartSchedule ? (
              <p id="class-schedule" className="min-h-touch flex items-center rounded-input border border-primary-100 bg-primary-50 px-3 text-sm text-primary-800">
                {recurrencePreview
                  ? `${recurrence.daysOfWeek.map((day) => DAY_LABELS[day]).join(", ")} | ${recurrence.startTime}-${recurrence.endTime} | ${recurrencePreview.sessions.length} buổi`
                  : "Sẽ tự động tạo từ khối Lịch học thông minh bên dưới"}
              </p>
            ) : (
              <input
                id="class-schedule"
                type="text"
                placeholder="Thứ 4 và Thứ 6, 18:00-19:30"
                className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                {...register("scheduleText")}
              />
            )}
          </div>

          <div>
            <label htmlFor="class-location" className="mb-1 block text-sm font-medium text-neutral-700">
              Địa điểm
            </label>
            <input
              id="class-location"
              type="text"
              placeholder="Zoom / Phòng 201"
              className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
              {...register("location")}
            />
          </div>
        </div>
      </div>

      <ClassSmartSchedulePanel
        isEditing={isEditing}
        isAdmin={isAdmin}
        useSmartSchedule={useSmartSchedule}
        setUseSmartSchedule={setUseSmartSchedule}
        recurrence={recurrence}
        setRecurrence={setRecurrence}
        toggleDay={toggleDay}
        recurrencePreview={recurrencePreview}
      />

        </div>
      </div>

      <ClassFormActions
        isEditing={isEditing}
        isError={mutation.isError}
        isPending={mutation.isPending}
        isSuccess={mutation.isSuccess}
        submitDisabled={submitDisabled}
        onCancel={onDone}
      />
    </form>
  );
}
