import { useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layouts/AppShell";
import AssignmentsPage from "@/features/assignments/pages/AssignmentsPage";
import ScoresPage from "@/features/scores/pages/ScoresPage";
import { LearningOverview } from "@/features/learning/components/LearningOverview";
import { MotionTabPanel } from "@/components/motion/MotionTabPanel";

type LearningTab = "overview" | "assignments" | "gradebook";

export default function LearningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: LearningTab = requestedTab === "assignments" || requestedTab === "gradebook" ? requestedTab : "overview";

  function selectTab(nextTab: LearningTab) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", nextTab);
    setSearchParams(next, { replace: true });
  }

  return (
    <AppShell>
      <div className="mb-5 flex gap-1 border-b border-neutral-200" role="tablist" aria-label="Bài tập và điểm học tập">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          onClick={() => selectTab("overview")}
          className={`min-h-touch border-b-2 px-1 pb-2 text-sm font-semibold transition ${tab === "overview" ? "border-primary-500 text-primary-700" : "border-transparent text-neutral-500 hover:text-primary-700"}`}
        >
          Tổng quan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assignments"}
          onClick={() => selectTab("assignments")}
          className={`ml-4 min-h-touch border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            tab === "assignments"
              ? "border-primary-500 text-primary-700"
              : "border-transparent text-neutral-500 hover:text-primary-700"
          }`}
        >
          Bài tập
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "gradebook"}
          onClick={() => selectTab("gradebook")}
          className={`ml-4 min-h-touch border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            tab === "gradebook"
              ? "border-primary-500 text-primary-700"
              : "border-transparent text-neutral-500 hover:text-primary-700"
          }`}
        >
          Sổ điểm
        </button>
      </div>

      <MotionTabPanel motionKey={tab}>
        {tab === "overview" && <LearningOverview onOpenAssignments={() => selectTab("assignments")} />}
        {tab === "assignments" && <AssignmentsPage embedded />}
        {tab === "gradebook" && <ScoresPage embedded />}
      </MotionTabPanel>
    </AppShell>
  );
}
