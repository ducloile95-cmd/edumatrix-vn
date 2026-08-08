import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { LessonPlanForm } from "@/features/lesson-plans/components/LessonPlanForm";
import { CourseCurriculumWorkspace } from "@/features/lesson-plans/components/CourseCurriculumWorkspace";
import { StandardLessonLibrary } from "@/features/lesson-plans/components/StandardLessonLibrary";
import { TeachingSessionWorkspace } from "@/features/lesson-plans/components/TeachingSessionWorkspace";
import type { LessonPlanDoc } from "@/types/academic";

export default function LessonPlansPage() {
  const [searchParams, setSearchParams] = useState(() => new URLSearchParams(window.location.search));
  const activeWorkspace = searchParams.get("workspace") || "teaching";

  const [formOpen, setFormOpen] = useState(() => searchParams.get("create") === "lesson-plan");
  const [editingPlan, setEditingPlan] = useState<(LessonPlanDoc & { id: string }) | null>(null);
  const [initialSession, setInitialSession] = useState<any>(null);

  useEffect(() => {
    const handlePopState = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const changeWorkspace = (ws: string) => {
    const newParams = new URLSearchParams(window.location.search);
    newParams.set("workspace", ws);
    window.history.pushState({}, "", `${window.location.pathname}?${newParams.toString()}`);
    setSearchParams(newParams);
  };

  function openCreate() {
    setEditingPlan(null);
    setInitialSession(null);
    setFormOpen(true);
  }

  function openCreateForSession(session: any) {
    setEditingPlan(null);
    setInitialSession(session);
    setFormOpen(true);
  }

  function openEdit(plan: LessonPlanDoc & { id: string }) {
    setEditingPlan(plan);
    setInitialSession(null);
    setFormOpen(true);
  }

  function handleDone() {
    setFormOpen(false);
    setEditingPlan(null);
    setInitialSession(null);
  }

  // Pre-fill fields for standard vs session lesson plan in mode
  const formInitialValues = initialSession
    ? {
        classId: initialSession.classId,
        sessionId: initialSession.id,
        courseId: initialSession.courseId || null,
        isStandardLesson: false,
      }
    : activeWorkspace === "library"
    ? {
        isStandardLesson: true,
      }
    : undefined;

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      {/* Workspace Tabs Header */}
      <div className="shrink-0 bg-white border-b border-neutral-200 px-6 pt-4">
        <h1 className="text-xl font-bold text-neutral-800 mb-2">Quản lý Giáo án & Học liệu</h1>
        <Tabs label="Lesson Plan Workspaces">
          <Tab active={activeWorkspace === "teaching"} onClick={() => changeWorkspace("teaching")}>
            Buổi dạy & Giáo án
          </Tab>
          <Tab active={activeWorkspace === "library"} onClick={() => changeWorkspace("library")}>
            Thư viện bài học chuẩn
          </Tab>
          <Tab active={activeWorkspace === "curriculum"} onClick={() => changeWorkspace("curriculum")}>
            Chương trình khóa
          </Tab>
        </Tabs>
      </div>

      {/* Workspace Content */}
      <div className="flex-1 min-h-0 flex flex-col bg-neutral-50">
        {activeWorkspace === "teaching" && (
          <TeachingSessionWorkspace
            onEditLessonPlan={openEdit}
            onCreateLessonPlan={openCreateForSession}
          />
        )}
        {activeWorkspace === "library" && (
          <StandardLessonLibrary
            onEdit={openEdit}
            onCreateNew={openCreate}
          />
        )}
        {activeWorkspace === "curriculum" && (
          <CourseCurriculumWorkspace />
        )}
      </div>

      {/* Editor Modal */}
      <Modal
        open={formOpen}
        onClose={handleDone}
        size="2xl"
        bodyClassName="flex flex-col overflow-hidden"
        title={editingPlan ? "Sửa giáo án" : "Soạn giáo án mới"}
      >
        <LessonPlanForm
          editingPlan={editingPlan}
          onDone={handleDone}
          {...(formInitialValues ? { initialValues: formInitialValues } : {})}
        />
      </Modal>
    </div>
  );
}
