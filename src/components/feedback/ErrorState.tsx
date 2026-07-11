interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Không thể tải dữ liệu", message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-card border border-danger-100 bg-danger-50 p-4">
      <p className="font-semibold text-danger-700">{title}</p>
      <p className="mt-1 text-sm text-danger-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-touch rounded-input bg-danger-500 px-4 text-sm font-medium text-white hover:bg-danger-700"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
