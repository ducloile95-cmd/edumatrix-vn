import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { linkParentToStudent, setStudentStatus, updateStudent } from "@/services/firestore/students";
import { listUsersByIds, listUsersByRole, updateParentProfile, type ParentProfileInput } from "@/services/firestore/users";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { syncStudentEnrollments } from "@/services/firestore/enrollments";
import type { StudentDoc, StudentStatus } from "@/types/academic";

type StudentWithId = StudentDoc & { id: string };
type Feedback = { tone: "success" | "danger"; message: string } | null;
type RelationKey = "classes" | "courses" | "teachers";
type ClassFilter = { type: "course" | "teacher"; id: string } | null;
const INPUT_CLASS = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

interface StudentInfoDialogProps {
  canManageLinks: boolean;
  open: boolean;
  student: StudentWithId | null;
  onClose: () => void;
}

export function StudentInfoDialog({ canManageLinks, onClose, open, student }: StudentInfoDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentAddress, setParentAddress] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentFacebookUrl, setParentFacebookUrl] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [statusDraft, setStatusDraft] = useState<StudentStatus>("active");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [activeRelation, setActiveRelation] = useState<RelationKey | null>(null);
  const [classFilter, setClassFilter] = useState<ClassFilter>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  useEffect(() => {
    if (!student || !open) return;
    setFullName(student.fullName);
    setNickname(student.nickname ?? "");
    setDateOfBirth(student.dateOfBirth);
    setParentEmail("");
    setParentName("");
    setParentAddress("");
    setParentPhone("");
    setParentFacebookUrl("");
    setStaffNote(student.staffNote ?? "");
    setStatusDraft(student.status);
    setFeedback(null);
    setActiveRelation(null);
    setClassFilter(null);
    setSelectedClassIds(student.currentClassIds);
  }, [open, student]);

  const parentProfilesQuery = useQuery({
    queryKey: ["student-parent-profiles", student?.id, student?.parentUids ?? []],
    queryFn: () => listUsersByIds(student?.parentUids ?? []),
    enabled: open && !!student && student.parentUids.length > 0,
    staleTime: 60_000,
  });

  const primaryParent = parentProfilesQuery.data?.[0] ?? null;

  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: listClasses,
    enabled: open && !!student,
    staleTime: 60_000,
  });
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
    enabled: open && !!student,
    staleTime: 60_000,
  });
  const teacherProfilesQuery = useQuery({
    queryKey: ["student-teacher-profiles", student?.teacherIds ?? []],
    queryFn: () => listUsersByIds(student?.teacherIds ?? []),
    enabled: open && !!student && student.teacherIds.length > 0,
    staleTime: 60_000,
  });
  const allTeachersQuery = useQuery({
    queryKey: ["users", "teacher", "active"],
    queryFn: () => listUsersByRole("teacher"),
    enabled: open && !!student && canManageLinks,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open || !primaryParent) return;
    setParentEmail(primaryParent.email ?? "");
    setParentName(primaryParent.displayName ?? "");
    setParentAddress(primaryParent.address ?? "");
    setParentPhone(primaryParent.phone ?? "");
    setParentFacebookUrl(primaryParent.facebookUrl ?? "");
  }, [open, primaryParent]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")]
        .filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [onClose, open]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      if (canManageLinks) await syncStudentEnrollments(student.id, selectedClassIds);
      await updateStudent(student.id, {
        fullName: fullName.trim(),
        nickname: nickname.trim(),
        dateOfBirth,
        staffNote: staffNote.trim(),
      });

      const email = parentEmail.trim();
      const parentProfile = getParentProfilePayload({
        address: parentAddress,
        displayName: parentName,
        facebookUrl: parentFacebookUrl,
        phone: parentPhone,
      });

      if (canManageLinks && primaryParent && primaryParent.email === email) {
        await updateParentProfile(primaryParent.uid, parentProfile);
      } else if (canManageLinks && email) {
        const result = await linkParentToStudent(student.id, email, parentProfile);
        if (!result.linked) throw new Error(result.reason);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["student-parent-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["student-teacher-profiles"] });
      setFeedback({ tone: "success", message: "Cập nhật thông tin học sinh thành công." });
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getUpdateErrorMessage(error) });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: StudentStatus) => {
      if (!student) return;
      await setStudentStatus(student.id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setFeedback({ tone: "success", message: "Đã cập nhật trạng thái học sinh." });
    },
    onError: () => {
      if (student) setStatusDraft(student.status);
      setFeedback({ tone: "danger", message: "Không cập nhật được trạng thái. Kiểm tra kết nối và thử lại." });
    },
  });

  if (!open || !student) return null;

  const isActive = statusDraft === "active";
  const canSubmit = fullName.trim().length > 0 && !updateMutation.isPending;
  const allClasses = classesQuery.data ?? [];
  const linkedClasses = allClasses.filter((klass) => selectedClassIds.includes(klass.id));
  const courseById = new Map((coursesQuery.data ?? []).map((course) => [course.id, course.name]));
  const linkedCourseIds = [...new Set(linkedClasses.map((klass) => klass.courseId))];
  const classNames = linkedClasses.map((klass) => klass.name);
  const courseNames = [...new Set(linkedClasses.map((klass) => courseById.get(klass.courseId)).filter(Boolean))];
  const linkedTeacherIds = [...new Set(linkedClasses.flatMap((klass) => klass.teacherIds))];
  const availableTeachers = allTeachersQuery.data ?? teacherProfilesQuery.data ?? [];
  const teacherNames = availableTeachers.filter((teacher) => linkedTeacherIds.includes(teacher.uid)).map((teacher) => teacher.displayName);
  const filteredClasses = allClasses.filter((klass) => {
    if (!classFilter) return true;
    if (classFilter.type === "course") return klass.courseId === classFilter.id;
    return klass.teacherIds.includes(classFilter.id);
  });

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    updateMutation.mutate();
  };

  const toggleStatus = () => {
    const nextStatus: StudentStatus = isActive ? "inactive" : "active";
    setStatusDraft(nextStatus);
    setFeedback(null);
    statusMutation.mutate(nextStatus);
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds((current) => current.includes(classId)
      ? current.filter((id) => id !== classId)
      : [...current, classId]);
    setFeedback(null);
  };

  const openClassesWithFilter = (filter: ClassFilter) => {
    setClassFilter(filter);
    setActiveRelation("classes");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-neutral-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-info-title"
        className="page-enter grid max-h-[calc(100dvh-2rem)] w-full max-w-[1120px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-modal border border-neutral-200 bg-white shadow-[var(--shadow-4)] lg:max-w-[1760px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-4">
          <div className="min-w-0">
            <h2 id="student-info-title" className="truncate text-xl font-semibold text-neutral-900">
              {student.fullName}
            </h2>
            <p className="mt-1 text-sm font-medium text-neutral-500">
              {student.studentCode} - {classNames[0] ?? (classesQuery.isLoading ? "Đang tải lớp..." : "Chưa có lớp")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thông tin học sinh"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
          >
            <X size={19} />
          </button>
        </header>

        <form id="student-info-form" onSubmit={submitForm} className="overflow-y-auto bg-neutral-50/70">
          <div data-testid="student-info-layout" className="grid gap-4 p-4 xl:grid-cols-3 xl:items-start">
            <section className="grid content-start gap-4">
              <Panel title="Thông tin học sinh" meta={`students/${student.id}`}>
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <Field label="Mã học sinh"><input aria-label="Mã học sinh" value={student.studentCode} disabled className={`${INPUT_CLASS} bg-neutral-100 font-mono text-neutral-500`} /></Field>
                  <Field label="Tên học sinh"><input aria-label="Tên học sinh" value={fullName} onChange={(event) => setFullName(event.target.value)} className={INPUT_CLASS} required /></Field>
                  <Field label="Biệt danh / tên gọi khác"><input aria-label="Biệt danh / tên gọi khác" value={nickname} onChange={(event) => setNickname(event.target.value)} className={INPUT_CLASS} /></Field>
                  <Field label="Ngày sinh"><input aria-label="Ngày sinh" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className={INPUT_CLASS} required /></Field>
                </div>
              </Panel>
              <Panel title="Ghi chú giáo viên/Admin" meta="Nội bộ">
                <div className="p-4">
                  <Field label="Nội dung ghi chú">
                    <textarea aria-label="Ghi chú giáo viên/Admin" value={staffNote} onChange={(event) => setStaffNote(event.target.value)} placeholder="Tình hình học tập, trao đổi phụ huynh, lưu ý trong lớp..." className={`${INPUT_CLASS} min-h-[150px] resize-y py-3 leading-6`} />
                  </Field>
                </div>
              </Panel>
            </section>

            <section className="grid content-start gap-4">
              <Panel title="Thông tin phụ huynh" meta={`${student.parentUids.length} tài khoản`}>
                <div className="grid gap-3 p-4">
                  <InfoLine label="UID phụ huynh" value={student.parentUids.length ? student.parentUids.join(", ") : "Chưa liên kết"} mono />
                  {canManageLinks ? (
                    <>
                      <Field label="Tên phụ huynh"><input aria-label="Tên phụ huynh" value={parentName} onChange={(event) => setParentName(event.target.value)} placeholder="Nguyễn Văn A" className={INPUT_CLASS} /></Field>
                      <Field label="Số điện thoại"><input aria-label="Số điện thoại" type="tel" value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} placeholder="09xxxxxxxx" className={INPUT_CLASS} /></Field>
                      <Field label="Email liên kết"><input aria-label="Email liên kết" type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} placeholder="phuhuynh@example.com" className={INPUT_CLASS} /></Field>
                      <Field label="Link Facebook liên kết"><input aria-label="Link Facebook liên kết" type="url" value={parentFacebookUrl} onChange={(event) => setParentFacebookUrl(event.target.value)} placeholder="https://facebook.com/..." className={INPUT_CLASS} /></Field>
                      <Field label="Địa chỉ"><input aria-label="Địa chỉ" value={parentAddress} onChange={(event) => setParentAddress(event.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện" className={INPUT_CLASS} /></Field>
                    </>
                  ) : parentProfilesQuery.isError ? (
                    <p role="alert" className="rounded-input bg-danger-50 p-3 text-sm font-medium text-danger-700">Không tải được thông tin phụ huynh.</p>
                  ) : (
                    <div className="overflow-hidden rounded-input border border-neutral-200">
                      <InfoLine label="Tên phụ huynh" value={primaryParent?.displayName ?? "Chưa cập nhật"} />
                      <InfoLine label="Số điện thoại" value={primaryParent?.phone ?? "Chưa cập nhật"} />
                      <InfoLine label="Email liên kết" value={primaryParent?.email ?? "Chưa cập nhật"} />
                      <InfoLine label="Facebook" value={primaryParent?.facebookUrl ?? "Chưa cập nhật"} />
                      <InfoLine label="Địa chỉ" value={primaryParent?.address ?? "Chưa cập nhật"} />
                    </div>
                  )}
                </div>
              </Panel>
            </section>

            <section className="grid content-start gap-4">
              <Panel title="Ghi danh và phân công" meta="Đồng bộ theo lớp">
                <p className="border-b border-neutral-200 px-4 py-3 text-xs leading-5 text-neutral-600">Khóa học và giáo viên được suy ra từ lớp. Chọn một mục để lọc danh sách lớp phù hợp.</p>
                <RelationEditorRow label="Lớp học" value={classNames.join(", ") || "Chưa có lớp"} expanded={activeRelation === "classes"} editable={canManageLinks} onToggle={() => { setActiveRelation((current) => current === "classes" ? null : "classes"); if (activeRelation === "classes") setClassFilter(null); }}>
                  {classFilter && <button type="button" onClick={() => setClassFilter(null)} className="mb-2 min-h-9 rounded-input border border-primary-200 bg-primary-50 px-3 text-xs font-bold text-primary-700">Bỏ bộ lọc</button>}
                  <div role="listbox" aria-label="Danh sách Lớp học" aria-multiselectable="true" className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {filteredClasses.map((klass) => <RelationOption key={klass.id} selected={selectedClassIds.includes(klass.id)} label={klass.name} onClick={() => toggleClass(klass.id)} />)}
                    {!classesQuery.isLoading && filteredClasses.length === 0 && <p className="p-3 text-sm text-neutral-500">Không có lớp phù hợp.</p>}
                  </div>
                </RelationEditorRow>
                <RelationEditorRow label="Khóa học" value={courseNames.join(", ") || "Chưa cập nhật"} expanded={activeRelation === "courses"} editable={canManageLinks} onToggle={() => setActiveRelation((current) => current === "courses" ? null : "courses")}>
                  <div role="listbox" aria-label="Danh sách Khóa học" className="grid gap-1.5">
                    {(coursesQuery.data ?? []).map((course) => <RelationOption key={course.id} selected={linkedCourseIds.includes(course.id)} label={course.name} onClick={() => openClassesWithFilter({ type: "course", id: course.id })} actionLabel="Lọc lớp" />)}
                  </div>
                </RelationEditorRow>
                <RelationEditorRow label="Giáo viên phụ trách" value={teacherNames.join(", ") || "Chưa phân giáo viên"} expanded={activeRelation === "teachers"} editable={canManageLinks} onToggle={() => setActiveRelation((current) => current === "teachers" ? null : "teachers")}>
                  <div role="listbox" aria-label="Danh sách Giáo viên phụ trách" className="grid gap-1.5">
                    {availableTeachers.map((teacher) => <RelationOption key={teacher.uid} selected={linkedTeacherIds.includes(teacher.uid)} label={teacher.displayName} onClick={() => openClassesWithFilter({ type: "teacher", id: teacher.uid })} actionLabel="Lọc lớp" />)}
                  </div>
                </RelationEditorRow>
                <InfoLine label="Cập nhật gần nhất" value={formatTimestamp(student.updatedAt)} />
              </Panel>

              {feedback && <div role={feedback.tone === "danger" ? "alert" : "status"} className={`rounded-card border px-4 py-3 text-sm font-medium ${feedback.tone === "success" ? "border-success-100 bg-success-50 text-success-700" : "border-danger-100 bg-danger-50 text-danger-700"}`}>{feedback.message}</div>}
            </section>
          </div>
        </form>

        <footer className="flex flex-col gap-3 border-t border-neutral-200 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              disabled={statusMutation.isPending}
              onClick={toggleStatus}
              className={`relative h-9 w-[68px] rounded-full p-1 transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive ? "bg-success-500" : "bg-neutral-400"
              }`}
            >
              <span
                className={`absolute left-1 top-1 grid size-7 place-items-center rounded-full bg-white text-3xs font-bold shadow-[0_3px_10px_rgba(28,51,137,.22)] transition-[color,box-shadow,transform] duration-fast ${
                  isActive ? "translate-x-8 text-success-700" : "text-neutral-500"
                }`}
              >
                {isActive ? "ON" : "OFF"}
              </span>
            </button>
            <div>
              <p className="text-sm font-semibold text-neutral-900">{isActive ? "Đang học" : "Đã nghỉ"}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button form="student-info-form" type="submit" variant="primary" disabled={!canSubmit}>
              {updateMutation.isPending ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Panel({ children, meta, title }: { children: ReactNode; meta?: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-neutral-200 bg-white">
      <div className="flex min-h-[42px] items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-3">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {meta && <span className="truncate text-xs font-semibold text-neutral-500">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function InfoLine({ label, mono, value }: { label: string; mono?: boolean; value: string }) {
  return (
    <div className="grid min-h-[44px] grid-cols-[132px_1fr] items-center gap-3 border-b border-neutral-100 px-3 py-2 last:border-b-0">
      <span className="text-xs font-semibold text-neutral-500">{label}</span>
      <span className={`min-w-0 break-words text-sm font-medium text-neutral-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function RelationEditorRow({
  children,
  editable,
  expanded,
  label,
  onToggle,
  value,
}: {
  children: ReactNode;
  editable: boolean;
  expanded: boolean;
  label: string;
  onToggle: () => void;
  value: string;
}) {
  if (!editable) return <InfoLine label={label} value={value} />;

  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex min-h-[58px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-neutral-500">{label}</span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-neutral-900">{value}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary-700">
          <Pencil className="size-3.5" aria-hidden="true" />
          Chỉnh sửa
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {expanded && <div className="border-t border-neutral-100 bg-neutral-50/80 p-3">{children}</div>}
    </div>
  );
}

function RelationOption({
  actionLabel,
  label,
  onClick,
  selected,
}: {
  actionLabel?: string;
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`flex min-h-touch items-center justify-between gap-3 rounded-input border px-3 py-2 text-left text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-primary-500 ${
        selected
          ? "border-primary-200 bg-primary-50 text-primary-800"
          : "border-neutral-200 bg-white text-neutral-800 hover:border-primary-200 hover:bg-primary-50/50"
      }`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {actionLabel ? (
        <span className="shrink-0 text-xs font-bold text-primary-700">{actionLabel}</span>
      ) : (
        <span className={`grid size-5 shrink-0 place-items-center rounded border ${selected ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-300 bg-white"}`}>
          {selected && <Check className="size-3.5" aria-hidden="true" />}
        </span>
      )}
    </button>
  );
}

function getUpdateErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "not_found") return "Không tìm thấy tài khoản phụ huynh theo email đã nhập.";
  if (message === "not_viewer") return "Email này không thuộc tài khoản phụ huynh/học sinh.";
  if (message === "error") return "Không liên kết được phụ huynh. Kiểm tra kết nối và thử lại.";
  return "Không cập nhật được thông tin. Kiểm tra dữ liệu và thử lại.";
}

function getParentProfilePayload(input: ParentProfileInput): ParentProfileInput {
  return {
    address: input.address?.trim() ?? "",
    displayName: input.displayName?.trim() ?? "",
    facebookUrl: input.facebookUrl?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
  };
}

function formatTimestamp(value: StudentDoc["createdAt"]): string {
  return value?.toDate ? value.toDate().toLocaleDateString("vi-VN") : "--";
}
