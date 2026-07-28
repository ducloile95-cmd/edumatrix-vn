import { format } from "date-fns";
import { Send, Undo2 } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { DeliveryRow } from "@/features/classroom/components/ClassroomInteractionUi";
import { formatSessionSummaryMessage, type ClassroomStudentEntry, type PublishStudentResult } from "@/services/firestore/classroomInteractions";
import type { listStudents } from "@/services/firestore/students";

type Student = Awaited<ReturnType<typeof listStudents>>[number];
type MutationState = { isPending: boolean; isError: boolean; mutate: () => void };

interface ClassroomParentViewProps {
  active: boolean;
  blockers: string[];
  className: string;
  classStudents: Student[];
  entries: Record<string, ClassroomStudentEntry>;
  homeworkText: string;
  isAmended: boolean;
  isPublished: boolean;
  previewStudent?: Student;
  publish: Pick<MutationState, "isPending" | "isError">;
  publishedAt: Date;
  publishResults: PublishStudentResult[];
  quickSummary: string;
  reopen: MutationState;
  resend: MutationState;
  sessionStartAt: Date;
  setPreviewStudentId: (studentId: string) => void;
  setPublishConfirmOpen: (open: boolean) => void;
  taughtContent: string;
}

export function ClassroomParentView({
  active,
  blockers,
  className,
  classStudents,
  entries,
  homeworkText,
  isAmended,
  isPublished,
  previewStudent,
  publish,
  publishedAt,
  publishResults,
  quickSummary,
  reopen,
  resend,
  sessionStartAt,
  setPreviewStudentId,
  setPublishConfirmOpen,
  taughtContent,
}: ClassroomParentViewProps) {
  return (
    <>
{active && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><h2 className="text-lg font-bold text-neutral-950">Xem trước thông báo</h2><select aria-label="Chọn học sinh xem trước" value={previewStudent?.id ?? ""} onChange={(event) => setPreviewStudentId(event.target.value)} className="min-h-10 rounded-input border border-neutral-300 bg-white px-3 text-sm font-semibold">{classStudents.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></div>
            {previewStudent ? <pre className="mt-5 whitespace-pre-wrap rounded-card border border-primary-100 bg-primary-50 p-4 font-sans text-sm leading-6 text-neutral-800">{formatSessionSummaryMessage({
              studentName: previewStudent.fullName,
              className: className,
              sessionStartAt: sessionStartAt,
              entry: entries[previewStudent.id],
              taughtContent,
              quickSummary,
              homeworkText,
              isRepublish: isAmended,
            })}</pre> : <div className="mt-4"><EmptyState title="Chưa có học sinh để xem trước" /></div>}
          </section>
          <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]">
            <h2 className="text-lg font-bold text-neutral-950">Kênh phát hành</h2>
            {isPublished ? (
              <div className="mt-4 space-y-3">
                <p className="rounded-input border border-success-100 bg-success-50 p-3 text-sm font-semibold text-success-700">Đã phát hành cho phụ huynh lúc {format(publishedAt, "HH:mm dd/MM/yyyy")}.</p>
                {publishResults.length > 0 ? (
                  <ul className="space-y-2">
                    {publishResults.map((item) => (
                      <li key={item.studentId} className="flex items-center justify-between gap-3 rounded-input border border-neutral-200 p-3">
                        <div className="min-w-0"><p className="truncate text-sm font-bold text-neutral-900">{item.studentName}</p>{item.detail && <p className="mt-0.5 text-xs text-neutral-500">{item.detail}</p>}</div>
                        <span className={`shrink-0 text-xs font-bold ${item.messenger === "sent" ? "text-success-700" : item.messenger === "skipped" ? "text-neutral-500" : "text-danger-700"}`}>{item.messenger === "sent" ? "Đã gửi Messenger" : item.messenger === "skipped" ? "Chưa cấu hình" : "Gửi thất bại"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-500">Kết quả gửi Messenger của lần phát hành trước không còn trong phiên này. Nếu cần gửi bù, dùng màn hình Chat.</p>
                )}
                {publishResults.some((item) => item.messenger !== "sent") && (
                  <Button className="w-full" disabled={resend.isPending} onClick={() => resend.mutate()}>{resend.isPending ? "Đang gửi lại..." : "Gửi lại cho học sinh còn thiếu"}</Button>
                )}
                <Button variant="secondary" className="w-full" icon={<Undo2 size={15} />} disabled={reopen.isPending} onClick={() => reopen.mutate()}>{reopen.isPending ? "Đang mở lại..." : "Mở lại để đính chính"}</Button>
                {reopen.isError && <p role="alert" className="text-center text-xs font-semibold text-danger-700">Không mở lại được. Vui lòng thử lại.</p>}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <DeliveryRow label="Thông báo Edumatrix" detail={`${classStudents.length} phụ huynh theo hồ sơ học sinh`} status={blockers.length ? "Chưa đủ" : "Sẵn sàng"} />
                <DeliveryRow label="Messenger" detail="Gửi cho phụ huynh đã liên kết sau khi phát hành" status={blockers.length ? "Chưa đủ" : "Sẵn sàng"} />
                {blockers.length > 0 && (
                  <ul className="space-y-1 rounded-input border border-warning-100 bg-warning-50 p-3 text-xs text-warning-800">
                    {blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
                  </ul>
                )}
                <Button className="mt-2 w-full" variant="primary" disabled={blockers.length > 0 || publish.isPending} icon={<Send size={15} />} onClick={() => setPublishConfirmOpen(true)}>{publish.isPending ? "Đang phát hành..." : isAmended ? "Phát hành bản cập nhật" : "Hoàn tất và phát hành"}</Button>
                {publish.isError && <p role="alert" className="text-center text-xs font-semibold text-danger-700">Không phát hành được. Vui lòng kiểm tra kết nối và thử lại.</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
