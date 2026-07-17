import { useState } from "react";
import { ImagePlus, X } from "lucide-react";

const MAX_IMAGES = 4;

interface ImageUrlInputProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

/** Nhap URL anh cong khai (khong upload file - dung URL de tranh Cloud Storage). */
export function ImageUrlInput({ value, onChange, disabled }: ImageUrlInputProps) {
  const [draft, setDraft] = useState("");
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const atLimit = value.length >= MAX_IMAGES;

  const addUrl = () => {
    const url = draft.trim();
    if (!url || atLimit) return;
    onChange([...value, url]);
    setDraft("");
  };

  const removeUrl = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setBroken((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
    });
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-neutral-700">
        Ảnh đính kèm <span className="font-medium text-neutral-400">(đường dẫn công khai — không tải lên, không lưu trữ)</span>
      </span>
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Đường dẫn ảnh</span>
          <ImagePlus className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} aria-hidden="true" />
          <input
            type="url"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addUrl(); } }}
            disabled={disabled || atLimit}
            placeholder={atLimit ? "Đã đủ 4 ảnh" : "Dán link ảnh đã công khai, Enter hoặc bấm Thêm ảnh"}
            className="min-h-touch w-full rounded-input border border-neutral-300 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100"
          />
        </label>
        <button
          type="button"
          onClick={addUrl}
          disabled={disabled || !draft.trim() || atLimit}
          className="motion-control shrink-0 rounded-input border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
        >
          Thêm ảnh
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-neutral-400">{value.length}/{MAX_IMAGES} ảnh</span>
      </div>
      {value.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {value.map((url, index) => (
            <div key={`${index}-${url}`} className="relative aspect-square overflow-hidden rounded-input border border-neutral-200 bg-neutral-100">
              {broken.has(index) ? (
                <div className="flex h-full items-center justify-center px-1 text-center text-[9px] font-semibold leading-tight text-danger-700">Ảnh lỗi</div>
              ) : (
                <img
                  src={url}
                  alt=""
                  className="size-full object-cover"
                  onError={() => setBroken((prev) => new Set(prev).add(index))}
                />
              )}
              <button
                type="button"
                onClick={() => removeUrl(index)}
                aria-label="Xóa ảnh"
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-neutral-900/65 text-white hover:bg-neutral-900/85"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-5 text-neutral-500">
        Dán đường dẫn ảnh đã có sẵn công khai trên Internet (ảnh trên website trường, Google Drive đã bật chia sẻ công khai, ảnh từ bài đăng cũ...).
        Facebook tự tải ảnh từ đường dẫn này khi đăng — hệ thống không lưu file, chỉ lưu đường dẫn.
      </p>
    </div>
  );
}
