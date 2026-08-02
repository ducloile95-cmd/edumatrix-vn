import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useDelayedPending } from "@/hooks/useDelayedPending";

/**
 * Fallback cho lazy route nam ben trong AppShell.
 * Giu Sidebar/Topbar tren man hinh va danh truoc bo cuc noi dung de tranh chop trang.
 */
export function RouteLoadingState() {
  const visible = useDelayedPending(true);
  if (!visible) return null;

  return (
    <div className="route-loading motion-content-enter" role="status" aria-live="polite" aria-label="Đang tải nội dung">
      <span className="sr-only">Đang tải nội dung</span>
      <div className="route-loading-bar" aria-hidden="true" />
      <div className="grid gap-4" aria-hidden="true">
        <div className="flex items-center justify-between gap-4">
          <LoadingSkeleton rows={1} className="w-48 max-w-[55vw]" />
          <div className="h-10 w-28 rounded-input bg-neutral-200/80" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-card border border-neutral-200 bg-white/75 p-4">
              <LoadingSkeleton rows={2} />
            </div>
          ))}
        </div>
        <div className="rounded-card border border-neutral-200 bg-white/80 p-5">
          <LoadingSkeleton rows={6} />
        </div>
      </div>
    </div>
  );
}
