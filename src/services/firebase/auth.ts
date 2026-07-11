import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/services/firebase/client";

/**
 * Cac thao tac Auth chay hoan toan o client SDK (goi Spark, khong Cloud Functions).
 * Xem rang buoc: memory auth-scope-constraints (Email/Password + Google, self-activation).
 */

async function applyPersistence(remember: boolean): Promise<void> {
  // Ghi nho dang nhap: local (giu qua lan mo lai) vs session (het khi dong tab).
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

export async function signInEmail(email: string, password: string, remember: boolean): Promise<void> {
  await applyPersistence(remember);
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInGoogle(remember: boolean): Promise<void> {
  await applyPersistence(remember);
  await signInWithPopup(auth, googleProvider);
}

/** Kich hoat tai khoan lan dau (nguoi duoc moi tu dat mat khau) + gui email xac minh. */
export async function activateAccount(email: string, password: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(credential.user);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/user-disabled": "Tài khoản đã bị khóa.",
  "auth/user-not-found": "Email hoặc mật khẩu không đúng.",
  "auth/wrong-password": "Email hoặc mật khẩu không đúng.",
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
  "auth/too-many-requests": "Quá nhiều lần thử. Vui lòng thử lại sau ít phút.",
  "auth/email-already-in-use": "Email này đã có tài khoản. Hãy đăng nhập hoặc dùng Quên mật khẩu.",
  "auth/weak-password": "Mật khẩu quá yếu (tối thiểu 6 ký tự).",
  "auth/network-request-failed": "Lỗi mạng. Kiểm tra kết nối và thử lại.",
  "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập Google.",
  "auth/operation-not-allowed": "Đăng nhập Email/Mật khẩu chưa được bật trong Firebase Console.",
};

export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return AUTH_ERRORS[code] ?? "Có lỗi xảy ra. Vui lòng thử lại.";
}
