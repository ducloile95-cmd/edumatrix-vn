import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase/client";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl">Chưa có quyền truy cập</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        Email của bạn chưa được mời vào hệ thống. Vui lòng liên hệ Admin để được cấp quyền.
      </p>
      <button
        type="button"
        onClick={() => signOut(auth)}
        className="mt-2 min-h-touch rounded-input border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50"
      >
        Đăng xuất
      </button>
    </div>
  );
}
