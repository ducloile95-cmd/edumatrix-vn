import type { ReactNode } from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  ariaLabel?: string;
  visual: ReactNode;
  activeClassName?: string;
}

export function SegmentedPreference<T extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
  showLabel = true,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
  showLabel?: boolean;
}) {
  return (
    <div className={showLabel ? "grid grid-cols-[72px_auto] items-center justify-between gap-3" : "inline-flex items-center"}>
      <span className={showLabel ? "text-xs font-bold text-neutral-700" : "sr-only"}>{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-full border border-neutral-200 bg-neutral-100 p-1 shadow-inner">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.ariaLabel}
              onClick={() => onChange(option.value)}
              className={`relative inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition-[background-color,color,box-shadow,transform] duration-fast active:scale-[.97] ${compact ? "h-7 min-w-14 px-2 text-2xs" : "h-8 min-w-[68px] px-3 text-xs"} ${selected ? `bg-neutral-0 text-neutral-900 shadow-[0_1px_5px_rgba(15,23,42,.14)] ${option.activeClassName ?? ""}` : "text-neutral-500 hover:text-neutral-800"}`}
            >
              {option.visual}
              {option.label && <span>{option.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
