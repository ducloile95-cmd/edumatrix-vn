import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  emptyMessage?: string;
}

export function MultiSelectDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Chọn lựa chọn",
  required = false,
  error,
  emptyMessage = "Chưa có lựa chọn phù hợp.",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const labelId = `${generatedId}-label`;
  const errorId = `${generatedId}-error`;
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus());
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  function closeAndRestoreFocus() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          closeAndRestoreFocus();
          return;
        }
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) {
          event.preventDefault();
          setOpen(true);
          return;
        }
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && open) {
          const optionButtons = [...(panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
          if (!optionButtons.length) return;
          event.preventDefault();
          const currentIndex = optionButtons.indexOf(document.activeElement as HTMLButtonElement);
          const offset = event.key === "ArrowDown" ? 1 : -1;
          const nextIndex = currentIndex < 0 ? 0 : (currentIndex + offset + optionButtons.length) % optionButtons.length;
          optionButtons[nextIndex].focus();
        }
      }}
    >
      <span id={labelId} className="mb-1.5 block text-xs font-bold text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (bắt buộc)</span>}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-touch w-full items-center justify-between gap-3 rounded-input border border-neutral-300 bg-white px-3 text-left text-sm outline-none transition hover:border-primary-300 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-100"
      >
        <span className={selectedLabels.length ? "truncate text-neutral-800" : "text-neutral-400"}>
          {selectedLabels.join(", ") || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary-700">
          {value.length} đã chọn
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div ref={panelRef} className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-card border border-neutral-200 bg-white p-1.5 shadow-[var(--shadow-3)]">
          <div role="listbox" aria-multiselectable="true" aria-labelledby={labelId} className="max-h-52 overflow-y-auto">
            {options.length === 0 && <p className="px-3 py-2 text-xs text-neutral-500">{emptyMessage}</p>}
            {options.map((option) => {
              const selected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onChange(selected ? value.filter((item) => item !== option.value) : [...value, option.value])}
                  className={`flex min-h-touch w-full items-center justify-between rounded-input px-3 text-left text-sm font-semibold transition ${selected ? "bg-primary-50 text-primary-800" : "text-neutral-700 hover:bg-neutral-50"}`}
                >
                  <span>{option.label}</span>
                  <span className={`grid size-5 shrink-0 place-items-center rounded-md border ${selected ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 text-transparent"}`}>
                    <Check size={13} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={closeAndRestoreFocus} className="mt-1 min-h-9 w-full rounded-input border border-neutral-200 text-xs font-bold text-neutral-700 transition hover:border-primary-300 hover:text-primary-700">
            Xong
          </button>
        </div>
      )}

      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-danger-700">{error}</p>}
    </div>
  );
}
