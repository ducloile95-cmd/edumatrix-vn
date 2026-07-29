import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, UserPlus } from "lucide-react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  approveLinkRequest, listPendingLinkRequests, rejectLinkRequest,
  type ChildDecision, type LinkRequest,
} from "@/services/firestore/linkRequests";
import { suggestMatches } from "@/utils/studentMatch";
import { studentLabel } from "@/utils/student";
import type { StudentDoc } from "@/types/academic";

type Student = StudentDoc & { id: string };

const FIELD = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

export function LinkRequestsPanel({ students }: { students: Student[] }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["link-requests", "pending"], queryFn: () => listPendingLinkRequests() });

  if (query.isLoading) return <div className="rounded-card border border-neutral-200 bg-white p-5"><LoadingSkeleton rows={6} /></div>;
  if (query.isError) return <ErrorState message="Không tải được danh sách yêu cầu liên kết." onRetry={() => query.refetch()} />;

  const requests = query.data ?? [];
  if (!requests.length) {
    return <EmptyState title="Chưa có yêu cầu nào" description="Yêu cầu của phụ huynh tự khai báo sẽ hiện ở đây để Admin đối chiếu và duyệt." />;
  }

  return (
    <div className="grid gap-3">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          students={students}
          onDone={() => client.invalidateQueries({ queryKey: ["link-requests", "pending"] })}
        />
      ))}
    </div>
  );
}

function RequestCard({ onDone, request, students }: { onDone: () => void; request: LinkRequest; students: Student[] }) {
  const { firebaseUser } = useAuth();
  const [decisions, setDecisions] = useState<Array<ChildDecision | undefined>>(() => request.children.map(() => undefined));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const client = useQueryClient();
  const approve = useMutation({
    mutationFn: () => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return approveLinkRequest(firebaseUser, request, decisions as ChildDecision[]);
    },
    onSuccess: () => { client.invalidateQueries({ queryKey: ["users"] }); client.invalidateQueries({ queryKey: ["students"] }); onDone(); },
  });
  const reject = useMutation({
    mutationFn: () => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return rejectLinkRequest(firebaseUser, request.id, reason.trim());
    },
    onSuccess: onDone,
  });

  const decided = decisions.every(Boolean);
  const pending = approve.isPending || reject.isPending;

  function decide(index: number, decision: ChildDecision | undefined) {
    setDecisions((current) => current.map((item, position) => (position === index ? decision : item)));
  }

  return (
    <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(28,51,137,.04)]">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">{request.parentName}</h3>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          {request.relationship} · {request.email} · {request.phone}
        </p>
      </div>

      <div className="grid gap-3 p-4">
        {request.children.map((child, index) => (
          <ChildRow
            key={`${child.fullName}-${index}`}
            child={child}
            decision={decisions[index]}
            students={students}
            onDecide={(decision) => decide(index, decision)}
          />
        ))}

        {rejecting && (
          <div className="grid gap-2 rounded-input border border-danger-300 bg-danger-50 p-3">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-danger-700">Lý do từ chối (phụ huynh sẽ đọc được)</span>
              <input
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Không tìm thấy học sinh nào trùng ngày sinh đã khai."
                className={FIELD}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setRejecting(false)}>Huỷ</Button>
              <Button size="sm" variant="danger" disabled={!reason.trim() || pending} onClick={() => reject.mutate()}>
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        )}

        {(approve.isError || reject.isError) && (
          <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">
            Không thực hiện được. Kiểm tra mã học sinh có bị trùng không rồi thử lại.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3">
          {!decided && (
            <span className="mr-auto text-xs text-neutral-500">
              Cần quyết định cho tất cả {request.children.length} con trước khi duyệt.
            </span>
          )}
          {!rejecting && <Button disabled={pending} onClick={() => setRejecting(true)}>Từ chối</Button>}
          <Button variant="primary" icon={<Check size={16} />} disabled={!decided || pending} onClick={() => approve.mutate()}>
            {approve.isPending ? "Đang duyệt..." : "Duyệt"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ChildRow({
  child, decision, onDecide, students,
}: {
  child: LinkRequest["children"][number];
  decision: ChildDecision | undefined;
  onDecide: (decision: ChildDecision | undefined) => void;
  students: Student[];
}) {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const suggestions = suggestMatches(child, students);

  return (
    <div className="rounded-input border border-neutral-200 p-3">
      <p className="text-sm font-semibold text-neutral-900">
        {child.fullName}{child.nickname ? ` (${child.nickname})` : ""}
      </p>
      <p className="mt-0.5 text-xs text-neutral-500">
        Sinh {child.dateOfBirth}{child.note ? ` · ${child.note}` : ""}
      </p>

      {decision ? (
        <div className="mt-3 flex items-center gap-2 rounded-input bg-success-50 px-3 py-2">
          <Check size={15} className="text-success-700" aria-hidden="true" />
          <span className="text-sm text-success-700">
            {decision.mode === "existing"
              ? `Gán vào hồ sơ ${decision.studentId}`
              : `Tạo hồ sơ mới, mã ${decision.studentCode.trim().toUpperCase()}`}
          </span>
          <Button size="sm" className="ml-auto" onClick={() => { onDecide(undefined); setCreating(false); setCode(""); }}>
            Đổi
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {suggestions.map(({ reasons, student }) => (
            <div key={student.id} className="flex flex-wrap items-center gap-2 rounded-input border border-neutral-200 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-900">{studentLabel(student)}</p>
                <p className="text-xs text-neutral-500">{student.id} · sinh {student.dateOfBirth}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {reasons.map((text) => (
                  <span key={text} className="rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-semibold text-primary-700">{text}</span>
                ))}
              </div>
              <Button size="sm" className="ml-auto" onClick={() => onDecide({ mode: "existing", studentId: student.id })}>Gán</Button>
            </div>
          ))}

          {!suggestions.length && (
            <p className="text-xs text-neutral-500">Không có hồ sơ nào khớp. Tạo hồ sơ mới hoặc từ chối để phụ huynh khai lại.</p>
          )}

          {creating ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid flex-1 gap-1">
                <span className="text-xs font-semibold text-neutral-500">Mã học sinh mới</span>
                <input type="text" value={code} onChange={(event) => setCode(event.target.value)} placeholder="HS001" className={FIELD} />
              </label>
              <Button size="sm" onClick={() => setCreating(false)}>Huỷ</Button>
              <Button size="sm" variant="primary" disabled={!code.trim()} onClick={() => onDecide({ mode: "new", studentCode: code })}>
                Dùng mã này
              </Button>
            </div>
          ) : (
            <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setCreating(true)}>Tạo hồ sơ mới</Button>
          )}
        </div>
      )}
    </div>
  );
}
