import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Khoi noi dung thu gon duoc, nho trang thai theo persistKey.
 *
 * Dung ky thuat grid-rows [1fr] <-> [0fr] giong Sidebar Group: chi animate
 * grid-template-rows nen khong phai do chieu cao bang JS va khong giat layout.
 */
export function CollapsibleSection({
  title,
  description,
  action,
  children,
  persistKey,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  persistKey: string;
  defaultOpen?: boolean;
}) {
  const storageKey = `edumatrix-section-${persistKey}`;
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === null ? defaultOpen : saved === "true";
  });

  const toggle = () =>
    setOpen((current) => {
      localStorage.setItem(storageKey, String(!current));
      return !current;
    });

  return (
    <section className="pt-2">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="group flex min-h-touch shrink-0 items-center gap-2 text-left"
        >
          <ChevronDown
            size={18}
            className={`shrink-0 text-neutral-400 transition-transform group-hover:text-neutral-700 ${open ? "" : "-rotate-90"}`}
            style={{ transitionDuration: "var(--motion-duration)" }}
            aria-hidden="true"
          />
          <span>
            <span className="block text-lg font-bold tracking-tight text-neutral-950">{title}</span>
            {description && <span className="block text-xs leading-5 text-neutral-500">{description}</span>}
          </span>
        </button>
        {/* ponytail: action luon hien - bo loc trong action van ap cho noi dung ben ngoai section. */}
        {action}
      </div>

      <div
        className={`grid transition-[grid-template-rows] ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        style={{ transitionDuration: "var(--motion-duration)" }}
      >
        <div className="overflow-hidden">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
