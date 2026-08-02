interface ClassFormActionsProps {
  isEditing: boolean;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
  submitDisabled: boolean;
  onCancel?: () => void;
}

export function ClassFormActions({
  isEditing,
  isError,
  isPending,
  isSuccess,
  submitDisabled,
  onCancel,
}: ClassFormActionsProps) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:px-5">
      <div aria-live="polite" className="min-h-5 text-xs">
        {isError && <p role="alert" className="font-semibold text-danger-700">Không thể lưu lớp học. Vui lòng thử lại.</p>}
        {isSuccess && !isEditing && <p className="font-semibold text-success-700">Đã tạo lớp học.</p>}
        {!isError && !(isSuccess && !isEditing) && <p className="text-neutral-500">Các trường có dấu * là bắt buộc.</p>}
      </div>
      <div className="flex gap-2">
        {onCancel && <Button type="button" onClick={onCancel}>Hủy</Button>}
        <Button type="submit" variant="primary" loading={isPending} loadingLabel="Đang lưu lớp học" disabled={submitDisabled}>
          {isEditing ? "Lưu thay đổi" : "Tạo lớp học"}
        </Button>
      </div>
    </footer>
  );
}
import { Button } from "@/components/ui/Button";
