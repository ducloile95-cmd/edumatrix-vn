import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectFormSchema, type SubjectFormValues } from "@/schemas/subject";
import { createSubject, updateSubject } from "@/services/firestore/subjects";
import type { SubjectDoc } from "@/types/academic";

interface SubjectFormProps {
  /** Neu co gia tri => form o che do sua. */
  editingSubject?: (SubjectDoc & { id: string }) | null;
  onDone?: () => void;
}

const DEFAULT_VALUES: SubjectFormValues = { name: "", code: "", description: "" };

export function SubjectForm({ editingSubject, onDone }: SubjectFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingSubject;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (editingSubject) {
      reset({ name: editingSubject.name, code: editingSubject.code, description: editingSubject.description });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [editingSubject, reset]);

  const mutation = useMutation({
    mutationFn: async (values: SubjectFormValues): Promise<void> => {
      if (editingSubject) {
        await updateSubject(editingSubject.id, { name: values.name, description: values.description ?? "" });
        return;
      }
      await createSubject(values);
    },
    onSuccess: () => {
      reset(DEFAULT_VALUES);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      onDone?.();
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="subject-name" className="mb-1 block text-sm font-medium text-neutral-700">
            Tên môn học<span className="ml-0.5 text-danger-500">*</span>
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
            Mã môn học<span className="ml-0.5 text-danger-500">*</span>
          </label>
          <input
            id="subject-code"
            type="text"
            placeholder="IELTS-SPK"
            disabled={isEditing}
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
            {...register("code")}
          />
          {isEditing ? (
            <p className="mt-1 text-xs text-neutral-500">Mã môn học là định danh cố định, không thể đổi sau khi tạo.</p>
          ) : (
            errors.code && (
              <p role="alert" className="mt-1 text-xs text-danger-700">
                {errors.code.message}
              </p>
            )
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
          Không thể lưu môn học. Mã môn học có thể đã tồn tại.
        </p>
      )}
      {mutation.isSuccess && !isEditing && <p className="mt-3 text-sm text-success-700">Đã tạo môn học.</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm môn học"}
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
