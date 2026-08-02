import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Ghi đè class vùng nội dung khi children tự quản lý scroll/layout. */
  bodyClassName?: string;
}

const sizes = {
  sm: "max-w-md lg:max-w-[720px]",
  md: "max-w-2xl lg:max-w-[1080px]",
  lg: "max-w-[960px] lg:max-w-[1440px]",
  xl: "max-w-[1320px] lg:max-w-[1760px]",
  "2xl": "max-w-[1920px]",
};
const MODAL_EXIT_MS = 200;

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
    const timer = window.setTimeout(() => setMounted(false), MODAL_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, open]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement; const originalOverflow = document.body.style.overflow; const appRoot = document.getElementById("root"); const rootWasInert = appRoot?.hasAttribute("inert") ?? false; document.body.style.overflow = "hidden"; appRoot?.setAttribute("inert", "");
    window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")].filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = originalOverflow; if (!rootWasInert) appRoot?.removeAttribute("inert"); document.removeEventListener("keydown", onKeyDown); previousFocus.current?.focus(); };
  }, [open]);

  if (!mounted) return null;
  const state = open ? "open" : "closed";
  const fullscreen = size === "2xl";
  return createPortal(<div data-state={state} className={`modal-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-neutral-900/50 pt-[env(safe-area-inset-top)] sm:grid sm:place-items-center sm:p-4 ${fullscreen ? "lg:p-0" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div data-state={state} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} style={fullscreen ? { width: "100vw", maxWidth: "1920px", height: "100%", maxHeight: "980px" } : undefined} className={`modal-panel grid max-h-full w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-modal border border-b-0 border-neutral-200 bg-neutral-50 shadow-[0_28px_90px_rgba(28,26,21,.24)] ring-1 ring-white/70 sm:max-h-[calc(100dvh-2rem)] sm:rounded-modal sm:border-b ${fullscreen ? "h-full sm:h-[calc(100dvh-2rem)] lg:h-dvh lg:max-h-[980px] lg:rounded-none lg:border-x-0" : ""} ${sizes[size]}`}>
      <header className={`flex items-start justify-between border-b border-neutral-200 px-4 py-3 sm:px-5 sm:py-4 ${fullscreen ? "bg-gradient-to-r from-white via-white to-primary-50/70 lg:px-6" : "bg-white"}`}><div className="min-w-0"><h2 id={titleId} className="text-lg font-bold tracking-[-0.01em] text-neutral-900">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm text-neutral-500">{description}</p>}</div><button type="button" onClick={onClose} aria-label="Đóng hộp thoại" className="icon-button -mr-2 -mt-1 flex shrink-0 border border-neutral-200 bg-white shadow-sm"><X size={19} /></button></header>
      <div className={bodyClassName !== undefined ? `min-h-0 ${bodyClassName}` : "min-h-0 overflow-y-auto overscroll-contain bg-neutral-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6"}>{children}</div>
    </div>
  </div>, document.body);
}
