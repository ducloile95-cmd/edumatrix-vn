import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Users } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { activateAccount, authErrorMessage, resetPassword, signInEmail, signInGoogle } from "@/services/firebase/auth";
import bgUrl from "@/assets/login-bg.svg";

type Mode = "login" | "forgot" | "activate";

const WELCOME_KEY = "edumatrix_welcomed";

const labelCls = "mb-1.5 block text-xs font-semibold text-neutral-700";
const fieldCls =
  "flex items-center rounded-input border border-neutral-300 px-3 transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100";
const inputCls = "h-12 w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9C21.9 19 23 15.9 23 12.3z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.2A12 12 0 0 0 0 12c0 1.9.5 3.8 1.2 5.4l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4 3.1c1-2.9 3.7-4.9 6.8-4.9z" />
    </svg>
  );
}

export default function LoginPage() {
  const { isSignedIn, loading } = useAuth();

  const [welcomed, setWelcomed] = useState(() => localStorage.getItem(WELCOME_KEY) === "1");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!loading && isSignedIn) {
    return <Navigate to="/" replace />;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  function dismissWelcome() {
    localStorage.setItem(WELCOME_KEY, "1");
    setWelcomed(true);
  }

  async function run(action: () => Promise<void>, onOk?: () => void) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await action();
      onOk?.();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "login") {
      run(() => signInEmail(email, password, remember));
    } else if (mode === "forgot") {
      run(
        () => resetPassword(email),
        () => setNotice(`Đã gửi email đặt lại mật khẩu tới ${email.trim()}. Kiểm tra hộp thư (cả mục Spam).`),
      );
    } else {
      run(
        () => activateAccount(email, password),
        () => {
          setNotice("Đã tạo tài khoản. Kiểm tra email để xác minh, sau đó quay lại đăng nhập.");
          setPassword("");
        },
      );
    }
  }

  const title = mode === "login" ? "Chào mừng trở lại" : mode === "forgot" ? "Quên mật khẩu" : "Kích hoạt tài khoản";
  const subtitle =
    mode === "login"
      ? "Đăng nhập để tiếp tục quản lý lớp học của bạn."
      : mode === "forgot"
        ? "Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
        : "Dành cho tài khoản đã được mời — đặt mật khẩu cho email của bạn.";
  const submitLabel =
    mode === "login" ? "Đăng nhập" : mode === "forgot" ? "Gửi liên kết" : "Kích hoạt tài khoản";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4 sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-modal border border-neutral-200 bg-neutral-0 shadow-[0_18px_50px_rgba(27,46,110,0.14)] lg:grid-cols-2">
        {/* ===== FORM ===== */}
        <div className="flex flex-col p-7 sm:p-9">
          <Logo className="mx-auto h-20 w-auto" />

          <form onSubmit={onSubmit} className="mx-auto mt-4 flex w-full max-w-sm flex-1 flex-col justify-center">
            <h1 className="text-center text-[26px] font-bold text-primary-900">{title}</h1>
            <p className="mt-1.5 mb-6 text-center text-sm text-neutral-500">{subtitle}</p>

            <label className={labelCls} htmlFor="email">Email</label>
            <div className={fieldCls}>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten@edumatrix.vn"
                className={inputCls}
              />
            </div>

            {mode !== "forgot" && (
              <>
                <label className={`${labelCls} mt-4`} htmlFor="password">Mật khẩu</label>
                <div className={fieldCls}>
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "activate" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "activate" ? "Tạo mật khẩu (tối thiểu 6 ký tự)" : "Nhập mật khẩu"}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="p-1 text-neutral-500 hover:text-neutral-700"
                  >
                    {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </>
            )}

            {mode === "login" && (
              <div className="mt-3 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-primary-500" />
                  Ghi nhớ đăng nhập
                </label>
                <button type="button" onClick={() => switchMode("forgot")} className="text-xs font-semibold text-primary-600 hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {error && <p role="alert" className="mt-4 rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
            {notice && <p className="mt-4 rounded-input bg-success-50 px-3 py-2 text-sm text-success-700">{notice}</p>}

            <button type="submit" disabled={busy} className="mt-5 flex h-12 w-full items-center justify-center rounded-input bg-primary-500 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(51,102,240,0.3)] transition hover:bg-primary-600 disabled:opacity-60">
              {busy ? "Đang xử lý..." : submitLabel}
            </button>

            {mode === "login" ? (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-neutral-500">
                  <span className="h-px flex-1 bg-neutral-200" />Hoặc đăng nhập với<span className="h-px flex-1 bg-neutral-200" />
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => signInGoogle(remember))}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-input border border-neutral-300 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60"
                >
                  <GoogleIcon />Đăng nhập bằng Google
                </button>
                <p className="mt-5 text-center text-xs text-neutral-500">
                  Lần đầu đăng nhập bằng email?{" "}
                  <button type="button" onClick={() => switchMode("activate")} className="font-semibold text-primary-600 hover:underline">Kích hoạt tài khoản</button>
                  <br />Chỉ tài khoản đã được mời mới truy cập được hệ thống.
                </p>
              </>
            ) : (
              <button type="button" onClick={() => switchMode("login")} className="mt-5 text-center text-sm font-semibold text-neutral-500 hover:text-primary-900">
                ← Quay lại đăng nhập
              </button>
            )}
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 text-[11px] text-neutral-500">
            <span>© 2026 EduMatrix VN</span>
            <a href="#" className="hover:text-neutral-700">Chính sách bảo mật</a>
          </div>
        </div>

        {/* ===== BRAND PANEL ===== */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-900 via-[#243a86] to-primary-600 p-10 lg:flex lg:flex-col lg:justify-center lg:gap-6">
          <img src={bgUrl} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen" />
          <span className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-500" />EduMatrix VN
          </span>
          <div className="relative z-10">
            <h2 className="text-[26px] font-bold leading-snug text-white">Quản lý lớp học, điểm danh và học phí — một nơi duy nhất.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">Đăng nhập để vào bảng điều khiển giáo viên hoặc cổng phụ huynh.</p>
          </div>
        </div>
      </div>

      {/* ===== WELCOME POPUP (lần đầu truy cập) ===== */}
      {!welcomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-modal bg-neutral-0 p-6 text-center shadow-[0_24px_60px_rgba(10,20,60,0.35)]">
            <Logo className="mx-auto h-16 w-auto" />
            <h2 className="mt-3 text-lg font-bold text-primary-900">Chào mừng bạn đã truy cập EduMatrix</h2>
            <p className="mb-4 mt-1 text-sm text-neutral-500">Chọn vai trò để tiếp tục đăng nhập</p>

            <button onClick={dismissWelcome} className="mb-2.5 flex w-full items-center gap-3 rounded-card border border-neutral-200 p-3 text-left transition hover:border-primary-500 hover:bg-primary-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-input bg-primary-50 text-primary-500"><GraduationCap size={20} /></span>
              <span><span className="block text-sm font-semibold text-neutral-900">Giáo viên</span><span className="block text-xs text-neutral-500">Quản lý lớp, điểm danh, chấm bài</span></span>
            </button>
            <button onClick={dismissWelcome} className="flex w-full items-center gap-3 rounded-card border border-neutral-200 p-3 text-left transition hover:border-primary-500 hover:bg-primary-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-input bg-accent-50 text-accent-700"><Users size={20} /></span>
              <span><span className="block text-sm font-semibold text-neutral-900">Phụ huynh / Học sinh</span><span className="block text-xs text-neutral-500">Xem lịch, bài tập, điểm, học phí</span></span>
            </button>
            <p className="mt-4 text-[11px] text-neutral-500">EduMatrix VN — 2026</p>
          </div>
        </div>
      )}
    </div>
  );
}
