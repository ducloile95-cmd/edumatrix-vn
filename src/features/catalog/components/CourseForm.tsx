import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { courseFormSchema, type CourseFormValues } from "@/schemas/course";
import { createCourse, updateCourse } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { formatVnd } from "@/utils/currency";
import type { CourseDoc } from "@/types/academic";

interface CourseFormProps {
  /** Neu co gia tri => form o che do sua. */
  editingCourse?: (CourseDoc & { id: string }) | null;
  /** Mon hoc chon san khi mo tao moi tu luong "Them khoa hoc cho mon nay". */
  presetSubjectId?: string;
  onDone?: () => void;
}

const DEFAULT_VALUES: CourseFormValues = {
  name: "",
  subjectIds: [],
  pricePerSession: 0,
  totalSessions: 1,
  startDate: "",
  endDate: "",
  status: "draft",
};

export function CourseForm({ editingCourse, presetSubjectId, onDone }: CourseFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingCourse;
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });

  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: presetSubjectId ? { ...DEFAULT_VALUES, subjectIds: [presetSubjectId] } : DEFAULT_VALUES,
  });

  useEffect(() => {
    if (editingCourse) {
      reset({
        name: editingCourse.name,
        subjectIds: editingCourse.subjectIds,
        // Khoa cu chua co pricePerSession -> goi y tinh tu tuitionFee/totalSessions, van sua duoc.
        pricePerSession: editingCourse.pricePerSession ?? Math.round(editingCourse.tuitionFee / editingCourse.totalSessions),
        totalSessions: editingCourse.totalSessions,
        startDate: format(editingCourse.startDate.toDate(), "yyyy-MM-dd"),
        endDate: format(editingCourse.endDate.toDate(), "yyyy-MM-dd"),
        status: editingCourse.status,
      });
    } else {
      reset(presetSubjectId ? { ...DEFAULT_VALUES, subjectIds: [presetSubjectId] } : DEFAULT_VALUES);
    }
  }, [editingCourse, presetSubjectId, reset]);

  const watchedPricePerSession = watch("pricePerSession");
  const watchedTotalSessions = watch("totalSessions");
  const estimatedTotal = (watchedPricePerSession || 0) * (watchedTotalSessions || 0);

  const mutation = useMutation({
    mutationFn: async (values: CourseFormValues): Promise<void> => {
      if (editingCourse) {
        await updateCourse(editingCourse.id, values);
        return;
      }
      await createCourse(values);
    },
    onSuccess: () => {
      reset(DEFAULT_VALUES);
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      onDone?.();
    },
  });

  const activeSubjects = subjects?.filter((s) => s.status === "active") ?? [];

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="course-name" className="mb-1 block text-sm font-medium text-neutral-700">
            Tên khóa học<span className="ml-0.5 text-danger-500">*</span>
          </label>
          <input
            id="course-name"
            type="text"
            placeholder="IELTS Foundation"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("name")}
          />
          {errors.name && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
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
          <p className="mt-1 text-xs text-neutral-500">Bấm để chọn/bỏ chọn, có thể chọn nhiều môn.</p>
          {errors.subjectIds && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.subjectIds.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="course-fee" className="mb-1 block text-sm font-medium text-neutral-700">
            Học phí / buổi (VNĐ)<span className="ml-0.5 text-danger-500">*</span>
          </label>
          <input
            id="course-fee"
            type="number"
            min={0}
            step={1}
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("pricePerSession")}
          />
          {errors.pricePerSession && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.pricePerSession.message}
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            Tổng học phí dự kiến: <span className="font-medium text-neutral-700">{formatVnd(estimatedTotal)}</span>
          </p>
        </div>

        <div>
          <label htmlFor="course-sessions" className="mb-1 block text-sm font-medium text-neutral-700">
            Tổng số buổi<span className="ml-0.5 text-danger-500">*</span>
          </label>
          <input
            id="course-sessions"
            type="number"
            min={1}
            step={1}
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("totalSessions")}
          />
          {errors.totalSessions && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.totalSessions.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="course-start" className="mb-1 block text-sm font-medium text-neutral-700">
            Ngày bắt đầu
          </label>
          <input
            id="course-start"
            type="date"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("startDate")}
          />
          {errors.startDate && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.startDate.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="course-end" className="mb-1 block text-sm font-medium text-neutral-700">
            Ngày kết thúc
          </label>
          <input
            id="course-end"
            type="date"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("endDate")}
          />
          {errors.endDate && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.endDate.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="course-status" className="mb-1 block text-sm font-medium text-neutral-700">
            Trạng thái
          </label>
          <select
            id="course-status"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("status")}
          >
            <option value="draft">Nháp</option>
            <option value="active">Đang mở</option>
            <option value="completed">Đã kết thúc</option>
          </select>
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-danger-700">
          Không thể lưu khóa học. Vui lòng thử lại.
        </p>
      )}
      {mutation.isSuccess && !isEditing && <p className="mt-3 text-sm text-success-700">Đã tạo khóa học.</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm khóa học"}
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
