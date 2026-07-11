interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Tim kiem client-side don gian, dung chung cho cac danh muc nho (<200 doc)
 * nen khong can query server rieng (A14, A25).
 */
export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Tìm kiếm..."}
      aria-label={placeholder ?? "Tìm kiếm"}
      className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500 sm:max-w-xs"
    />
  );
}
