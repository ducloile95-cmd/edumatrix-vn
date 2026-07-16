import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LessonPlanList } from "@/features/lesson-plans/components/LessonPlanList";
import { LessonPlanForm } from "@/features/lesson-plans/components/LessonPlanForm";
import type { LessonPlanDoc } from "@/types/academic";

export default function LessonPlansPage() {
  const [formOpen, setFormOpen] = useState(false);
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
    <AppShell>
      <PageHeader
        title="Giáo án"
        description="Soạn giáo án theo mẫu chuyên nghiệp, gắn buổi học thật và theo dõi buổi học còn thiếu giáo án."
        actions={(
          <Button variant="primary" onClick={openCreate} icon={<Plus size={18} />}>
            Soạn giáo án mới
          </Button>
        )}
      />

      <LessonPlanList onEdit={openEdit} onCreateNew={openCreate} />

      <Modal
        open={formOpen}
        onClose={handleDone}
        size="xl"
        bodyClassName="flex flex-col overflow-hidden"
        title={editingPlan ? "Sửa giáo án" : "Soạn giáo án mới"}
        description="Điền thông tin bên trái, soạn tiến trình buổi học bên phải — tất cả trong 1 popup, không chuyển trang."
      >
        <LessonPlanForm editingPlan={editingPlan} onDone={handleDone} />
      </Modal>
    </AppShell>
  );
}
