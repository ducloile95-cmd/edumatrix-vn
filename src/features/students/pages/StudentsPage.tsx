import { useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { StudentForm } from "@/features/students/components/StudentForm";
import { StudentsList } from "@/features/students/components/StudentsList";
import type { StudentDoc } from "@/types/academic";

export default function StudentsPage() {
  const [editingStudent, setEditingStudent] = useState<(StudentDoc & { id: string }) | null>(null);

  return (
    <AppShell>
      <h1>Học sinh</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Quản lý hồ sơ học sinh và gán tài khoản Phụ huynh liên kết.
      </p>

      <div className="mt-5">
        <StudentForm editingStudent={editingStudent} onDone={() => setEditingStudent(null)} />
      </div>

      <div className="mt-6 rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5">
        <h2 className="mb-1">Danh sách học sinh</h2>
        <StudentsList onEdit={setEditingStudent} />
      </div>
    </AppShell>
  );
}
