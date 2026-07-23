import { useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { Modal } from "@/components/ui/Modal";
import { Tab, Tabs } from "@/components/ui/Tabs";
import { MotionTabPanel } from "@/components/motion/MotionTabPanel";
import { SubjectForm } from "@/features/catalog/components/SubjectForm";
import { SubjectsList } from "@/features/catalog/components/SubjectsList";
import { CourseForm } from "@/features/catalog/components/CourseForm";
import { CoursesList } from "@/features/catalog/components/CoursesList";
import { CatalogDashboard } from "@/features/catalog/components/CatalogDashboard";
import type { CourseDoc, SubjectDoc } from "@/types/academic";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { USER_ROLES } from "@/constants/roles";

type CatalogTab = "dashboard" | "catalog";

export default function CatalogPage() {
  const { role } = useAuth();
  const isAdmin = role === USER_ROLES.ADMIN;
  const initialCreate = new URLSearchParams(window.location.search).get("create");
  const [tab, setTab] = useState<CatalogTab>(initialCreate ? "catalog" : "dashboard");

  const [courseModalOpen, setCourseModalOpen] = useState(initialCreate === "course");
  const [editingCourse, setEditingCourse] = useState<(CourseDoc & { id: string }) | null>(null);
  const [presetSubjectId, setPresetSubjectId] = useState<string | undefined>(undefined);

  const [subjectModalOpen, setSubjectModalOpen] = useState(initialCreate === "subject");
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
      <Tabs label="Chuyển tab Môn học & khóa học" className="mb-5">
        <Tab active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
          Tổng quan
        </Tab>
        <Tab active={tab === "catalog"} onClick={() => setTab("catalog")}>
          Danh mục
        </Tab>
      </Tabs>

      <MotionTabPanel motionKey={tab}>
        {tab === "dashboard" ? (
          <CatalogDashboard onCreateCourseForSubject={handleCreateCourseForSubject} />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
          <CoursesList
            canManage={isAdmin}
            onEdit={openEditCourse}
            onAdd={() => openCreateCourse()}
            subjectFilter={subjectFilter}
            onClearSubjectFilter={() => setSubjectFilter(null)}
          />
          <SubjectsList
            canManage={isAdmin}
            onEdit={openEditSubject}
            onAdd={openCreateSubject}
            selectedSubjectId={subjectFilter}
            onSelect={handleSelectSubject}
          />
          </div>
        )}
      </MotionTabPanel>

      {isAdmin && <Modal
        open={subjectModalOpen}
        onClose={closeSubjectModal}
        title={editingSubject ? "Sửa môn học" : "Thêm môn học"}
        description={editingSubject ? editingSubject.name : "Tạo môn học mới cho danh mục."}
      >
        <SubjectForm editingSubject={editingSubject} onDone={closeSubjectModal} />
      </Modal>}
      {isAdmin && <Modal
        open={courseModalOpen}
        onClose={closeCourseModal}
        size="lg"
        title={editingCourse ? "Sửa khóa học" : "Thêm khóa học"}
        description={editingCourse ? editingCourse.name : "Tạo khóa học và gắn môn học."}
      >
        <CourseForm editingCourse={editingCourse} presetSubjectId={presetSubjectId} onDone={closeCourseModal} />
      </Modal>}
    </AppShell>
  );
}
