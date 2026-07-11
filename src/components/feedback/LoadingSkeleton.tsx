interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 3, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} role="status" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-neutral-200" />
      ))}
    </div>
  );
}
