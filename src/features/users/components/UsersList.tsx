import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { listUsers, setUserStatus } from "@/services/firestore/users";
import { ROLE_LABELS, USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { UserDetailModal } from "@/features/users/components/UserDetailModal";
import type { UserRole } from "@/types/user";

const AVATAR_COLORS = ["#3366F0", "#16A34A", "#F59E0B", "#E4453A", "#0EA5E9", "#78746D"];

function avatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
}

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: "bg-info-50 text-info-700",
  teacher: "bg-primary-50 text-primary-700",
  viewer: "bg-neutral-100 text-neutral-600",
};

type StatusFilter = "all" | "active" | "disabled";

/**
 * Bang tai khoan: tim kiem + loc vai tro/trang thai + chon nhieu de khoa/mo
 * hang loat + bam vao dong de xem chi tiet (UserDetailModal). Thay cho
 * danh sach xep chong truoc day - xem BAO-CAO-DONG-BO... 16/07 muc "Component tai su dung".
 */
export function UsersList() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailUid, setDetailUid] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: "active" | "disabled" }) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return setUserStatus(firebaseUser, uid, status);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ uids, status }: { uids: string[]; status: "active" | "disabled" }) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      await Promise.all(uids.map((uid) => setUserStatus(firebaseUser, uid, status)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelected(new Set());
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (term && !`${user.displayName} ${user.email}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message="Không tải được danh sách tài khoản." onRetry={() => refetch()} />;
  if (!users || users.length === 0) {
    return <EmptyState title="Chưa có tài khoản nào" description="Tài khoản sẽ xuất hiện ở đây sau khi được mời và đăng nhập lần đầu." />;
  }

  const eligibleForBulk = filtered.filter((user) => user.uid !== firebaseUser?.uid);
  const allSelected = eligibleForBulk.length > 0 && eligibleForBulk.every((user) => selected.has(user.uid));
  const detailUser = detailUid ? users.find((user) => user.uid === detailUid) ?? null : null;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(eligibleForBulk.map((user) => user.uid)));
  }

  function toggleOne(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="min-w-[200px] flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc email..." />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}
          className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm text-neutral-700"
          aria-label="Lọc theo vai trò"
        >
          <option value="all">Tất cả vai trò</option>
          {Object.values(USER_ROLES).map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm text-neutral-700"
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="disabled">Đã khóa</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-input border border-primary-100 bg-primary-50 px-3 py-2 text-sm text-primary-800">
          <span>Đã chọn {selected.size} tài khoản</span>
          <span className="flex-1" />
          <button
            type="button"
            disabled={bulkMutation.isPending}
            onClick={() => bulkMutation.mutate({ uids: [...selected], status: "disabled" })}
            className="min-h-touch rounded-input border border-primary-200 bg-white px-3 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
          >
            Khóa
          </button>
          <button
            type="button"
            disabled={bulkMutation.isPending}
            onClick={() => bulkMutation.mutate({ uids: [...selected], status: "active" })}
            className="min-h-touch rounded-input border border-primary-200 bg-white px-3 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
          >
            Mở khóa
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="min-h-touch rounded-input border border-primary-200 bg-white px-3 text-xs font-semibold text-primary-700 hover:bg-primary-100"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="Không tìm thấy tài khoản phù hợp" description="Thử đổi từ khóa hoặc bộ lọc." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="w-8 px-2 py-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Chọn tất cả" />
                </th>
                <th className="px-2 py-2">Tài khoản</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Vai trò</th>
                <th className="px-2 py-2">Đăng nhập cuối</th>
                <th className="px-2 py-2">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((user) => {
                const isSelf = user.uid === firebaseUser?.uid;
                return (
                  <tr
                    key={user.uid}
                    onClick={() => setDetailUid(user.uid)}
                    className={`cursor-pointer hover:bg-neutral-50 ${selected.has(user.uid) ? "bg-primary-50" : ""}`}
                  >
                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(user.uid)}
                        disabled={isSelf}
                        onChange={() => toggleOne(user.uid)}
                        title={isSelf ? "Không thể tự khóa tài khoản của chính mình" : undefined}
                        aria-label={`Chọn ${user.displayName}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex size-8 flex-none items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ background: avatarColor(user.uid) }}
                        >
                          {initialsOf(user.displayName)}
                        </span>
                        <span className="text-sm font-medium text-neutral-800">
                          {user.displayName} {isSelf && <span className="font-normal text-neutral-400">(bạn)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-neutral-500">{user.email}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE_CLASS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-2 py-2 tabular-nums text-neutral-500">
                      {user.lastLoginAt ? format(user.lastLoginAt.toDate(), "dd/MM/yyyy HH:mm") : "Chưa đăng nhập"}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge tone={user.status === "active" ? "success" : "danger"}>
                        {user.status === "active" ? "Đang hoạt động" : "Đã khóa"}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UserDetailModal
        user={detailUser}
        isSelf={detailUser?.uid === firebaseUser?.uid}
        isPending={statusMutation.isPending}
        onClose={() => setDetailUid(null)}
        onToggleStatus={(uid, status) => statusMutation.mutate({ uid, status })}
      />
    </div>
  );
}
