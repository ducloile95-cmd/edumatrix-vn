import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, setUserStatus } from "@/services/firestore/users";
import { ROLE_LABELS } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function UsersList() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const statusMutation = useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: "active" | "disabled" }) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return setUserStatus(firebaseUser, uid, status);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách tài khoản." onRetry={() => refetch()} />;
  if (!users || users.length === 0) {
    return <EmptyState title="Chưa có tài khoản nào" description="Tài khoản sẽ xuất hiện ở đây sau khi được mời và đăng nhập lần đầu." />;
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {users.map((user) => {
        const isSelf = user.uid === firebaseUser?.uid;
        return (
          <li key={user.uid} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-800">
                {user.displayName} {isSelf && <span className="text-neutral-400">(bạn)</span>}
              </p>
              <p className="text-xs text-neutral-500">
                {user.email} · {ROLE_LABELS[user.role]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone={user.status === "active" ? "success" : "danger"}>
                {user.status === "active" ? "Đang hoạt động" : "Đã khóa"}
              </StatusBadge>
              <button
                type="button"
                onClick={() =>
                  statusMutation.mutate({
                    uid: user.uid,
                    status: user.status === "active" ? "disabled" : "active",
                  })
                }
                disabled={isSelf || statusMutation.isPending}
                title={isSelf ? "Không thể tự khóa tài khoản của chính mình" : undefined}
                className="min-h-touch rounded-input border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              >
                {user.status === "active" ? "Khóa" : "Mở khóa"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
