import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClassForm } from "@/features/classes/components/ClassForm";
import { ClassesList } from "@/features/classes/components/ClassesList";
import { deleteClass } from "@/services/firestore/classes";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ClassDoc } from "@/types/academic";

export default function ClassesPage() {
  const [editingClass, setEditingClass] = useState<(ClassDoc & { id: string }) | null>(null);
  const [deletingClass, setDeletingClass] = useState<(ClassDoc & { id: string }) | null>(null);
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get("create") === "class");
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canManageClasses = role === USER_ROLES.ADMIN || role === USER_ROLES.TEACHER;
  const canDeleteClasses = role === USER_ROLES.ADMIN;

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
      {canManageClasses && (
        <PageHeader actions={<Button variant="primary" icon={<Plus size={17} />} onClick={() => { setEditingClass(null); setOpen(true); }}>Tạo lớp học</Button>} />
      )}
      <div>
        <ClassesList
          onEdit={openEdit}
          onDelete={canDeleteClasses ? setDeletingClass : undefined}
          canEdit={canManageClasses}
          canDelete={canDeleteClasses}
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
