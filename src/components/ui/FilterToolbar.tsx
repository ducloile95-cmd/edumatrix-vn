import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface FilterToolbarProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

export function FilterToolbar({ children, className = "", label = "Công cụ tìm kiếm và lọc" }: FilterToolbarProps) {
  return (
    <section
      aria-label={label}
      className={`mb-4 rounded-card border border-neutral-200 bg-white p-3 shadow-[var(--shadow-1)] sm:p-4 ${className}`}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(190px,auto)] md:items-end">
        {children}
      </div>
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
          className="min-h-touch w-full appearance-none rounded-input border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm font-medium text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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
