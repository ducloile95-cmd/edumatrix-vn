import { Button } from "@/components/ui/Button";

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
        <Button type="button" variant="danger" onClick={onRetry} className="mt-3">
          Thử lại
        </Button>
      )}
    </div>
  );
}
