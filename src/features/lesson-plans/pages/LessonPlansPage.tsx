import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { LessonPlanList } from "@/features/lesson-plans/components/LessonPlanList";
import { LessonPlanForm } from "@/features/lesson-plans/components/LessonPlanForm";
import type { LessonPlanDoc } from "@/types/academic";

export default function LessonPlansPage() {
  const [formOpen, setFormOpen] = useState(() => new URLSearchParams(window.location.search).get("create") === "lesson-plan");
  const [editingPlan, setEditingPlan] = useState<(LessonPlanDoc & { id: string }) | null>(null);

  function openCreate() {
    setEditingPlan(null);
    setFormOpen(true);
  }
  function openEdit(plan: LessonPlanDoc & { id: string }) {
    setEditingPlan(plan);
    setFormOpen(true);
  }
  function handleDone() {
    setFormOpen(false);
    setEditingPlan(null);
  }

  return (
    <>
      <LessonPlanList onEdit={openEdit} onCreateNew={openCreate} />

      <Modal
        open={formOpen}
        onClose={handleDone}
        size="2xl"
        bodyClassName="flex flex-col overflow-hidden"
        title={editingPlan ? "Sửa giáo án" : "Soạn giáo án mới"}
      >
        <LessonPlanForm editingPlan={editingPlan} onDone={handleDone} />
      </Modal>
    </>
  );
}
