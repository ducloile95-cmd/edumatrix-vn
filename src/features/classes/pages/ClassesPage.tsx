import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ClassForm } from "@/features/classes/components/ClassForm";
import { ClassesList } from "@/features/classes/components/ClassesList";
import type { ClassDoc } from "@/types/academic";

export default function ClassesPage() {
  const [editingClass, setEditingClass] = useState<(ClassDoc & { id: string }) | null>(null);
  const [open, setOpen] = useState(false);

  const openCreate = () => { setEditingClass(null); setOpen(true); };
  const openEdit = (klass: ClassDoc & { id: string }) => { setEditingClass(klass); setOpen(true); };

  return (
    <AppShell>
      <PageHeader
        title="Lớp học"
        description="Tạo lớp, gắn khóa học, môn học và giáo viên. Ghi danh học sinh ở trang chi tiết lớp."
        actions={(
          <Button variant="primary" onClick={openCreate} icon={<Plus size={18} />}>
            Tạo lớp học
          </Button>
        )}
      />

      <div className="mt-5 rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1">Danh sách lớp học</h2>
        <ClassesList onEdit={openEdit} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} size="lg"
        title={editingClass ? `Sửa lớp ${editingClass.name}` : "Tạo lớp học"}
        description={editingClass ? undefined : "Điền thông tin lớp và phân công giáo viên."}>
        <ClassForm editingClass={editingClass} onDone={() => setOpen(false)} />
      </Modal>
    </AppShell>
  );
}
