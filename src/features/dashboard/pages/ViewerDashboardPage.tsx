import { ViewerShell } from "@/components/layouts/ViewerShell";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function ViewerDashboardPage() {
  return (
    <ViewerShell>
      <h1>Tổng quan</h1>
      <div className="mt-4">
        <EmptyState
          title="Chưa có dữ liệu để hiển thị"
          description="Lịch học tiếp theo, bài tập đến hạn và điểm gần nhất sẽ hiển thị ở đây sau khi Admin/Giáo viên thêm học sinh vào lớp (Phase 10)."
        />
      </div>
    </ViewerShell>
  );
}
