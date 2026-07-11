import { useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { ClassForm } from "@/features/classes/components/ClassForm";
import { ClassesList } from "@/features/classes/components/ClassesList";
import type { ClassDoc } from "@/types/academic";

export default function ClassesPage() {
  const [editingClass, setEditingClass] = useState<(ClassDoc & { id: string }) | null>(null);

  return (
    <AppShell>
      <h1>Lớp học</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Tạo lớp, gắn khóa học/môn học/giáo viên. Ghi danh học sinh ở trang chi tiết lớp.
      </p>

      <div className="mt-5">
        <ClassForm editingClass={editingClass} onDone={() => setEditingClass(null)} />
      </div>

      <div className="mt-6 rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5">
        <h2 className="mb-1">Danh sách lớp học</h2>
        <ClassesList onEdit={setEditingClass} />
      </div>
    </AppShell>
  );
}
