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
    <>
      {isError && <p role="alert" className="mt-3 text-sm text-danger-700">Không thể lưu lớp học. Vui lòng thử lại.</p>}
      {isSuccess && !isEditing && <p className="mt-3 text-sm text-success-700">Đã tạo lớp học.</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={submitDisabled} className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60">
          {isPending ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo lớp học"}
        </button>
        {isEditing && (
          <button type="button" onClick={onCancel} className="min-h-touch rounded-input border border-neutral-300 px-5 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
            Hủy
          </button>
        )}
      </div>
    </>
  );
}
