import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classFormSchema, type ClassFormValues } from "@/schemas/class";
import { createClass, updateClass } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { listUsersByRole } from "@/services/firestore/users";
import { USER_ROLES } from "@/constants/roles";
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

export function ClassForm({ editingClass, onDone }: ClassFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingClass;

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
      await createClass(values);
    },
    onSuccess: () => {
      reset(DEFAULT_VALUES);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      onDone?.();
    },
  });

  const activeCourses = courses?.filter((c) => c.status !== "completed") ?? [];
  const activeSubjects = subjects?.filter((s) => s.status === "active") ?? [];

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="class-name" className="mb-1 block text-sm font-medium text-neutral-700">
            Tên lớp
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
            Khóa học
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

        <div>
          <label htmlFor="class-subjects" className="mb-1 block text-sm font-medium text-neutral-700">
            Môn học
          </label>
          <Controller
            control={control}
            name="subjectIds"
            render={({ field }) => (
              <select
                id="class-subjects"
                multiple
                value={field.value}
                onChange={(e) => field.onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
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
          {errors.subjectIds && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.subjectIds.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="class-teachers" className="mb-1 block text-sm font-medium text-neutral-700">
            Giáo viên phụ trách
          </label>
          <Controller
            control={control}
            name="teacherIds"
            render={({ field }) => (
              <select
                id="class-teachers"
                multiple
                value={field.value}
                onChange={(e) => field.onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="min-h-[88px] w-full rounded-input border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500"
              >
                {(teachers ?? []).map((teacher) => (
                  <option key={teacher.uid} value={teacher.uid}>
                    {teacher.displayName}
                  </option>
                ))}
              </select>
            )}
          />
          <p className="mt-1 text-xs text-neutral-500">Giữ Ctrl/Cmd để chọn nhiều giáo viên.</p>
        </div>

        <div>
          <label htmlFor="class-schedule" className="mb-1 block text-sm font-medium text-neutral-700">
            Lịch học (mô tả)
          </label>
          <input
            id="class-schedule"
            type="text"
            placeholder="Thứ 4 và Thứ 6, 18:00-19:30"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("scheduleText")}
          />
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

      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-danger-700">
          Không thể lưu lớp học. Vui lòng thử lại.
        </p>
      )}
      {mutation.isSuccess && !isEditing && <p className="mt-3 text-sm text-success-700">Đã tạo lớp học.</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
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
