export function PermissionDenied({ message = "Bạn không có quyền xem nội dung này." }: { message?: string }) {
  return (
    <div className="rounded-card border border-warning-100 bg-warning-50 p-4 text-warning-700">
      <p className="font-semibold">Không đủ quyền truy cập</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}
