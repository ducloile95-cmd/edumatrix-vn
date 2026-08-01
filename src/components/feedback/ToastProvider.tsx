import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { ToastContext, type ToastInput, type ToastTone } from "@/components/feedback/toastContext";

interface ToastItem extends ToastInput {
  id: number;
  duration: number;
  tone: ToastTone;
  closing?: boolean;
}

const DEFAULT_TOAST_DURATION_MS = 3200;
const TOAST_EXIT_MS = 250;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const activeTimer = timers.current.get(id);
    if (activeTimer !== undefined) window.clearTimeout(activeTimer);
    setItems((current) => current.map((item) => item.id === id ? { ...item, closing: true } : item));
    const exitTimer = window.setTimeout(() => {
      timers.current.delete(id);
      setItems((current) => current.filter((item) => item.id !== id));
    }, TOAST_EXIT_MS);
    timers.current.set(id, exitTimer);
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    const id = nextId.current += 1;
    const duration = input.duration ?? DEFAULT_TOAST_DURATION_MS;
    setItems((current) => [...current, { ...input, id, duration, tone: input.tone ?? "info" }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(id);
      setItems((current) => current.filter((item) => item.id !== id));
    }, duration);
    timers.current.set(id, timer);
  }, []);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-center gap-2" aria-live="polite" aria-atomic="true">
          {items.map((item) => {
            const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "error" ? AlertCircle : Info;
            const toneClass = item.tone === "success"
              ? "border-success-200 text-success-700"
              : item.tone === "error"
                ? "border-danger-200 text-danger-700"
                : "border-primary-200 text-primary-700";
            return (
              <div
                key={item.id}
                role={item.tone === "error" ? "alert" : "status"}
                className={`${item.closing ? "toast-exit" : "toast-lifecycle"} pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-card border bg-white px-4 py-3 shadow-[var(--shadow-3)] ${toneClass}`}
                style={{ animationDuration: `${item.closing ? TOAST_EXIT_MS : item.duration}ms` }}
              >
                <Icon className="mt-0.5 shrink-0" size={19} strokeWidth={2} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-neutral-900">{item.title}</p>
                  {item.description && <p className="mt-0.5 text-xs leading-5 text-neutral-600">{item.description}</p>}
                </div>
                <button type="button" onClick={() => dismiss(item.id)} aria-label="Đóng thông báo" className="grid size-7 shrink-0 place-items-center rounded-input text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
