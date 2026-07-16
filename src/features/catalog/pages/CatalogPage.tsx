import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { MotionTabPanel } from "@/components/motion/MotionTabPanel";
import { SubjectForm } from "@/features/catalog/components/SubjectForm";
import { SubjectsList } from "@/features/catalog/components/SubjectsList";
import { CourseForm } from "@/features/catalog/components/CourseForm";
import { CoursesList } from "@/features/catalog/components/CoursesList";
import { CatalogDashboard } from "@/features/catalog/components/CatalogDashboard";
import type { CourseDoc, SubjectDoc } from "@/types/academic";

type CatalogTab = "dashboard" | "catalog";

export default function CatalogPage() {
  const [tab, setTab] = useState<CatalogTab>("dashboard");

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<(CourseDoc & { id: string }) | null>(null);
  const [presetSubjectId, setPresetSubjectId] = useState<string | undefined>(undefined);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<(SubjectDoc & { id: string }) | null>(null);

  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  function openCreateCourse(forSubjectId?: string) {
    setEditingCourse(null);
    setPresetSubjectId(forSubjectId);
    setCourseModalOpen(true);
  }
  function openEditCourse(course: CourseDoc & { id: string }) {
    setEditingCourse(course);
    setPresetSubjectId(undefined);
    setCourseModalOpen(true);
  }
  function closeCourseModal() {
    setCourseModalOpen(false);
    setEditingCourse(null);
    setPresetSubjectId(undefined);
  }

  function openCreateSubject() {
    setEditingSubject(null);
    setSubjectModalOpen(true);
  }
  function openEditSubject(subject: SubjectDoc & { id: string }) {
    setEditingSubject(subject);
    setSubjectModalOpen(true);
  }
  function closeSubjectModal() {
    setSubjectModalOpen(false);
    setEditingSubject(null);
  }

  function handleCreateCourseForSubject(subjectId: string) {
    setTab("catalog");
    openCreateCourse(subjectId);
  }

  function handleSelectSubject(subjectId: string) {
    setSubjectFilter((current) => (current === subjectId ? null : subjectId));
  }

  return (
    <AppShell>
      <PageHeader
        title="Môn học và khóa học"
        description="Tổng quan chỉ số danh mục và quản lý khóa học gắn với môn học dùng để tạo lớp."
        actions={
          <Button variant="primary" onClick={() => openCreateCourse()} icon={<Plus size={18} />}>
            Thêm khóa học
          </Button>
        }
      />

      <div className="mb-5 flex gap-1 border-b border-neutral-200" role="tablist" aria-label="Chuyển tab Môn học & khóa học">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "dashboard"}
          onClick={() => setTab("dashboard")}
          className={`min-h-touch border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            tab === "dashboard"
              ? "border-primary-500 text-primary-700"
              : "border-transparent text-neutral-500 hover:text-primary-700"
          }`}
        >
          Tổng quan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "catalog"}
          onClick={() => setTab("catalog")}
          className={`ml-4 min-h-touch border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            tab === "catalog"
              ? "border-primary-500 text-primary-700"
              : "border-transparent text-neutral-500 hover:text-primary-700"
          }`}
        >
          Danh mục
        </button>
      </div>

      <MotionTabPanel motionKey={tab}>
        {tab === "dashboard" ? (
          <CatalogDashboard onCreateCourseForSubject={handleCreateCourseForSubject} />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
          <CoursesList
            onEdit={openEditCourse}
            subjectFilter={subjectFilter}
            onClearSubjectFilter={() => setSubjectFilter(null)}
          />
          <SubjectsList
            onEdit={openEditSubject}
            onAdd={openCreateSubject}
            selectedSubjectId={subjectFilter}
            onSelect={handleSelectSubject}
          />
          </div>
        )}
      </MotionTabPanel>

      <Modal
        open={subjectModalOpen}
        onClose={closeSubjectModal}
        title={editingSubject ? "Sửa môn học" : "Thêm môn học"}
        description={editingSubject ? editingSubject.name : "Tạo môn học mới cho danh mục."}
      >
        <SubjectForm editingSubject={editingSubject} onDone={closeSubjectModal} />
      </Modal>
      <Modal
        open={courseModalOpen}
        onClose={closeCourseModal}
        size="lg"
        title={editingCourse ? "Sửa khóa học" : "Thêm khóa học"}
        description={editingCourse ? editingCourse.name : "Tạo khóa học và gắn môn học."}
      >
        <CourseForm editingCourse={editingCourse} presetSubjectId={presetSubjectId} onDone={closeCourseModal} />
      </Modal>
    </AppShell>
  );
}
