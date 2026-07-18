import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listStudents } from "@/services/firestore/students";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { registerLeave } from "@/services/firestore/attendance";
import { formatSessionLabel } from "@/utils/lessonPlan";
import type { AttendanceStatus } from "@/types/academic";

interface RegisterLeaveFormProps {
  onDone?: () => void;
}

type LeaveType = Extract<AttendanceStatus, "absent" | "excused">;

const INPUT = "min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500";
const TEXTAREA = "min-h-20 w-full rounded-input border border-neutral-300 p-3 text-sm focus:border-primary-500";
const LABEL = "mb-1 block text-sm font-medium text-neutral-700";

/**
 * Dang ky nghi hoc truoc cho 1 hoc sinh - single-action, dat trong Modal
 * (khong lam tab, giong pattern Form giao an) - xem
 * docs/archive/KE-HOACH-TONG-QUAN-DIEM-DANH-16-07-2026.md muc 6.
 */
export function RegisterLeaveForm({ onDone }: RegisterLeaveFormProps) {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("excused");
  const [note, setNote] = useState("");

  const { data: students } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const selectedStudent = students?.find((item) => item.id === studentId);
  const classId = selectedStudent?.currentClassIds[0] ?? "";

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
      setSessionId("");
      setLeaveType("excused");
      setNote("");
      onDone?.();
    },
  });

  function onSelectStudent(value: string) {
    setStudentId(value);
    setSessionId("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="leave-student" className={LABEL}>
          Học sinh<span className="ml-0.5 text-danger-500">*</span>
        </label>
        <select id="leave-student" className={INPUT} value={studentId} onChange={(event) => onSelectStudent(event.target.value)}>
          <option value="">-- Chọn học sinh --</option>
          {students?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName} · {item.studentCode}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="leave-session" className={LABEL}>
          Buổi học<span className="ml-0.5 text-danger-500">*</span>{" "}
          <span className="text-xs font-normal text-neutral-500">lọc theo lớp học sinh đang học</span>
        </label>
        <select
          id="leave-session"
          className={INPUT}
          disabled={!classId}
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
        >
          <option value="">-- Chọn buổi học sắp tới --</option>
          {sessions?.map((item) => (
            <option key={item.id} value={item.id}>
              {formatSessionLabel(item)}
            </option>
          ))}
        </select>
        {classId && sessions?.length === 0 && (
          <p className="mt-1 text-xs text-neutral-500">Lớp này chưa có buổi học sắp tới trong 60 ngày tới.</p>
        )}
      </div>

      <div>
        <p className={LABEL}>Loại nghỉ</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setLeaveType("excused")}
            className={`min-h-touch rounded-input border text-sm font-semibold transition ${
              leaveType === "excused" ? "border-info-500 bg-info-50 text-info-700" : "border-neutral-300 text-neutral-600 hover:border-info-300"
            }`}
          >
            Có phép
          </button>
          <button
            type="button"
            onClick={() => setLeaveType("absent")}
            className={`min-h-touch rounded-input border text-sm font-semibold transition ${
              leaveType === "absent" ? "border-danger-500 bg-danger-50 text-danger-700" : "border-neutral-300 text-neutral-600 hover:border-danger-300"
            }`}
          >
            Không phép
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="leave-note" className={LABEL}>
          Lý do
        </label>
        <textarea
          id="leave-note"
          className={TEXTAREA}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="VD: Xin nghỉ vì ốm, có giấy bác sĩ"
        />
      </div>

      {mutation.isError && <p role="alert" className="text-sm text-danger-700">Không thể lưu đăng ký. Vui lòng thử lại.</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" onClick={() => onDone?.()}>
          Hủy
        </Button>
        <Button type="submit" variant="primary" disabled={!studentId || !sessionId || mutation.isPending}>
          {mutation.isPending ? "Đang lưu..." : "Lưu đăng ký"}
        </Button>
      </div>
    </form>
  );
}
