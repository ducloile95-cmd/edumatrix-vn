import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectFormSchema, type SubjectFormValues } from "@/schemas/subject";
import { createSubject } from "@/services/firestore/subjects";

export function SubjectForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { name: "", code: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: SubjectFormValues) => createSubject(values),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5"
    >
      <h2 className="mb-3">Thêm môn học</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="subject-name" className="mb-1 block text-sm font-medium text-neutral-700">
            Tên môn học
          </label>
          <input
            id="subject-name"
            type="text"
            placeholder="IELTS Speaking"
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
          <label htmlFor="subject-code" className="mb-1 block text-sm font-medium text-neutral-700">
            Mã môn học
          </label>
          <input
            id="subject-code"
            type="text"
            placeholder="IELTS-SPK"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("code")}
          />
          {errors.code && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.code.message}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="subject-description" className="mb-1 block text-sm font-medium text-neutral-700">
            Mô tả (tùy chọn)
          </label>
          <input
            id="subject-description"
            type="text"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("description")}
          />
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-danger-700">
          Không thể tạo môn học. Mã môn học có thể đã tồn tại.
        </p>
      )}
      {mutation.isSuccess && (
        <p className="mt-3 text-sm text-success-700">Đã tạo môn học.</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-4 min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
      >
        {mutation.isPending ? "Đang tạo..." : "Thêm môn học"}
      </button>
    </form>
  );
}
