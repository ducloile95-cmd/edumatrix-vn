import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { linkParentFormSchema, type LinkParentFormValues } from "@/schemas/student";
import { linkParentToStudent } from "@/services/firestore/students";

const FAILURE_MESSAGE: Record<"not_found" | "not_viewer" | "error", string> = {
  not_found:
    "Không tìm thấy tài khoản với email này. Vào trang Người dùng để mời tài khoản Phụ huynh trước.",
  not_viewer: "Email này thuộc tài khoản Admin/Giáo viên, không thể gán làm phụ huynh.",
  error: "Có lỗi xảy ra. Vui lòng thử lại.",
};

export function LinkParentForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LinkParentFormValues>({
    resolver: zodResolver(linkParentFormSchema),
    defaultValues: { parentEmail: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: LinkParentFormValues) => linkParentToStudent(studentId, values.parentEmail),
    onSuccess: (result) => {
      if (result.linked) {
        queryClient.invalidateQueries({ queryKey: ["students"] });
        onDone();
      }
    },
  });

  const failureReason = mutation.data && !mutation.data.linked ? mutation.data.reason : null;

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="mt-2 flex flex-wrap items-start gap-2 rounded-input bg-neutral-50 p-3"
    >
      <div className="flex-1 min-w-[200px]">
        <input
          type="email"
          placeholder="parent@gmail.com"
          className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
          {...register("parentEmail")}
        />
        {errors.parentEmail && (
          <p role="alert" className="mt-1 text-xs text-danger-700">
            {errors.parentEmail.message}
          </p>
        )}
        {failureReason && (
          <p role="alert" className="mt-1 text-xs text-danger-700">
            {FAILURE_MESSAGE[failureReason]}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="min-h-touch rounded-input bg-primary-500 px-4 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-60"
      >
        {mutation.isPending ? "Đang gán..." : "Gán"}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="min-h-touch rounded-input border border-neutral-300 px-4 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
      >
        Đóng
      </button>
    </form>
  );
}
