import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StudentForm } from "@/features/students/components/StudentForm";
import { StudentsList } from "@/features/students/components/StudentsList";

export default function StudentsPage() {
  const [open, setOpen] = useState(false);

  const openCreate = () => {
    setOpen(true);
  };

  return (
    <AppShell>
      <PageHeader
        title="Học sinh"
        description="Edumatrix-vn · Quản lý lớp học thông minh"
        actions={(
          <Button variant="primary" onClick={openCreate} icon={<Plus size={18} />}>
            Thêm học sinh
          </Button>
        )}
      />

      <StudentsList />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Thêm học sinh"
        description="Nhập thông tin cơ bản, phụ huynh liên kết và đăng ký lớp học."
      >
        <StudentForm onDone={() => setOpen(false)} />
      </Modal>
    </AppShell>
  );
}
