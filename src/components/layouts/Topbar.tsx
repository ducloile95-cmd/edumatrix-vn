import { Menu, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROLE_LABELS } from "@/constants/roles";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { userDoc } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-neutral-200 bg-neutral-0 px-4">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Mở menu điều hướng"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-input hover:bg-neutral-100 lg:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        )}
        <span className="font-semibold text-primary-700">Edumatrix-vn</span>
      </div>

      <div className="flex items-center gap-3">
        {userDoc && (
          <span className="hidden text-sm text-neutral-500 sm:inline">
            {userDoc.displayName} · {ROLE_LABELS[userDoc.role]}
          </span>
        )}
        <button
          type="button"
          onClick={() => signOut(auth)}
          aria-label="Đăng xuất"
          className="flex min-h-touch min-w-touch items-center justify-center rounded-input hover:bg-neutral-100"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
