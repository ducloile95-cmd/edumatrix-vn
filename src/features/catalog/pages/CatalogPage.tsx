import { AppShell } from "@/components/layouts/AppShell";
import { SubjectForm } from "@/features/catalog/components/SubjectForm";
import { SubjectsList } from "@/features/catalog/components/SubjectsList";
import { CourseForm } from "@/features/catalog/components/CourseForm";
import { CoursesList } from "@/features/catalog/components/CoursesList";

export default function CatalogPage() {
  return (
    <AppShell>
      <h1>Môn học &amp; Khóa học</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Quản lý danh mục môn học và khóa học dùng để tạo lớp.
      </p>

      <div className="mt-5">
        <SubjectForm />
      </div>
      <div className="mt-6 rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5">
        <h2 className="mb-1">Danh sách môn học</h2>
        <SubjectsList />
      </div>

      <div className="mt-8">
        <CourseForm />
      </div>
      <div className="mt-6 rounded-card border border-neutral-200 bg-neutral-0 p-4 sm:p-5">
        <h2 className="mb-1">Danh sách khóa học</h2>
        <CoursesList />
      </div>
    </AppShell>
  );
}
