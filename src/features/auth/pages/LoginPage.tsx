import { useState } from "react";
import { Navigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { GraduationCap } from "lucide-react";
import { auth, googleProvider } from "@/services/firebase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function LoginPage() {
  const { isSignedIn, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  if (!loading && isSignedIn) {
    return <Navigate to="/" replace />;
  }

  async function handleGoogleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm rounded-card bg-neutral-0 p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white">
            <GraduationCap size={24} aria-hidden="true" />
          </div>
          <h1 className="text-xl">Edumatrix-vn</h1>
          <p className="text-sm text-neutral-500">Hệ thống quản lý lớp học nội bộ</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="flex min-h-touch w-full items-center justify-center gap-2 rounded-input border border-neutral-300 bg-neutral-0 px-4 font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          {signingIn ? "Đang đăng nhập..." : "Đăng nhập bằng Google"}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger-700">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-neutral-500">
          Chỉ tài khoản được mời mới có thể truy cập hệ thống.
        </p>
      </div>
    </div>
  );
}
