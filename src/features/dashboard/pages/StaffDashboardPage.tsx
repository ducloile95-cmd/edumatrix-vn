import { AppShell } from "@/components/layouts/AppShell";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function StaffDashboardPage() {
  return (
    <AppShell>
      <h1>Tổng quan</h1>
      <div className="mt-4">
        <EmptyState
          title="Chưa có dữ liệu để hiển thị"
          description="Dashboard sẽ hiển thị lớp sắp diễn ra, học sinh vắng gần đây, bài tập chưa chấm và hóa đơn chờ xác nhận sau khi các module tương ứng được triển khai (Phase 3+)."
        />
      </div>
    </AppShell>
  );
}
