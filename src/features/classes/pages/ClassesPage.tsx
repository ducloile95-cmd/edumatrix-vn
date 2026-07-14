import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
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
      <PageHeader title="Lớp học" description="Tạo lớp, gắn khóa học, môn học và giáo viên. Ghi danh học sinh ở trang chi tiết lớp." actions={<button type="button" onClick={openCreate} className="inline-flex min-h-touch items-center gap-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(35,72,214,.25)] transition active:scale-[.98]">
          <Plus size={18} />Tạo lớp học
        </button>} />

      <div className="glass-panel mt-5 rounded-2xl border border-white/70 p-4 sm:p-5">
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
