import { Children, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface FilterToolbarProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

export function FilterToolbar({ children, className = "", label = "Công cụ tìm kiếm và lọc" }: FilterToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  return (
    <section
      aria-label={label}
      className={`mb-4 rounded-card border border-neutral-200 bg-neutral-0 p-3 shadow-[var(--shadow-1)] sm:p-4 ${className}`}
    >
      {/* Mobile: chỉ giữ ô lọc chính, các ô còn lại gập lại để danh sách lên sớm. */}
      <div id={contentId} className={`grid gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(190px,auto)] md:items-end ${expanded ? "" : "max-md:[&>*:not(:first-child)]:hidden"}`}>
        {children}
      </div>
      {Children.count(children) > 1 && <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 flex min-h-touch w-full items-center justify-center gap-1.5 rounded-input text-sm font-semibold text-primary-700 hover:bg-primary-50 md:hidden"
      >
        {expanded ? "Ẩn bớt bộ lọc" : "Thêm bộ lọc"}
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>}
    </section>
  );
}

interface FilterFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}

export function FilterField({ label, htmlFor, children, className = "" }: FilterFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-neutral-600">
        {label}
      </label>
      {children}
    </div>
  );
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterSelect({ id, label, value, options, onChange, className = "" }: FilterSelectProps) {
  return (
    <FilterField label={label} htmlFor={id} className={className}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-touch w-full appearance-none rounded-input border border-neutral-300 bg-neutral-0 py-2 pl-3 pr-10 text-sm font-medium text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
        />
      </div>
    </FilterField>
  );
}
