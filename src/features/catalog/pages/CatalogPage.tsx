import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { SubjectForm } from "@/features/catalog/components/SubjectForm";
import { SubjectsList } from "@/features/catalog/components/SubjectsList";
import { CourseForm } from "@/features/catalog/components/CourseForm";
import { CoursesList } from "@/features/catalog/components/CoursesList";

const addBtn = "inline-flex min-h-touch items-center gap-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(35,72,214,.25)] transition active:scale-[.98]";

export default function CatalogPage() {
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader title="Môn học và khóa học" description="Quản lý danh mục dùng để tạo lớp và tổ chức nội dung học tập." />

      <div className="glass-panel mt-5 rounded-2xl border border-white/70 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2>Danh sách môn học</h2>
          <button type="button" onClick={() => setSubjectOpen(true)} className={addBtn}><Plus size={18} />Thêm môn học</button>
        </div>
        <SubjectsList />
      </div>

      <div className="glass-panel mt-6 rounded-2xl border border-white/70 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2>Danh sách khóa học</h2>
          <button type="button" onClick={() => setCourseOpen(true)} className={addBtn}><Plus size={18} />Thêm khóa học</button>
        </div>
        <CoursesList />
      </div>

      <Modal open={subjectOpen} onClose={() => setSubjectOpen(false)} title="Thêm môn học" description="Tạo môn học mới cho danh mục.">
        <SubjectForm onDone={() => setSubjectOpen(false)} />
      </Modal>
      <Modal open={courseOpen} onClose={() => setCourseOpen(false)} size="lg" title="Thêm khóa học" description="Tạo khóa học và gắn môn học.">
        <CourseForm onDone={() => setCourseOpen(false)} />
      </Modal>
    </AppShell>
  );
}
