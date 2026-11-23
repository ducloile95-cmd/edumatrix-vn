import { createContext, useContext } from "react";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

// Ngoài ConfirmProvider (vd. test render lẻ component) thì rơi về hộp thoại trình duyệt.
const fallbackConfirm: ConfirmFn = async ({ title, message }) => window.confirm(message ? `${title}\n\n${message}` : title);

/** Hộp thoại xác nhận theo design system, thay cho window.confirm(). */
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext) ?? fallbackConfirm;
}
