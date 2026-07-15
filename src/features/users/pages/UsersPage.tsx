import { useState } from "react";
import { UserPlus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { InviteForm } from "@/features/users/components/InviteForm";
import { InvitesList } from "@/features/users/components/InvitesList";
import { UsersList } from "@/features/users/components/UsersList";

export default function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader
        title="Người dùng"
        description="Mời tài khoản mới, theo dõi lời mời và khóa/mở tài khoản. Chỉ Admin xem được trang này."
        actions={(
          <Button variant="primary" onClick={() => setInviteOpen(true)} icon={<UserPlus size={18} />}>
            Mời tài khoản
          </Button>
        )}
      />

      <div className="rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1">Lời mời</h2>
        <InvitesList />
      </div>

      <div className="mt-4 rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1">Tài khoản</h2>
        <UsersList />
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Mời tài khoản mới" description="Gửi lời mời qua email để người dùng tự kích hoạt.">
        <InviteForm onDone={() => setInviteOpen(false)} />
      </Modal>
    </AppShell>
  );
}
