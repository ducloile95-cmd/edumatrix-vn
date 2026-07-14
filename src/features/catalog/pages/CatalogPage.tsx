import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { SubjectForm } from "@/features/catalog/components/SubjectForm";
import { SubjectsList } from "@/features/catalog/components/SubjectsList";
import { CourseForm } from "@/features/catalog/components/CourseForm";
import { CoursesList } from "@/features/catalog/components/CoursesList";

export default function CatalogPage() {
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader title="Môn học và khóa học" description="Quản lý danh mục dùng để tạo lớp và tổ chức nội dung học tập." />

      <div className="mt-5 rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2>Danh sách môn học</h2>
          <Button variant="primary" onClick={() => setSubjectOpen(true)} icon={<Plus size={18} />}>
            Thêm môn học
          </Button>
        </div>
        <SubjectsList />
      </div>

      <div className="mt-6 rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2>Danh sách khóa học</h2>
          <Button variant="primary" onClick={() => setCourseOpen(true)} icon={<Plus size={18} />}>
            Thêm khóa học
          </Button>
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
