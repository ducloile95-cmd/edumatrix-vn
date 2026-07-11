import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentFormSchema, type StudentFormValues } from "@/schemas/student";
import { createStudent, updateStudent } from "@/services/firestore/students";
import type { StudentDoc } from "@/types/academic";

interface StudentFormProps {
  /** Neu co gia tri => form o che do sua, khong doi duoc ma hoc sinh (A13). */
  editingStudent?: (StudentDoc & { id: string }) | null;
  onDone?: () => void;
}

export function StudentForm({ editingStudent, onDone }: StudentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingStudent;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: { studentCode: "", fullName: "", dateOfBirth: "" },
  });

  useEffect(() => {
    if (editingStudent) {
      reset({
        studentCode: editingStudent.studentCode,
        fullName: editingStudent.fullName,
        dateOfBirth: editingStudent.dateOfBirth,
      });
    } else {
      reset({ studentCode: "", fullName: "", dateOfBirth: "" });
    }
  }, [editingStudent, reset]);

  const mutation = useMutation({
    mutationFn: (values: StudentFormValues) =>
      editingStudent ? updateStudent(editingStudent.id, values) : createStudent(values),
    onSuccess: () => {
      reset({ studentCode: "", fullName: "", dateOfBirth: "" });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onDone?.();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5"
    >
      <h2 className="mb-3">
        {editingStudent ? `Sửa học sinh ${editingStudent.studentCode}` : "Thêm học sinh"}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="student-code" className="mb-1 block text-sm font-medium text-neutral-700">
            Mã học sinh
          </label>
          <input
            id="student-code"
            type="text"
            placeholder="HS001"
            disabled={isEditing}
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500 disabled:bg-neutral-100 disabled:text-neutral-400"
            {...register("studentCode")}
          />
          {errors.studentCode && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.studentCode.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="student-name" className="mb-1 block text-sm font-medium text-neutral-700">
            Họ tên
          </label>
          <input
            id="student-name"
            type="text"
            placeholder="Nguyễn Minh Anh"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("fullName")}
          />
          {errors.fullName && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="student-dob" className="mb-1 block text-sm font-medium text-neutral-700">
            Ngày sinh
          </label>
          <input
            id="student-dob"
            type="date"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("dateOfBirth")}
          />
          {errors.dateOfBirth && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-danger-700">
          {isEditing ? "Không thể cập nhật học sinh." : "Không thể tạo học sinh. Mã học sinh có thể đã tồn tại."}
        </p>
      )}
      {mutation.isSuccess && !isEditing && (
        <p className="mt-3 text-sm text-success-700">Đã tạo học sinh.</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm học sinh"}
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
