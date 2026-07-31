import { Search, X } from "lucide-react";

interface SearchInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/** Client-side search shared by compact data lists. */
export function SearchInput({
  id,
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  ariaLabel,
  className = "",
}: SearchInputProps) {
  const accessibleName = ariaLabel ?? placeholder;

  return (
    <div className={`relative ${className}`}>
      <Search
        size={17}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={accessibleName}
        className="min-h-touch w-full rounded-input border border-neutral-300 bg-white pl-10 pr-10 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`Xóa ${accessibleName.toLocaleLowerCase("vi")}`}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
