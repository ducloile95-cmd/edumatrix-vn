import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateNotificationPrefs } from "@/services/firestore/users";

interface NotificationItem {
  key: string;
  title: string;
  description: string;
}

const NOTIFICATION_ITEMS: NotificationItem[] = [
  { key: "notificationSound", title: "Âm thanh thông báo mới", description: "Phát âm báo khi có tin nhắn Messenger hoặc thông báo hệ thống mới" },
  { key: "newInvoiceEmail", title: "Email khi có hóa đơn mới", description: "Gửi cho phụ huynh ngay khi hóa đơn được tạo" },
  { key: "absenceEmail", title: "Email khi học sinh vắng không phép", description: "Gửi cho phụ huynh trong ngày điểm danh" },
  { key: "sessionReminder", title: "Nhắc lịch dạy trước 30 phút", description: "Thông báo cho giáo viên trước buổi học" },
  { key: "weeklyDigest", title: "Tóm tắt hoạt động mỗi tuần", description: "Gửi qua email vào sáng thứ Hai" },
];

/**
 * Tab "Thông báo" - doc/ghi truc tiep users/{uid}.notificationPrefs. userDoc
 * den tu onSnapshot trong AuthContext nen tu cap nhat sau khi ghi xong,
 * khong can invalidate cache thu cong.
 */
export function NotificationsTab() {
  const { firebaseUser, userDoc } = useAuth();
  const prefs = userDoc?.notificationPrefs ?? {};

  // Gui kem `key` de biet dung hang nao dang ghi: chi khoa + hien trang thai lac
  // quan cho hang do, thay vi lam mo ca 5 nut gat.
  const mutation = useMutation({
    mutationFn: ({ nextPrefs }: { key: string; nextPrefs: Record<string, boolean> }) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return updateNotificationPrefs(firebaseUser.uid, nextPrefs);
    },
  });
  const pending = mutation.isPending ? mutation.variables : undefined;

  function toggle(key: string) {
    mutation.mutate({ key, nextPrefs: { ...prefs, [key]: !(prefs[key] ?? true) } });
  }

  return (
    <div className="divide-y divide-neutral-100">
      {NOTIFICATION_ITEMS.map((item) => {
        const optimistic = pending?.key === item.key ? pending?.nextPrefs[item.key] : undefined;
        const busy = optimistic !== undefined;
        const enabled = optimistic ?? prefs[item.key] ?? true;
        return (
          <div key={item.key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800">{item.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-neutral-500">{item.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={item.title}
              onClick={() => toggle(item.key)}
              disabled={busy}
              className={`relative h-6 w-10 flex-none rounded-full transition-colors outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-[.96] disabled:cursor-progress ${
                enabled ? "bg-primary-600" : "bg-neutral-300"
              }`}
              style={{ transitionDuration: "var(--motion-duration)" }}
            >
              <span
                aria-hidden="true"
                className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,.25)] transition-transform ${
                  enabled ? "translate-x-4" : "translate-x-0"
                }`}
                style={{ transitionDuration: "var(--motion-duration)" }}
              />
            </button>
          </div>
        );
      })}
      {mutation.isError && (
        <p role="alert" className="pt-3 text-xs font-semibold text-danger-700">
          Không lưu được thiết lập thông báo. Kiểm tra kết nối rồi bật lại.
        </p>
      )}
    </div>
  );
}
