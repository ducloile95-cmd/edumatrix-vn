import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { linkParentToStudent, setStudentStatus, updateStudent } from "@/services/firestore/students";
import { listUsersByIds, updateParentProfile, type ParentProfileInput } from "@/services/firestore/users";
import type { StudentDoc, StudentStatus } from "@/types/academic";

type StudentWithId = StudentDoc & { id: string };
type Feedback = { tone: "success" | "danger"; message: string } | null;

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
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentAddress, setParentAddress] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentFacebookUrl, setParentFacebookUrl] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [statusDraft, setStatusDraft] = useState<StudentStatus>("active");
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!student || !open) return;
    setFullName(student.fullName);
    setDateOfBirth(student.dateOfBirth);
    setParentEmail("");
    setParentName("");
    setParentAddress("");
    setParentPhone("");
    setParentFacebookUrl("");
    setStaffNote(student.staffNote ?? "");
    setStatusDraft(student.status);
    setFeedback(null);
  }, [open, student]);

  const parentProfilesQuery = useQuery({
    queryKey: ["student-parent-profiles", student?.id, student?.parentUids ?? []],
    queryFn: () => listUsersByIds(student?.parentUids ?? []),
    enabled: open && !!student && student.parentUids.length > 0,
    staleTime: 60_000,
  });

  const primaryParent = parentProfilesQuery.data?.[0] ?? null;

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
      await updateStudent(student.id, { fullName: fullName.trim(), dateOfBirth, staffNote: staffNote.trim() });

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
      queryClient.invalidateQueries({ queryKey: ["student-parent-profiles"] });
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
        className="page-enter grid max-h-[calc(100dvh-2rem)] w-full max-w-[1120px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-modal border border-neutral-200 bg-white shadow-[var(--shadow-4)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-4">
          <div className="min-w-0">
            <h2 id="student-info-title" className="truncate text-xl font-semibold text-neutral-900">
              {student.fullName}
            </h2>
            <p className="mt-1 text-sm font-medium text-neutral-500">
              {student.studentCode} - {student.currentClassIds[0] ?? "Chưa có lớp"}
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

        <form id="student-info-form" onSubmit={submitForm} className="overflow-y-auto">
          <div className="grid gap-4 p-4 lg:grid-cols-[1.05fr_.95fr]">
            <section className="grid content-start gap-4">
              <Panel title="Thông tin học sinh" meta={`students/${student.id}`}>
                <div className="grid gap-3 p-3 sm:grid-cols-2">
                  <Field label="Mã học sinh">
                    <input
                      value={student.studentCode}
                      disabled
                      className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-100 px-3 font-mono text-sm text-neutral-500"
                    />
                  </Field>
                  <Field label="Họ tên">
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </Field>
                  <Field label="Ngày sinh">
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(event) => setDateOfBirth(event.target.value)}
                      className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </Field>
                  <Field label="Ngày bắt đầu">
                    <input
                      value={formatTimestamp(student.createdAt)}
                      disabled
                      className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-100 px-3 text-sm text-neutral-500"
                    />
                  </Field>
                </div>
              </Panel>

              <Panel title="Liên kết phụ huynh" meta={`${student.parentUids.length} tài khoản`}>
                <div className="grid gap-3 p-3">
                  <InfoLine label="UID phụ huynh" value={student.parentUids.length ? student.parentUids.join(", ") : "Chưa liên kết"} mono />
                  {canManageLinks ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Tên phụ huynh">
                        <input
                          value={parentName}
                          onChange={(event) => setParentName(event.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </Field>
                      <Field label="Số điện thoại">
                        <input
                          value={parentPhone}
                          onChange={(event) => setParentPhone(event.target.value)}
                          placeholder="09xxxxxxxx"
                          className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </Field>
                      <Field label="Email liên kết">
                        <input
                          type="email"
                          value={parentEmail}
                          onChange={(event) => setParentEmail(event.target.value)}
                          placeholder="phuhuynh@example.com"
                          className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </Field>
                      <Field label="Link Facebook liên kết">
                        <input
                          type="url"
                          value={parentFacebookUrl}
                          onChange={(event) => setParentFacebookUrl(event.target.value)}
                          placeholder="https://facebook.com/..."
                          className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Địa chỉ">
                          <input
                            value={parentAddress}
                            onChange={(event) => setParentAddress(event.target.value)}
                            placeholder="Số nhà, đường, phường/xã, quận/huyện"
                            className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          />
                        </Field>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-0 overflow-hidden rounded-input border border-neutral-200">
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
              <Panel title="Lớp học và khóa học" meta="linked records">
                <div className="grid gap-0">
                  <InfoLine label="Lớp học" value={student.currentClassIds.length ? student.currentClassIds.join(", ") : "Chưa có lớp"} mono />
                  <InfoLine label="Khóa học" value={student.currentClassIds.length ? "Cần join classes/courses để lấy tên khóa học" : "Chưa cập nhật"} />
                  <InfoLine label="Giáo viên" value={student.teacherIds.length ? student.teacherIds.join(", ") : "Chưa phân giáo viên"} mono />
                  <InfoLine label="Cập nhật gần nhất" value={formatTimestamp(student.updatedAt)} />
                </div>
              </Panel>

              <Panel title="Ghi chú giáo viên/Admin" meta="ghi chú nội bộ">
                <div className="grid gap-2 p-3">
                  <textarea
                    value={staffNote}
                    onChange={(event) => setStaffNote(event.target.value)}
                    placeholder="Nhập ghi chú của giáo viên hoặc Admin về tình hình học tập, trao đổi phụ huynh, lưu ý trong lớp..."
                    className="min-h-[148px] resize-none rounded-input border border-neutral-300 px-3 py-2 text-sm leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="text-xs leading-5 text-neutral-500">
                    Ghi chú này dành cho vận hành nội bộ của Giáo viên/Admin, không phải ghi chú hệ thống.
                  </p>
                </div>
              </Panel>

              {feedback && (
                <div
                  role={feedback.tone === "danger" ? "alert" : "status"}
                  className={`rounded-card border px-4 py-3 text-sm font-medium ${
                    feedback.tone === "success"
                      ? "border-success-100 bg-success-50 text-success-700"
                      : "border-danger-100 bg-danger-50 text-danger-700"
                  }`}
                >
                  {feedback.message}
                </div>
              )}
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
              className={`relative h-9 w-[68px] rounded-full p-1 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive ? "bg-success-500" : "bg-neutral-400"
              }`}
            >
              <span
                className={`absolute top-1 grid size-7 place-items-center rounded-full bg-white text-[10px] font-bold shadow-[0_3px_10px_rgba(28,51,137,.22)] transition-all duration-300 ${
                  isActive ? "left-9 text-success-700" : "left-1 text-neutral-500"
                }`}
              >
                {isActive ? "ON" : "OFF"}
              </span>
            </button>
            <div>
              <p className="text-sm font-semibold text-neutral-900">{isActive ? "Đang học" : "Đã nghỉ"}</p>
              <p className="text-xs text-neutral-500">Gạt để áp dụng trạng thái ngay.</p>
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
