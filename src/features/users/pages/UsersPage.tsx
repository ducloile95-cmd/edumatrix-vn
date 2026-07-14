import { useState } from "react";
import { UserPlus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { InviteForm } from "@/features/users/components/InviteForm";
import { InvitesList } from "@/features/users/components/InvitesList";
import { UsersList } from "@/features/users/components/UsersList";

export default function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader title="Người dùng" description="Mời tài khoản mới, theo dõi lời mời và khóa/mở tài khoản. Chỉ Admin xem được trang này." actions={<button type="button" onClick={() => setInviteOpen(true)} className="inline-flex min-h-touch items-center gap-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(35,72,214,.25)] transition active:scale-[.98]">
          <UserPlus size={18} />Mời tài khoản
        </button>} />

      <div className="glass-panel mt-5 rounded-2xl border border-white/70 p-4 sm:p-5">
        <h2 className="mb-1">Lời mời</h2>
        <InvitesList />
      </div>

      <div className="glass-panel mt-6 rounded-2xl border border-white/70 p-4 sm:p-5">
        <h2 className="mb-1">Tài khoản</h2>
        <UsersList />
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Mời tài khoản mới" description="Gửi lời mời qua email để người dùng tự kích hoạt.">
        <InviteForm onDone={() => setInviteOpen(false)} />
      </Modal>
    </AppShell>
  );
}
