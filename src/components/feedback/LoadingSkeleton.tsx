interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 3, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-shimmer h-4 rounded" style={{ animationDelay: `${i * 45}ms` }} />
      ))}
    </div>
  );
}
