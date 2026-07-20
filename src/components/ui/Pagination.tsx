import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Danh từ số nhiều hiển thị ở cuối ("trong X học sinh/lớp/..."). Mặc định giữ nguyên "học sinh". */
  itemLabel?: string;
}

export function Pagination({
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = [15, 20, 30, 50, 100],
  totalItems,
  itemLabel = "học sinh",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  if (totalItems === 0) return null;

  return (
    <nav
      className="mt-4 flex min-h-touch flex-col gap-3 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Phân trang"
    >
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span>Hiển thị</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
          disabled={!onPageSizeChange}
          className="h-9 rounded-input border border-neutral-300 bg-white px-2 text-sm font-medium text-neutral-800 transition focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Số dòng mỗi trang"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} dòng
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          aria-label="Trang đầu"
          title="Trang đầu"
          disabled={!canGoBack}
          onClick={() => onPageChange(1)}
          className="flex size-9 items-center justify-center rounded-full border border-primary-500 text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-300"
        >
          <ChevronsLeft aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          aria-label="Trang trước"
          title="Trang trước"
          disabled={!canGoBack}
          onClick={() => onPageChange(page - 1)}
          className="flex size-9 items-center justify-center rounded-full border border-primary-500 text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-300"
        >
          <ChevronLeft aria-hidden="true" size={16} />
        </button>
        <span className="grid h-9 min-w-12 place-items-center rounded-input border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-900">
          {page}
        </span>
        <button
          type="button"
          aria-label="Trang sau"
          title="Trang sau"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
          className="flex size-9 items-center justify-center rounded-full border border-primary-500 text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-300"
        >
          <ChevronRight aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          aria-label="Trang cuối"
          title="Trang cuối"
          disabled={!canGoNext}
          onClick={() => onPageChange(totalPages)}
          className="flex size-9 items-center justify-center rounded-full border border-primary-500 text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-300"
        >
          <ChevronsRight aria-hidden="true" size={16} />
        </button>
        <span className="ml-2 text-sm text-neutral-500">
          {firstItem} - {lastItem} trong {totalItems} {itemLabel}
        </span>
      </div>
    </nav>
  );
}
