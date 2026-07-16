import type { ReactNode } from "react";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROLE_LABELS } from "@/constants/roles";
import type { UserDoc } from "@/types/user";

interface UserDetailModalProps {
  user: (UserDoc & { uid: string }) | null;
  isSelf: boolean;
  isPending: boolean;
  onClose: () => void;
  onToggleStatus: (uid: string, nextStatus: "active" | "disabled") => void;
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-800">{value}</dd>
    </div>
  );
}

/** Popup chi tiet tai khoan - mo tu 1 dong trong UsersList. */
export function UserDetailModal({ user, isSelf, isPending, onClose, onToggleStatus }: UserDetailModalProps) {
  if (!user) return null;

  const isActive = user.status === "active";

  return (
    <Modal open onClose={onClose} title="Chi tiết tài khoản" size="sm">
      <div className="flex flex-col items-center text-center">
        <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
          {initialsOf(user.displayName)}
        </span>
        <p className="text-sm font-semibold text-neutral-900">
          {user.displayName} {isSelf && <span className="font-normal text-neutral-400">(bạn)</span>}
        </p>
        <p className="text-xs text-neutral-500">{user.email}</p>
      </div>

      <dl className="mt-4 divide-y divide-neutral-100 text-sm">
        <Row label="Vai trò" value={ROLE_LABELS[user.role]} />
        <Row
          label="Trạng thái"
          value={<StatusBadge tone={isActive ? "success" : "danger"}>{isActive ? "Đang hoạt động" : "Đã khóa"}</StatusBadge>}
        />
        <Row
          label="Đăng nhập cuối"
          value={user.lastLoginAt ? format(user.lastLoginAt.toDate(), "dd/MM/yyyy HH:mm") : "Chưa đăng nhập"}
        />
        <Row label="Ngày tạo tài khoản" value={user.createdAt ? format(user.createdAt.toDate(), "dd/MM/yyyy") : "--"} />
      </dl>

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
          Đóng
        </Button>
        <Button
          variant={isActive ? "danger" : "primary"}
          className="flex-1 justify-center"
          disabled={isSelf || isPending}
          title={isSelf ? "Không thể tự khóa tài khoản của chính mình" : undefined}
          onClick={() => onToggleStatus(user.uid, isActive ? "disabled" : "active")}
        >
          {isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        </Button>
      </div>
    </Modal>
  );
}
