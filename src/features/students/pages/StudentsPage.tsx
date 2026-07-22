import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StudentForm } from "@/features/students/components/StudentForm";
import { StudentsList } from "@/features/students/components/StudentsList";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function StudentsPage() {
  const { role } = useAuth();
  const canCreateStudent = role === USER_ROLES.ADMIN;
  const [open, setOpen] = useState(() => canCreateStudent && new URLSearchParams(window.location.search).get("create") === "student");

  return (
    <AppShell>
      {canCreateStudent && (
        <PageHeader actions={<Button variant="primary" icon={<Plus size={17} />} onClick={() => setOpen(true)}>Thêm học sinh</Button>} />
      )}
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
