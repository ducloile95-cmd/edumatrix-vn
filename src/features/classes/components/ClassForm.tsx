import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { BookOpen, Check, ChevronDown, MapPin, UsersRound } from "lucide-react";
import { format } from "date-fns";
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

interface MultiSelectOption {
  value: string;
  label: string;
}

function MultiSelect({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = `${id}-label`;
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <span id={labelId} className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-touch w-full items-center justify-between gap-3 rounded-input border border-neutral-300 bg-white px-3 text-left text-sm outline-none transition hover:border-primary-300 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-100"
      >
        <span className={selectedLabels.length ? "truncate text-neutral-800" : "text-neutral-400"}>
          {selectedLabels.join(", ") || "Chọn lựa chọn"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary-700">
          {value.length} đã chọn
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" aria-labelledby={labelId} className="absolute bottom-full inset-x-0 z-40 mb-1 max-h-52 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
          {options.length === 0 && <p className="px-3 py-2 text-xs text-neutral-500">Chưa có lựa chọn phù hợp.</p>}
          {options.map((option) => {
            const selected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(selected ? value.filter((item) => item !== option.value) : [...value, option.value])}
                className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold transition ${selected ? "bg-primary-50 text-primary-800" : "text-neutral-700 hover:bg-neutral-50"}`}
              >
                {option.label}
                <span className={`grid size-5 shrink-0 place-items-center rounded-md border ${selected ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 text-transparent"}`}>
                  <Check size={13} aria-hidden="true" />
                </span>
              </button>
            );
          })}
          <button type="button" onClick={() => setOpen(false)} className="mt-1 min-h-9 w-full rounded-lg border border-neutral-200 text-xs font-bold text-neutral-700 transition hover:border-primary-300 hover:text-primary-700">Xong</button>
        </div>
      )}
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
    if (!recurrence.startDate || !recurrence.startTime || !recurrence.endTime) return null;
    if (recurrence.daysOfWeek.length === 0 || recurrence.sessionCount < 1) return null;
    return generateRecurringSessions({
      startDate: new Date(`${recurrence.startDate}T00:00:00`),
      daysOfWeek: recurrence.daysOfWeek,
      startTime: recurrence.startTime,
      endTime: recurrence.endTime,
      sessionCount: recurrence.sessionCount,
    });
  }, [recurrence]);

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
      const savedRecurrence = editingClass.recurrence;
      setRecurrence(savedRecurrence ? {
        startDate: format(savedRecurrence.startDate.toDate(), "yyyy-MM-dd"),
        daysOfWeek: savedRecurrence.daysOfWeek,
        startTime: savedRecurrence.startTime,
        endTime: savedRecurrence.endTime,
        sessionCount: savedRecurrence.sessionCount,
      } : {
        startDate: "",
        daysOfWeek: [],
        startTime: "",
        endTime: "",
        sessionCount: 1,
      });
    } else {
      reset({ ...DEFAULT_CLASS_FORM_VALUES, teacherIds: isAdmin ? [] : ownTeacherIds });
      setRecurrence(DEFAULT_RECURRENCE);
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
      if (isAdmin && recurrencePreview) {
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
      setRecurrence(DEFAULT_RECURRENCE);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      onDone?.();
    },
  });

  const submitDisabled = mutation.isPending || (isAdmin && !isEditing && !recurrencePreview);

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
      <div data-testid="class-form-layout" className="grid min-h-0 flex-1 overflow-y-auto bg-neutral-50/80 xl:grid-cols-[minmax(0,1.2fr)_minmax(520px,.8fr)] xl:overflow-hidden">
        <div className="border-b border-neutral-200 p-3 xl:min-h-0 xl:border-b-0 xl:border-r">
          <ClassSmartSchedulePanel
            readOnly={isEditing || !isAdmin}
            recurrence={recurrence}
            setRecurrence={setRecurrence}
            toggleDay={toggleDay}
            recurrencePreview={recurrencePreview}
          />
        </div>

        <div className="grid content-start gap-3 p-3 xl:min-h-0 xl:overflow-hidden">
          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <FormSectionHeader icon={<BookOpen size={18} />} title="Thông tin lớp học" description="Thông tin nhận diện và trạng thái vận hành của lớp." />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="class-name" className="mb-1 block text-sm font-medium text-neutral-700">Tên lớp<span className="ml-0.5 text-danger-500">*</span></label>
                <input id="class-name" type="text" placeholder="HN53 Essentials" aria-invalid={!!errors.name} className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500" {...register("name")} />
                {errors.name && <p role="alert" className="mt-1 text-xs text-danger-700">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="class-course" className="mb-1 block text-sm font-medium text-neutral-700">Khóa học<span className="ml-0.5 text-danger-500">*</span></label>
                <select id="class-course" aria-invalid={!!errors.courseId} className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500" {...register("courseId")}>
                  <option value="">-- Chọn khóa học --</option>
                  {activeCourses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                </select>
                {errors.courseId && <p role="alert" className="mt-1 text-xs text-danger-700">{errors.courseId.message}</p>}
              </div>
              <div>
                <label htmlFor="class-status" className="mb-1 block text-sm font-medium text-neutral-700">Trạng thái</label>
                <select id="class-status" className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500" {...register("status")}>
                  <option value="active">Đang hoạt động</option>
                  <option value="completed">Đã kết thúc</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <FormSectionHeader icon={<MapPin size={18} />} title="Lịch và địa điểm" description="Lịch học thông minh được đồng bộ trực tiếp từ bảng bên trái." />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span id="class-schedule-label" className="mb-1 block text-sm font-medium text-neutral-700">Lịch học</span>
                {isAdmin ? (
                  <p aria-labelledby="class-schedule-label" className="flex min-h-touch items-center rounded-input border border-primary-100 bg-primary-50 px-3 text-sm text-primary-800">
                    {recurrencePreview
                      ? `${recurrence.daysOfWeek.map((day) => DAY_LABELS[day]).join(", ")} | ${recurrence.startTime}-${recurrence.endTime} | ${recurrencePreview.sessions.length} buổi`
                      : editingClass?.scheduleText || "Chưa có cấu hình lịch thông minh"}
                  </p>
                ) : (
                  <input id="class-schedule" type="text" placeholder="Thứ 4 và Thứ 6, 18:00-19:30" className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500" {...register("scheduleText")} />
                )}
              </div>
              <div>
                <label htmlFor="class-location" className="mb-1 block text-sm font-medium text-neutral-700">Địa điểm</label>
                <input id="class-location" type="text" placeholder="Zoom / Phòng 201" className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500" {...register("location")} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <FormSectionHeader icon={<UsersRound size={18} />} title="Môn học & Phân công" description="Các danh sách hỗ trợ chọn nhiều lựa chọn trong cùng một dropdown." />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Controller
                  control={control}
                  name="subjectIds"
                  render={({ field }) => (
                    <MultiSelect
                      id="class-subjects"
                      label="Môn học *"
                      options={activeSubjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.subjectIds && <p role="alert" className="mt-1 text-xs text-danger-700">{errors.subjectIds.message}</p>}
              </div>
              <div>
                {isAdmin ? (
                  <Controller
                    control={control}
                    name="teacherIds"
                    render={({ field }) => (
                      <MultiSelect
                        id="class-teachers"
                        label="Giáo viên phụ trách"
                        options={(teachers ?? []).map((teacher) => ({ value: teacher.uid, label: teacher.displayName }))}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                ) : (
                  <div>
                    <span className="mb-1.5 block text-xs font-bold text-neutral-700">Giáo viên phụ trách</span>
                    <p className="flex min-h-touch items-center rounded-input border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700">
                      {editingClass
                        ? (teachers ?? []).filter((teacher) => editingClass.teacherIds.includes(teacher.uid)).map((teacher) => teacher.displayName).join(", ") || "Lớp của bạn"
                        : "Bạn sẽ được tự động phân công"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-500">{isAdmin ? "Có thể chọn nhiều môn học và nhiều giáo viên phụ trách." : "Giáo viên không thể thay đổi phân công của lớp."}</p>
          </section>
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
