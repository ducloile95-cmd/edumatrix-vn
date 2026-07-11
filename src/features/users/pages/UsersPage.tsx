import { AppShell } from "@/components/layouts/AppShell";
import { InviteForm } from "@/features/users/components/InviteForm";
import { InvitesList } from "@/features/users/components/InvitesList";
import { UsersList } from "@/features/users/components/UsersList";

export default function UsersPage() {
  return (
    <AppShell>
      <h1>Người dùng</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Mời tài khoản mới, theo dõi lời mời và khóa/mở tài khoản. Chỉ Admin xem được trang này.
      </p>

      <div className="mt-5">
        <InviteForm />
      </div>

      <div className="mt-6 rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5">
        <h2 className="mb-1">Lời mời</h2>
        <InvitesList />
      </div>

      <div className="mt-6 rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5">
        <h2 className="mb-1">Tài khoản</h2>
        <UsersList />
      </div>
    </AppShell>
  );
}
