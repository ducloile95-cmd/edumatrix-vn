import { Facebook } from "lucide-react";

interface PostPreviewCardProps {
  message: string;
  link: string;
  imageUrls: string[];
}

/** Ban xem truoc kieu Facebook - chi la mockup UI, khong goi API that. */
export function PostPreviewCard({ message, link, imageUrls }: PostPreviewCardProps) {
  const hasContent = Boolean(message.trim()) || imageUrls.length > 0;

  return (
    <div className="overflow-hidden rounded-card border border-neutral-200">
      <div className="flex items-center gap-2.5 p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-extrabold text-white">EM</span>
        <div>
          <b className="block text-sm">Edumatrix Việt Nam</b>
          <p className="mt-0.5 text-2xs text-neutral-500">Vừa xong · Công khai</p>
        </div>
      </div>

      {message.trim() && <p className="whitespace-pre-wrap break-words px-3.5 pb-3 text-sm leading-6">{message}</p>}

      {imageUrls.length > 0 && (
        <div className={`grid gap-0.5 ${imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {imageUrls.map((url, index) => (
            <img
              key={`${index}-${url}`}
              src={url}
              alt=""
              className={`w-full object-cover ${imageUrls.length === 1 ? "aspect-[16/10]" : "aspect-square"}`}
            />
          ))}
        </div>
      )}

      {link.trim() && (
        <p className="mx-3.5 my-3 truncate rounded-input border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-primary-700">{link}</p>
      )}

      {!hasContent && (
        <div className="px-4 py-11 text-center">
          <Facebook className="mx-auto text-neutral-300" size={34} />
          <p className="mt-3 text-xs font-semibold text-neutral-400">Chưa có nội dung xem trước</p>
        </div>
      )}
    </div>
  );
}
