import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tab, Tabs } from "@/components/ui/Tabs";
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
        actions={(
          <Button variant="primary" onClick={() => setLeaveModalOpen(true)} icon={<Plus size={18} />}>
            Đăng ký nghỉ học
          </Button>
        )}
      />

      <Tabs label="Chuyển tab Điểm danh" className="mb-5">
        <Tab active={tab === "overview"} onClick={() => setTab("overview")}>
          Tổng quan
        </Tab>
        <Tab active={tab === "mark"} onClick={() => setTab("mark")}>
          Điểm danh theo buổi
        </Tab>
      </Tabs>

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
