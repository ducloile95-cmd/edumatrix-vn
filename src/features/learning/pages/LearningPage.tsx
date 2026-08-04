import { useState } from "react";
import { useSearchParams } from "react-router";
import AssignmentsPage from "@/features/assignments/pages/AssignmentsPage";
import ScoresPage from "@/features/scores/pages/ScoresPage";
import { LearningOverview } from "@/features/learning/components/LearningOverview";
import { MotionTabPanel } from "@/components/motion/MotionTabPanel";
import { Tab, Tabs } from "@/components/ui/Tabs";

type LearningTab = "overview" | "assignments" | "gradebook";

export default function LearningPage() {
  const [gradebookDirty, setGradebookDirty] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: LearningTab = requestedTab === "assignments" || requestedTab === "gradebook" ? requestedTab : "overview";

  function selectTab(nextTab: LearningTab) {
    if (tab === "gradebook" && nextTab !== "gradebook" && gradebookDirty && !window.confirm("Bạn có thay đổi điểm chưa lưu. Rời Sổ điểm và bỏ các thay đổi này?")) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", nextTab);
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <Tabs label="Bài tập và điểm học tập" className="mb-5">
        <Tab active={tab === "overview"} onClick={() => selectTab("overview")}>
          Tổng quan
        </Tab>
        <Tab active={tab === "assignments"} onClick={() => selectTab("assignments")}>
          Bài tập
        </Tab>
        <Tab active={tab === "gradebook"} onClick={() => selectTab("gradebook")}>
          Sổ điểm
        </Tab>
      </Tabs>

      <MotionTabPanel motionKey={tab}>
        {tab === "overview" && <LearningOverview onOpenAssignments={() => selectTab("assignments")} />}
        {tab === "assignments" && <AssignmentsPage embedded />}
        {tab === "gradebook" && <ScoresPage embedded onDirtyChange={setGradebookDirty} />}
      </MotionTabPanel>
    </>
  );
}
