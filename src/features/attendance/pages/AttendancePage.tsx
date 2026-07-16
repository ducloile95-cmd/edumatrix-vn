import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MotionTabPanel } from "@/components/motion/MotionTabPanel";
import { AttendanceOverview } from "@/features/attendance/components/AttendanceOverview";
import { AttendanceMarkPanel } from "@/features/attendance/components/AttendanceMarkPanel";
import { RegisterLeaveForm } from "@/features/attendance/components/RegisterLeaveForm";

type AttendanceTab = "overview" | "mark";

export default function AttendancePage() {
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get("session");
  const [tab, setTab] = useState<AttendanceTab>(sessionParam ? "mark" : "overview");
  const [presetSessionId, setPresetSessionId] = useState(sessionParam ?? "");
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  function jumpToSession(sessionId: string) {
    setPresetSessionId(sessionId);
    setTab("mark");
  }

  return (
    <AppShell>
      <PageHeader
        title="Điểm danh"
        description="Tổng quan chuyên cần toàn hệ thống, cảnh báo buổi chưa điểm danh và học sinh nghỉ không phép nhiều — cộng với luồng điểm danh theo buổi."
        actions={(
          <Button variant="primary" onClick={() => setLeaveModalOpen(true)} icon={<Plus size={18} />}>
            Đăng ký nghỉ học
          </Button>
        )}
      />

      <div className="mb-5 flex gap-1 border-b border-neutral-200" role="tablist" aria-label="Chuyển tab Điểm danh">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          onClick={() => setTab("overview")}
          className={`min-h-touch border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            tab === "overview" ? "border-primary-500 text-primary-700" : "border-transparent text-neutral-500 hover:text-primary-700"
          }`}
        >
          Tổng quan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mark"}
          onClick={() => setTab("mark")}
          className={`ml-4 min-h-touch border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            tab === "mark" ? "border-primary-500 text-primary-700" : "border-transparent text-neutral-500 hover:text-primary-700"
          }`}
        >
          Điểm danh theo buổi
        </button>
      </div>

      <MotionTabPanel motionKey={tab}>
        {tab === "overview" ? (
          <AttendanceOverview onJumpToSession={jumpToSession} />
        ) : (
          <AttendanceMarkPanel presetSessionId={presetSessionId} />
        )}
      </MotionTabPanel>

      <Modal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Đăng ký nghỉ học"
        description="Ghi nhận trước cho 1 học sinh — không ảnh hưởng các bạn cùng lớp, tự hiện đúng khi điểm danh buổi đó."
      >
        <RegisterLeaveForm onDone={() => setLeaveModalOpen(false)} />
      </Modal>
    </AppShell>
  );
}
