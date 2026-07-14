import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { courseFormSchema, type CourseFormValues } from "@/schemas/course";
import { createCourse } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";

export function CourseForm({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient();
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      name: "",
      subjectIds: [],
      tuitionFee: 0,
      totalSessions: 1,
      startDate: "",
      endDate: "",
      status: "draft",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CourseFormValues) => createCourse(values),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      onDone?.();
    },
  });

  const activeSubjects = subjects?.filter((s) => s.status === "active") ?? [];

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="course-name" className="mb-1 block text-sm font-medium text-neutral-700">
            Tên khóa học
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
          <label htmlFor="course-subjects" className="mb-1 block text-sm font-medium text-neutral-700">
            Môn học
          </label>
          <Controller
            control={control}
            name="subjectIds"
            render={({ field }) => (
              <select
                id="course-subjects"
                multiple
                value={field.value}
                onChange={(e) =>
                  field.onChange(Array.from(e.target.selectedOptions, (o) => o.value))
                }
                className="min-h-[88px] w-full rounded-input border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500"
              >
                {activeSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          />
          <p className="mt-1 text-xs text-neutral-500">Giữ Ctrl/Cmd để chọn nhiều môn.</p>
          {errors.subjectIds && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.subjectIds.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="course-fee" className="mb-1 block text-sm font-medium text-neutral-700">
            Học phí (VNĐ)
          </label>
          <input
            id="course-fee"
            type="number"
            min={0}
            step={1}
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("tuitionFee")}
          />
          {errors.tuitionFee && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.tuitionFee.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="course-sessions" className="mb-1 block text-sm font-medium text-neutral-700">
            Tổng số buổi
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
          Không thể tạo khóa học. Vui lòng thử lại.
        </p>
      )}
      {mutation.isSuccess && <p className="mt-3 text-sm text-success-700">Đã tạo khóa học.</p>}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-4 min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
      >
        {mutation.isPending ? "Đang tạo..." : "Thêm khóa học"}
      </button>
    </form>
  );
}
