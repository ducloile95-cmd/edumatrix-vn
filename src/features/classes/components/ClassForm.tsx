import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { classFormSchema, type ClassFormValues } from "@/schemas/class";
import { createClass, createClassWithSchedule, updateClass } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
import { generateRecurringSessions } from "@/utils/recurrence";
import type { ClassDoc } from "@/types/academic";

interface ClassFormProps {
  /** Neu co gia tri => form o che do sua. */
  editingClass?: (ClassDoc & { id: string }) | null;
  onDone?: () => void;
}

const DEFAULT_VALUES: ClassFormValues = {
  name: "",
  courseId: "",
  subjectIds: [],
  teacherIds: [],
  scheduleText: "",
  location: "",
  status: "active",
};

/** 0=CN..6=T7, cung quy uoc voi DOW_LABEL trong TimetableGrid/MonthGrid. */
const DOW_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

interface RecurrenceFormState {
  startDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  sessionCount: number;
}

const DEFAULT_RECURRENCE: RecurrenceFormState = {
  startDate: "",
  daysOfWeek: [],
  startTime: "",
  endTime: "",
  sessionCount: 1,
};

export function ClassForm({ editingClass, onDone }: ClassFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingClass;

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
    formState: { errors },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: DEFAULT_VALUES,
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
      reset(DEFAULT_VALUES);
    }
  }, [editingClass, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ClassFormValues): Promise<void> => {
      if (editingClass) {
        await updateClass(editingClass.id, values);
        return;
      }
      if (useSmartSchedule && recurrencePreview) {
        await createClassWithSchedule({
          ...values,
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
      await createClass(values);
    },
    onSuccess: () => {
      reset(DEFAULT_VALUES);
      setUseSmartSchedule(false);
      setRecurrence(DEFAULT_RECURRENCE);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onDone?.();
    },
  });

  const submitDisabled = mutation.isPending || (useSmartSchedule && !recurrencePreview);

  const activeCourses = courses?.filter((c) => c.status === "active" || c.id === editingClass?.courseId) ?? [];
  const activeSubjects = subjects?.filter((s) => s.status === "active") ?? [];

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div className="rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary-700">Thông tin lớp</h3>
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

      <div className="mt-4 rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary-700">Phân công</h3>

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
          <Controller
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
          />
          <p className="mt-1 text-xs text-neutral-500">Bấm để chọn/bỏ chọn, có thể chọn nhiều giáo viên.</p>
        </div>
      </div>

      <div className="mt-4 rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary-700">Lịch &amp; địa điểm</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="class-schedule" className="mb-1 block text-sm font-medium text-neutral-700">
              Lịch học (mô tả)
            </label>
            {useSmartSchedule ? (
              <p className="min-h-touch flex items-center rounded-input border border-dashed border-neutral-300 px-3 text-sm text-neutral-500">
                Sẽ tự động tạo từ khối "Lịch học thông minh" bên dưới
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

      {!isEditing && (
        <div className="mt-4 rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-primary-700">Lịch học thông minh</h3>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={useSmartSchedule}
                onChange={(event) => setUseSmartSchedule(event.target.checked)}
                className="size-4 rounded border-neutral-300"
              />
              Tự động sinh buổi học lặp theo tuần
            </label>
          </div>

          {useSmartSchedule && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="recurrence-start-date" className="mb-1 block text-sm font-medium text-neutral-700">
                  Ngày khai giảng<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input
                  id="recurrence-start-date"
                  type="date"
                  value={recurrence.startDate}
                  onChange={(event) => setRecurrence((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="recurrence-session-count" className="mb-1 block text-sm font-medium text-neutral-700">
                  Tổng số buổi<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input
                  id="recurrence-session-count"
                  type="number"
                  min={1}
                  step={1}
                  value={recurrence.sessionCount}
                  onChange={(event) => setRecurrence((prev) => ({ ...prev, sessionCount: Number(event.target.value) }))}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                />
              </div>

              <div className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Các thứ trong tuần<span className="ml-0.5 text-danger-500">*</span>
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn thứ trong tuần">
                  {DOW_LABEL.map((label, day) => {
                    const checked = recurrence.daysOfWeek.includes(day);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleDay(day)}
                        className={`min-h-touch rounded-full border px-3.5 text-xs font-semibold transition ${
                          checked
                            ? "border-primary-500 bg-primary-500 text-white"
                            : "border-neutral-300 bg-white text-neutral-600 hover:border-primary-300"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="recurrence-start-time" className="mb-1 block text-sm font-medium text-neutral-700">
                  Giờ bắt đầu<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input
                  id="recurrence-start-time"
                  type="time"
                  value={recurrence.startTime}
                  onChange={(event) => setRecurrence((prev) => ({ ...prev, startTime: event.target.value }))}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="recurrence-end-time" className="mb-1 block text-sm font-medium text-neutral-700">
                  Giờ kết thúc<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input
                  id="recurrence-end-time"
                  type="time"
                  value={recurrence.endTime}
                  onChange={(event) => setRecurrence((prev) => ({ ...prev, endTime: event.target.value }))}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                />
              </div>

              <div className="sm:col-span-2 rounded-input bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                {recurrencePreview ? (
                  <>
                    Buổi đầu:{" "}
                    <span className="font-medium text-neutral-900">
                      {format(recurrencePreview.sessions[0].startAt, "dd/MM/yyyy")}
                    </span>
                    {" · "}Bế giảng dự kiến:{" "}
                    <span className="font-medium text-neutral-900">
                      {format(recurrencePreview.endDate, "dd/MM/yyyy")}
                    </span>
                    {" · "}
                    {recurrencePreview.sessions.length} buổi
                  </>
                ) : (
                  "Điền đủ ngày khai giảng, các thứ trong tuần, giờ học và tổng số buổi để xem trước lịch."
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-danger-700">
          Không thể lưu lớp học. Vui lòng thử lại.
        </p>
      )}
      {mutation.isSuccess && !isEditing && <p className="mt-3 text-sm text-success-700">Đã tạo lớp học.</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitDisabled}
          className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo lớp học"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={() => onDone?.()}
            className="min-h-touch rounded-input border border-neutral-300 px-5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Hủy
          </button>
        )}
      </div>
    </form>
  );
}
