import { useEffect, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, CircleDollarSign } from "lucide-react";
import { courseFormSchema, type CourseFormValues } from "@/schemas/course";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { createCourse, updateCourse } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
import { formatVnd } from "@/utils/currency";
import { calculateCourseEndDate } from "@/utils/courseDates";
import type { CourseDoc } from "@/types/academic";

interface CourseFormProps {
  /** Neu co gia tri => form o che do sua. */
  editingCourse?: (CourseDoc & { id: string }) | null;
  /** Mon hoc chon san khi mo tao moi tu luong "Them khoa hoc cho mon nay". */
  presetSubjectId?: string;
  onDone?: () => void;
}

function createDefaultValues(): CourseFormValues {
  const startDate = format(new Date(), "yyyy-MM-dd");
  return {
    name: "",
    subjectIds: [],
    teacherIds: [],
    pricePerSession: 0,
    totalSessions: 1,
    startDate,
    endDate: startDate,
    status: "draft",
  };
}

export function CourseForm({ editingCourse, presetSubjectId, onDone }: CourseFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingCourse;
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const { data: teachers } = useQuery({
    queryKey: ["users", USER_ROLES.TEACHER],
    queryFn: () => listUsersByRole(USER_ROLES.TEACHER),
  });

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { dirtyFields, errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: presetSubjectId ? { ...createDefaultValues(), subjectIds: [presetSubjectId] } : createDefaultValues(),
  });

  useEffect(() => {
    if (editingCourse) {
      reset({
        name: editingCourse.name,
        subjectIds: editingCourse.subjectIds,
        teacherIds: editingCourse.teacherIds ?? [],
        // Khoa cu chua co pricePerSession -> goi y tinh tu tuitionFee/totalSessions, van sua duoc.
        pricePerSession: editingCourse.pricePerSession ?? Math.round(editingCourse.tuitionFee / editingCourse.totalSessions),
        totalSessions: editingCourse.totalSessions,
        startDate: format(editingCourse.startDate.toDate(), "yyyy-MM-dd"),
        endDate: format(editingCourse.endDate.toDate(), "yyyy-MM-dd"),
        status: editingCourse.status,
      });
    } else {
      const defaultValues = createDefaultValues();
      reset(presetSubjectId ? { ...defaultValues, subjectIds: [presetSubjectId] } : defaultValues);
    }
  }, [editingCourse, presetSubjectId, reset]);

  const watchedPricePerSession = watch("pricePerSession");
  const watchedTotalSessions = watch("totalSessions");
  const watchedStartDate = watch("startDate");
  const estimatedTotal = (watchedPricePerSession || 0) * (watchedTotalSessions || 0);
  const calculatedEndDate = calculateCourseEndDate(watchedStartDate, watchedTotalSessions);

  useEffect(() => {
    if (isEditing && !dirtyFields.startDate && !dirtyFields.totalSessions) return;
    setValue("endDate", calculatedEndDate, { shouldValidate: true });
  }, [calculatedEndDate, dirtyFields.startDate, dirtyFields.totalSessions, isEditing, setValue]);

  const mutation = useMutation({
    mutationFn: async (values: CourseFormValues): Promise<void> => {
      if (editingCourse) {
        await updateCourse(editingCourse.id, values);
        return;
      }
      await createCourse(values);
    },
    onSuccess: () => {
      reset(createDefaultValues());
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      onDone?.();
    },
  });

  const activeSubjects = subjects?.filter((s) => s.status === "active") ?? [];
  const activeTeachers = (teachers ?? []).filter((teacher) => teacher.status === "active");
  const inputClass = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
  const sectionClass = "flex min-w-0 flex-col rounded-card border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(28,51,137,.04)]";

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)]">
      <section className={sectionClass}>
        <SectionHeader icon={<BookOpen size={18} />} title="Thông tin và phân công" description="Định danh khóa học, môn học và đội ngũ phụ trách." />
        <div className="grid flex-1 content-start gap-4 p-4">
          <Field label="Tên khóa học" htmlFor="course-name" required error={errors.name?.message}>
            <input id="course-name" type="text" placeholder="IELTS Foundation" className={inputClass} {...register("name")} />
          </Field>

          <Controller
            control={control}
            name="subjectIds"
            render={({ field }) => (
              <MultiSelectDropdown
                label="Môn học"
                required
                options={activeSubjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                value={field.value}
                onChange={field.onChange}
                placeholder="Chọn một hoặc nhiều môn"
                error={errors.subjectIds?.message}
                emptyMessage="Chưa có môn học đang hoạt động."
              />
            )}
          />

          <Controller
            control={control}
            name="teacherIds"
            render={({ field }) => (
              <MultiSelectDropdown
                label="Giáo viên phụ trách"
                required
                options={activeTeachers.map((teacher) => ({ value: teacher.uid, label: teacher.displayName }))}
                value={field.value}
                onChange={field.onChange}
                placeholder="Chọn giáo viên phụ trách"
                error={errors.teacherIds?.message}
                emptyMessage="Chưa có giáo viên đang hoạt động."
              />
            )}
          />
          <p className="text-xs leading-5 text-neutral-500">Có thể chọn nhiều môn và nhiều giáo viên trong từng dropdown.</p>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeader icon={<CircleDollarSign size={18} />} title="Học phí và vận hành" description="Thiết lập quy mô, học phí và trạng thái của khóa học." />
        <div className="grid flex-1 content-start gap-4 p-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field label="Học phí / buổi (VNĐ)" htmlFor="course-fee" required error={errors.pricePerSession?.message}>
            <input id="course-fee" type="number" min={0} step={1} className={inputClass} {...register("pricePerSession")} />
          </Field>

          <Field label="Tổng số buổi" htmlFor="course-sessions" required error={errors.totalSessions?.message}>
            <input id="course-sessions" type="number" min={1} step={1} className={inputClass} {...register("totalSessions")} />
          </Field>

          <Field label="Trạng thái" htmlFor="course-status">
            <select id="course-status" className={inputClass} {...register("status")}>
              <option value="draft">Nháp</option>
              <option value="active">Đang mở</option>
              <option value="completed">Đã kết thúc</option>
            </select>
          </Field>

          <div className="rounded-input border border-primary-100 bg-primary-50 px-3 py-3 text-xs leading-5 text-primary-900" aria-live="polite">
            <span className="block text-neutral-600">Tổng học phí dự kiến</span>
            <strong className="mt-0.5 block text-base tabular-nums text-primary-800">{formatVnd(estimatedTotal)}</strong>
          </div>
        </div>
      </section>

      {mutation.isError && (
        <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700 lg:col-span-full">
          Không thể lưu khóa học. Vui lòng thử lại.
        </p>
      )}
      {mutation.isSuccess && !isEditing && <p className="rounded-input bg-success-50 px-3 py-2 text-sm text-success-700 lg:col-span-full">Đã tạo khóa học.</p>}

      <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 lg:col-span-full">
        {isEditing && (
          <button
            type="button"
            onClick={() => onDone?.()}
            className="min-h-touch rounded-input border border-neutral-300 px-5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white transition hover:bg-primary-600 active:scale-[.98] disabled:opacity-60"
        >
          {mutation.isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm khóa học"}
        </button>
      </div>
    </form>
  );
}

function SectionHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-input bg-primary-50 text-primary-700">{icon}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

function Field({ children, error, htmlFor, label, required = false }: { children: ReactNode; error?: string; htmlFor: string; label: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (bắt buộc)</span>}
      </label>
      {children}
      {error && <p role="alert" className="mt-1 text-xs text-danger-700">{error}</p>}
    </div>
  );
}
