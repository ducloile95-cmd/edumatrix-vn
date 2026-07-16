import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateNotificationPrefs } from "@/services/firestore/users";

interface NotificationItem {
  key: string;
  title: string;
  description: string;
}

const NOTIFICATION_ITEMS: NotificationItem[] = [
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

  const mutation = useMutation({
    mutationFn: (nextPrefs: Record<string, boolean>) => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return updateNotificationPrefs(firebaseUser.uid, nextPrefs);
    },
  });

  function toggle(key: string) {
    mutation.mutate({ ...prefs, [key]: !(prefs[key] ?? true) });
  }

  return (
    <div className="divide-y divide-neutral-100">
      {NOTIFICATION_ITEMS.map((item) => {
        const enabled = prefs[item.key] ?? true;
        return (
          <div key={item.key} className="flex items-center justify-between gap-3 py-3 first:pt-0">
            <div>
              <p className="text-sm font-medium text-neutral-800">{item.title}</p>
              <p className="text-xs text-neutral-500">{item.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={item.title}
              onClick={() => toggle(item.key)}
              disabled={mutation.isPending}
              className={`relative h-6 w-10 flex-none rounded-full transition disabled:opacity-50 ${
                enabled ? "bg-primary-500" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
