import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  /** Ghi đè class của vùng nội dung (mặc định có scroll + padding). Dùng khi children tự quản lý scroll/layout riêng (VD: popup ngang chia cột). */
  bodyClassName?: string;
}

const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-[960px]", xl: "max-w-[1320px]" };

export function Modal({ open, title, description, children, onClose, size = "md", bodyClassName }: ModalProps) {
  const titleId = useId(); const descriptionId = useId(); const panelRef = useRef<HTMLDivElement>(null); const previousFocus = useRef<HTMLElement | null>(null); const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 140);
    return () => window.clearTimeout(timer);
  }, [mounted, open]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement; const originalOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")].filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = originalOverflow; document.removeEventListener("keydown", onKeyDown); previousFocus.current?.focus(); };
  }, [open]);
  if (!mounted) return null;
  const state = open ? "open" : "closed";
  return createPortal(<div data-state={state} className="modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-hidden bg-neutral-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div data-state={state} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={`modal-panel grid max-h-[calc(100dvh-2rem)] w-full grid-rows-[auto_1fr] overflow-hidden rounded-modal border border-neutral-200 bg-neutral-50 shadow-[var(--shadow-4)] ${sizes[size]}`}>
      <header className="flex items-start justify-between border-b border-neutral-200 bg-white px-5 py-4"><div><h2 id={titleId} className="text-lg font-semibold text-neutral-900">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm text-neutral-500">{description}</p>}</div><button type="button" onClick={onClose} aria-label="Đóng hộp thoại" className="icon-button -mr-2 -mt-1 flex"><X size={19} /></button></header>
      <div className={bodyClassName ?? "overflow-y-auto bg-neutral-50 p-5 sm:p-6"}>{children}</div>
    </div>
  </div>, document.body);
}
