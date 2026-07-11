import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInvites, revokeInvite } from "@/services/firestore/invites";
import { ROLE_LABELS } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { InviteStatus } from "@/types/user";

const STATUS_TONE: Record<InviteStatus, "success" | "neutral" | "danger"> = {
  active: "success",
  claimed: "neutral",
  revoked: "danger",
};
const STATUS_LABEL: Record<InviteStatus, string> = {
  active: "Đang chờ nhận lời mời",
  claimed: "Đã tham gia",
  revoked: "Đã thu hồi",
};

export function InvitesList() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: invites, isLoading, isError, refetch } = useQuery({
    queryKey: ["invites"],
    queryFn: listInvites,
  });

  const revokeMutation = useMutation({
    mutationFn: (email: string) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return revokeInvite(firebaseUser, email);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invites"] }),
  });

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách lời mời." onRetry={() => refetch()} />;
  if (!invites || invites.length === 0) {
    return <EmptyState title="Chưa có lời mời nào" description="Tạo lời mời ở form phía trên để cấp quyền cho Admin, Giáo viên hoặc Phụ huynh." />;
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {invites.map((invite) => (
        <li key={invite.email} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <p className="text-sm font-medium text-neutral-800">{invite.email}</p>
            <p className="text-xs text-neutral-500">{ROLE_LABELS[invite.role]}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={STATUS_TONE[invite.status]}>{STATUS_LABEL[invite.status]}</StatusBadge>
            {invite.status === "active" && (
              <button
                type="button"
                onClick={() => revokeMutation.mutate(invite.email)}
                disabled={revokeMutation.isPending}
                className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-60"
              >
                Thu hồi
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
