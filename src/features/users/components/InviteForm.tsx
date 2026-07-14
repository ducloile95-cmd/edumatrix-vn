import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { inviteFormSchema, parseStudentIds, type InviteFormValues } from "@/schemas/invite";
import { createInvite } from "@/services/firestore/invites";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { USER_ROLES, ROLE_LABELS } from "@/constants/roles";

export function InviteForm({ onDone }: { onDone?: () => void }) {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", role: USER_ROLES.VIEWER, studentIdsText: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: InviteFormValues) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      await createInvite(firebaseUser, {
        email: values.email,
        role: values.role,
        studentIds: parseStudentIds(values.studentIdsText),
      });
      return values.email;
    },
    onSuccess: (email) => {
      setSuccessEmail(email);
      reset();
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      onDone?.();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setSuccessEmail(null);
        mutation.mutate(values);
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-neutral-700">
            Email Google
          </label>
          <input
            id="invite-email"
            type="email"
            placeholder="parent@gmail.com"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className="mt-1 text-xs text-danger-700">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-neutral-700">
            Vai trò
          </label>
          <select
            id="invite-role"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("role")}
          >
            {Object.values(USER_ROLES).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="invite-students" className="mb-1 block text-sm font-medium text-neutral-700">
            Mã học sinh liên kết (nếu là Phụ huynh/Học sinh)
          </label>
          <input
            id="invite-students"
            type="text"
            placeholder="HS001, HS002"
            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
            {...register("studentIdsText")}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Cách nhau bởi dấu phẩy. Bỏ trống nếu mời Admin/Giáo viên.
          </p>
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-danger-700">
          Không thể tạo lời mời. Vui lòng thử lại.
        </p>
      )}
      {successEmail && (
        <p className="mt-3 text-sm text-success-700">Đã tạo lời mời cho {successEmail}.</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-4 min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
      >
        {mutation.isPending ? "Đang tạo..." : "Gửi lời mời"}
      </button>
    </form>
  );
}
