import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DeletionPreflightPanel } from "@/components/feedback/DeletionPreflightPanel";
import { useDeletionPreflight } from "@/hooks/useDeletionPreflight";
import { ClassForm } from "@/features/classes/components/ClassForm";
import { ClassesList } from "@/features/classes/components/ClassesList";
import { deleteClass } from "@/services/firestore/classes";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ClassDoc } from "@/types/academic";
import { invalidateSessionQueries } from "@/hooks/queryInvalidation";

export default function ClassesPage() {
  const [editingClass, setEditingClass] = useState<(ClassDoc & { id: string }) | null>(null);
  const [deletingClass, setDeletingClass] = useState<(ClassDoc & { id: string }) | null>(null);
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get("create") === "class");
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canManageClasses = role === USER_ROLES.ADMIN || role === USER_ROLES.TEACHER;
  const canDeleteClasses = role === USER_ROLES.ADMIN;
  const deletePreflight = useDeletionPreflight("class", deletingClass?.id ?? null);

  const openEdit = (klass: ClassDoc & { id: string }) => { setEditingClass(klass); setOpen(true); };
  const deleteMutation = useMutation({
    mutationFn: (classId: string) => deleteClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      invalidateSessionQueries(queryClient);
      setDeletingClass(null);
    },
  });

  const closeDeleteDialog = () => {
    if (deleteMutation.isPending) return;
    setDeletingClass(null);
    deleteMutation.reset();
  };

  return (
    <>
      <ClassesList
        onEdit={openEdit}
        onDelete={canDeleteClasses ? setDeletingClass : undefined}
        canEdit={canManageClasses}
        canDelete={canDeleteClasses}
        primaryAction={canManageClasses ? (
          <Button variant="primary" icon={<Plus size={17} />} onClick={() => { setEditingClass(null); setOpen(true); }}>
            Tạo lớp học
          </Button>
        ) : undefined}
      />

      <Modal open={open} onClose={() => setOpen(false)} size="2xl" bodyClassName="flex flex-col p-0"
        title={editingClass ? `Chỉnh sửa lớp học · ${editingClass.name}` : "Tạo lớp học"}
        description={editingClass ? "Cập nhật thông tin lớp; lịch thông minh hiện tại được giữ nguyên." : "Lịch học thông minh được bật mặc định và hiển thị trực tiếp trong popup."}>
        <ClassForm editingClass={editingClass} onDone={() => setOpen(false)} />
      </Modal>

      <Modal
        open={!!deletingClass}
        onClose={closeDeleteDialog}
        size="sm"
        title="Xóa vĩnh viễn lớp học?"
        description={
          deletingClass
            ? `Lớp "${deletingClass.name}" chỉ được xóa khi không còn học sinh, buổi học hoặc dữ liệu nghiệp vụ liên quan. Hành động này không thể hoàn tác.`
            : undefined
        }
      >
        {deleteMutation.isError && (
          <p role="alert" className="mb-4 rounded-input bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-700">
            {deleteMutation.error instanceof Error && deleteMutation.error.message === "class_not_found"
              ? "Lớp học không còn tồn tại. Hãy tải lại danh sách."
              : deleteMutation.error instanceof Error && deleteMutation.error.message === "DELETION_BLOCKED"
                ? "Dữ liệu liên quan vừa thay đổi. Hệ thống đã dừng thao tác xóa."
              : "Không thể xóa lớp học. Kiểm tra quyền truy cập và thử lại."}
          </p>
        )}
        <DeletionPreflightPanel loading={deletePreflight.isFetching} error={deletePreflight.isError} report={deletePreflight.data} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" disabled={deleteMutation.isPending} onClick={closeDeleteDialog}>
            Giữ lớp học
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending || deletePreflight.isFetching || !deletePreflight.data?.allowed}
            onClick={() => deletingClass && deleteMutation.mutate(deletingClass.id)}
          >
            {deleteMutation.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
