import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase/authClient";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LinkRequestForm } from "@/features/auth/components/LinkRequestForm";
import { subscribeMyLinkRequest, type LinkRequest } from "@/services/firestore/linkRequests";

const MESSAGES: Record<string, string> = {
  email_not_verified: "Email Google của bạn chưa được xác minh. Vui lòng xác minh email rồi đăng nhập lại.",
  no_invite: "Email của bạn chưa được mời vào hệ thống. Vui lòng liên hệ Admin để được cấp quyền.",
  error: "Không thể xác minh lời mời do lỗi kết nối. Vui lòng thử đăng nhập lại.",
};

export default function AccessDeniedPage() {
  const { claimFailureReason, firebaseUser } = useAuth();
  // undefined = dang tai, null = chua tung gui yeu cau.
  const [request, setRequest] = useState<LinkRequest | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  const canDeclare = claimFailureReason === "no_invite" && !!firebaseUser;

  useEffect(() => {
    if (!canDeclare || !firebaseUser) return;
    return subscribeMyLinkRequest(firebaseUser.uid, setRequest);
  }, [canDeclare, firebaseUser]);

  if (!canDeclare || !firebaseUser) {
    return (
      <Shell>
        <Notice
          tone="danger"
          title="Chưa có quyền truy cập"
          body={(claimFailureReason && MESSAGES[claimFailureReason]) || MESSAGES.no_invite}
        />
        <SignOut />
      </Shell>
    );
  }

  if (request === undefined) {
    return <Shell><LoadingSkeleton rows={4} /></Shell>;
  }

  if (request?.status === "pending") {
    return (
      <Shell>
        <Notice
          tone="warning"
          title="Đang chờ trung tâm duyệt"
          body="Trung tâm đang đối chiếu thông tin với hồ sơ học sinh có sẵn. Khi duyệt xong, trang này tự chuyển sang màn hình của bạn — không cần đăng nhập lại."
        />
        <Declared request={request} />
        <SignOut />
      </Shell>
    );
  }

  if (request?.status === "rejected" && !editing) {
    return (
      <Shell>
        <Notice
          tone="danger"
          title="Trung tâm chưa duyệt được"
          body={request.rejectReason || "Thông tin chưa khớp với hồ sơ nào. Vui lòng kiểm tra lại rồi gửi lần nữa."}
        />
        <Declared request={request} />
        <div className="flex justify-end gap-2">
          <Button onClick={() => signOut(auth)}>Đăng xuất</Button>
          <Button variant="primary" onClick={() => setEditing(true)}>Sửa và gửi lại</Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm leading-6 text-neutral-600">
        Tài khoản này chưa được liên kết với học sinh nào. Khai báo thông tin bên dưới để trung tâm kết nối tài khoản với hồ sơ con.
      </p>
      <LinkRequestForm user={firebaseUser} existing={request} onSent={() => setEditing(false)} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-input bg-gradient-to-br from-primary-500 to-primary-700 text-base font-semibold text-white">
            E
          </span>
          <h1 className="text-lg font-semibold text-neutral-900">EduMatrix</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function Notice({ body, title, tone }: { body: string; title: string; tone: "danger" | "warning" }) {
  const styles = tone === "danger"
    ? "border-danger-300 bg-danger-50 text-danger-900"
    : "border-warning-300 bg-warning-50 text-warning-900";
  return (
    <div role="alert" className={`rounded-card border px-4 py-3 ${styles}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6">{body}</p>
    </div>
  );
}

function Declared({ request }: { request: LinkRequest }) {
  return (
    <div className="rounded-card border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold text-neutral-500">Đã khai báo</p>
      <ul className="mt-2 grid gap-1 text-sm text-neutral-700">
        {request.children.map((child, index) => (
          <li key={`${child.fullName}-${index}`}>
            {child.fullName}
            {child.nickname ? ` (${child.nickname})` : ""} · {formatDate(child.dateOfBirth)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function SignOut() {
  return (
    <div className="flex justify-end">
      <Button onClick={() => signOut(auth)}>Đăng xuất</Button>
    </div>
  );
}
