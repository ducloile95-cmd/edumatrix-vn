import {
  type DeletionPreflight,
} from "@/services/firestore/deletionDependencies";

export function DeletionPreflightPanel({
  error,
  loading,
  report,
}: {
  error: boolean;
  loading: boolean;
  report?: DeletionPreflight;
}) {
  if (loading) {
    return <p role="status" className="rounded-input bg-neutral-50 px-3 py-2 text-sm text-neutral-600">Đang kiểm tra dữ liệu liên quan...</p>;
  }
  if (error || !report) {
    return <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-700">Không kiểm tra được dữ liệu liên quan. Hệ thống sẽ không cho phép xóa.</p>;
  }
  if (report.allowed) {
    return <p className="rounded-input bg-success-50 px-3 py-2 text-sm font-semibold text-success-700">Không còn dữ liệu liên quan. Có thể xóa cứng bản ghi này.</p>;
  }
  return (
    <div role="alert" className="rounded-input border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-900">
      <p className="font-semibold">Không thể xóa vì còn {report.total} liên kết:</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {report.blockers.map((blocker) => <li key={blocker.key}>{blocker.label}: {blocker.count}</li>)}
      </ul>
    </div>
  );
}
