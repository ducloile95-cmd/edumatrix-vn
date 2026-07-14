import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StudentForm } from "@/features/students/components/StudentForm";
import { StudentsList } from "@/features/students/components/StudentsList";
import type { StudentDoc } from "@/types/academic";

export default function StudentsPage() {
  const [editingStudent, setEditingStudent] = useState<(StudentDoc & { id: string }) | null>(null);
  const [open, setOpen] = useState(false);

  const openCreate = () => { setEditingStudent(null); setOpen(true); };
  const openEdit = (student: StudentDoc & { id: string }) => { setEditingStudent(student); setOpen(true); };

  return (
    <AppShell>
      <PageHeader title="Học sinh" description="Quản lý hồ sơ học sinh và gán tài khoản phụ huynh liên kết." actions={<button type="button" onClick={openCreate} className="inline-flex min-h-touch items-center gap-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(35,72,214,.25)] transition active:scale-[.98]">
          <Plus size={18} />Thêm học sinh
        </button>} />

      <div className="glass-panel mt-5 rounded-2xl border border-white/70 p-4 sm:p-5">
        <h2 className="mb-1">Danh sách học sinh</h2>
        <StudentsList onEdit={openEdit} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} size="md"
        title={editingStudent ? `Sửa học sinh ${editingStudent.studentCode}` : "Thêm học sinh"}
        description={editingStudent ? undefined : "Nhập thông tin để tạo hồ sơ học sinh mới."}>
        <StudentForm editingStudent={editingStudent} onDone={() => setOpen(false)} />
      </Modal>
    </AppShell>
  );
}
