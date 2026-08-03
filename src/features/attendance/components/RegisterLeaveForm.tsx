import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses } from "@/services/firestore/classes";
import { listStudents } from "@/services/firestore/students";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { registerLeave } from "@/services/firestore/attendance";
import { formatSessionLabel } from "@/utils/lessonPlan";
import type { AttendanceStatus } from "@/types/academic";

interface RegisterLeaveFormProps {
  onDone?: () => void;
}

type LeaveType = Extract<AttendanceStatus, "absent" | "excused">;

const INPUT = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500";
const TEXTAREA = `${INPUT} min-h-[116px] resize-none py-3 leading-6`;
const LABEL = "mb-1.5 block text-xs font-bold text-neutral-700";
const SECTION = "min-w-0 overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(28,51,137,.04)]";

/**
 * Dang ky nghi hoc truoc cho 1 hoc sinh - single-action, dat trong Modal
 * (khong lam tab, giong pattern Form giao an) - xem
 * docs/archive/KE-HOACH-TONG-QUAN-DIEM-DANH-16-07-2026.md muc 6.
 */
export function RegisterLeaveForm({ onDone }: RegisterLeaveFormProps) {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("excused");
  const [note, setNote] = useState("");

  const { data: students } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const selectedStudent = students?.find((item) => item.id === studentId);
  const eligibleClasses = classes?.filter((item) => selectedStudent?.currentClassIds.includes(item.id)) ?? [];
  const soleClassId = eligibleClasses.length === 1 ? eligibleClasses[0].id : "";

  useEffect(() => {
    if (soleClassId) setClassId(soleClassId);
  }, [soleClassId]);

  const { data: sessions } = useQuery({
    queryKey: ["sessions-by-class", classId, "leave"],
    queryFn: () => listSessionsByClass(classId, new Date(), addDays(new Date(), 60), 50),
    enabled: !!classId,
  });

  const mutation = useMutation({
    mutationFn: () => registerLeave(sessionId, classId, studentId, leaveType, note, firebaseUser?.uid ?? "unknown"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] });
      setStudentId("");
      setClassId("");
      setSessionId("");
      setLeaveType("excused");
      setNote("");
      onDone?.();
    },
  });

  function onSelectStudent(value: string) {
    setStudentId(value);
    setClassId("");
    setSessionId("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]"
    >
      <section className={SECTION} aria-labelledby="leave-schedule-heading">
        <SectionHeader
          id="leave-schedule-heading"
          title="Học sinh và buổi nghỉ"
          description="Chọn theo thứ tự học sinh, lớp học và buổi học sắp tới."
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="leave-student" className={LABEL}>
              Học sinh<RequiredMark />
            </label>
            <select id="leave-student" required className={INPUT} value={studentId} onChange={(event) => onSelectStudent(event.target.value)}>
              <option value="">Chọn học sinh</option>
              {students?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName} - {item.studentCode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="leave-class" className={LABEL}>
              Lớp học<RequiredMark />
            </label>
            <select
              id="leave-class"
              required
              className={INPUT}
              disabled={!studentId}
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setSessionId("");
              }}
            >
              <option value="">Chọn lớp học</option>
              {eligibleClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {studentId && eligibleClasses.length === 0 && (
              <p className="mt-1.5 text-xs leading-5 text-danger-700">Học sinh chưa thuộc lớp nào mà tài khoản này được quản lý.</p>
            )}
          </div>

          <div>
            <label htmlFor="leave-session" className={LABEL}>
              Buổi học sắp tới<RequiredMark />
            </label>
            <select
              id="leave-session"
              required
              className={INPUT}
              disabled={!classId}
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
            >
              <option value="">Chọn buổi học</option>
              {sessions?.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatSessionLabel(item)}
                </option>
              ))}
            </select>
            {classId && sessions?.length === 0 && (
              <p className="mt-1.5 text-xs leading-5 text-neutral-500">Chưa có buổi học trong 60 ngày tới.</p>
            )}
          </div>
        </div>
      </section>

      <section className={SECTION} aria-labelledby="leave-details-heading">
        <SectionHeader
          id="leave-details-heading"
          title="Nội dung đăng ký"
          description="Xác nhận loại nghỉ và ghi chú để giáo viên theo dõi."
        />
        <div className="grid gap-4 p-4">
          <fieldset>
            <legend className={LABEL}>Loại nghỉ</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={leaveType === "excused"}
                onClick={() => setLeaveType("excused")}
                className={`min-h-touch rounded-input border px-3 text-sm font-bold transition active:scale-[.98] ${
                  leaveType === "excused" ? "border-info-500 bg-info-50 text-info-700 ring-1 ring-info-100" : "border-neutral-300 bg-white text-neutral-600 hover:border-info-300 hover:bg-info-50/50"
                }`}
              >
                Có phép
              </button>
              <button
                type="button"
                aria-pressed={leaveType === "absent"}
                onClick={() => setLeaveType("absent")}
                className={`min-h-touch rounded-input border px-3 text-sm font-bold transition active:scale-[.98] ${
                  leaveType === "absent" ? "border-danger-500 bg-danger-50 text-danger-700 ring-1 ring-danger-100" : "border-neutral-300 bg-white text-neutral-600 hover:border-danger-300 hover:bg-danger-50/50"
                }`}
              >
                Không phép
              </button>
            </div>
          </fieldset>

          <div>
            <label htmlFor="leave-note" className={LABEL}>Lý do hoặc ghi chú</label>
            <textarea
              id="leave-note"
              className={TEXTAREA}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: Học sinh nghỉ ốm, có giấy xác nhận."
            />
          </div>
        </div>
      </section>

      {mutation.isError && <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700 lg:col-span-full">Không thể lưu đăng ký. Vui lòng thử lại.</p>}

      <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end lg:col-span-full">
        <Button type="button" onClick={() => onDone?.()}>
          Hủy
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={mutation.isPending}
          loadingLabel="Đang lưu đăng ký"
          disabled={!studentId || !classId || !sessionId}
        >
          Lưu đăng ký
        </Button>
      </div>
    </form>
  );
}

function SectionHeader({ description, id, title }: { description: string; id: string; title: string }) {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
      <h3 id={id} className="text-sm font-bold text-neutral-900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
    </div>
  );
}

function RequiredMark() {
  return (
    <>
      <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>
      <span className="sr-only"> (bắt buộc)</span>
    </>
  );
}
