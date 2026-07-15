import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase/authClient";
import { useAuth } from "@/features/auth/hooks/useAuth";

const MESSAGES: Record<string, string> = {
  email_not_verified: "Email Google của bạn chưa được xác minh. Vui lòng xác minh email rồi đăng nhập lại.",
  no_invite: "Email của bạn chưa được mời vào hệ thống. Vui lòng liên hệ Admin để được cấp quyền.",
  error: "Không thể xác minh lời mời do lỗi kết nối. Vui lòng thử đăng nhập lại.",
};

export default function AccessDeniedPage() {
  const { claimFailureReason } = useAuth();
  const message = (claimFailureReason && MESSAGES[claimFailureReason]) || MESSAGES.no_invite;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl">Chưa có quyền truy cập</h1>
      <p className="max-w-sm text-sm text-neutral-500">{message}</p>
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
