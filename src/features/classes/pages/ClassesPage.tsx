import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ClassForm } from "@/features/classes/components/ClassForm";
import { ClassesList } from "@/features/classes/components/ClassesList";
import { deleteClass } from "@/services/firestore/classes";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ClassDoc } from "@/types/academic";

export default function ClassesPage() {
  const [editingClass, setEditingClass] = useState<(ClassDoc & { id: string }) | null>(null);
  const [deletingClass, setDeletingClass] = useState<(ClassDoc & { id: string }) | null>(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canManageClasses = role === USER_ROLES.ADMIN;

  const openCreate = () => { setEditingClass(null); setOpen(true); };
  const openEdit = (klass: ClassDoc & { id: string }) => { setEditingClass(klass); setOpen(true); };
  const deleteMutation = useMutation({
    mutationFn: (classId: string) => deleteClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setDeletingClass(null);
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="Lớp học"
        description="Tạo lớp, gắn khóa học, môn học và giáo viên. Ghi danh học sinh ở trang chi tiết lớp."
        actions={canManageClasses ? (
          <Button variant="primary" onClick={openCreate} icon={<Plus size={18} />}>
            Tạo lớp học
          </Button>
        ) : undefined}
      />

      <div>
        <ClassesList
          onEdit={openEdit}
          onDelete={setDeletingClass}
          canEdit={canManageClasses}
          canDelete={canManageClasses}
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} size="lg"
        title={editingClass ? `Sửa lớp ${editingClass.name}` : "Tạo lớp học"}
        description={editingClass ? undefined : "Điền thông tin lớp và phân công giáo viên."}>
        <ClassForm editingClass={editingClass} onDone={() => setOpen(false)} />
      </Modal>

      <Modal
        open={!!deletingClass}
        onClose={() => setDeletingClass(null)}
        size="sm"
        title="Xóa lớp học?"
        description={
          deletingClass
            ? `Lớp "${deletingClass.name}" sẽ chuyển sang trạng thái đã hủy. Các buổi học tương lai của lớp này cũng sẽ bị hủy.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeletingClass(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => deletingClass && deleteMutation.mutate(deletingClass.id)}
          >
            {deleteMutation.isPending ? "Đang xóa..." : "Xóa lớp"}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
