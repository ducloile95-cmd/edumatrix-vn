import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  listViewerNotifications,
  markNotificationsRead,
} from "@/services/firestore/notifications";

export function useViewerNotifications() {
  const { firebaseUser, userDoc } = useAuth();
  const queryClient = useQueryClient();
  const uid = firebaseUser?.uid ?? "";
  const studentIds = userDoc?.studentIds ?? [];
  const queryKey = ["viewer-notifications", uid, studentIds] as const;
  const notifications = useQuery({
    queryKey,
    queryFn: () => listViewerNotifications(uid, studentIds),
    enabled: Boolean(uid) && studentIds.length > 0,
  });
  const markRead = useMutation({
    mutationFn: (announcementIds: string[]) => markNotificationsRead(uid, announcementIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...notifications,
    notifications: notifications.data ?? [],
    markRead: (announcementId: string) => markRead.mutate([announcementId]),
    markAllRead: () => markRead.mutate((notifications.data ?? []).filter((item) => !item.isRead).map((item) => item.id)),
    isMarkingRead: markRead.isPending,
  };
}
