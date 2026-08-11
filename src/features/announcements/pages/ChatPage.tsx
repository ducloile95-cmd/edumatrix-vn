import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import {
  Conversations,
  UtilityTemplatesModal,
} from "@/features/announcements/components/ChatWorkspace";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listChatThreads, subscribeChatThreads } from "@/services/firestore/chat";
import { syncMessengerThreadContexts } from "@/services/integrations/messenger";

export default function ChatPage() {
  const { firebaseUser, userDoc } = useAuth();
  const role = userDoc?.role === "admin" ? "admin" : "teacher";
  const uid = firebaseUser?.uid ?? "";
  const configured = Boolean(import.meta.env.VITE_MESSENGER_WORKER_URL?.trim());
  const initialPickerOpen = new URLSearchParams(window.location.search).get("create") === "message";
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const queryClient = useQueryClient();
  const threadQueryKey = useMemo(() => ["chat-threads", role, uid] as const, [role, uid]);
  const threads = useQuery({
    queryKey: threadQueryKey,
    queryFn: async () => {
      if (configured) {
        try {
          await syncMessengerThreadContexts();
        } catch (error) {
          console.warn("Messenger context sync failed", error);
        }
      }
      return listChatThreads(role, uid);
    },
    enabled: Boolean(uid),
  });

  useEffect(() => {
    if (!uid) return;
    return subscribeChatThreads(
      role,
      uid,
      (items) => queryClient.setQueryData(threadQueryKey, items),
      (error) => console.warn("Messenger realtime subscription failed", error),
    );
  }, [queryClient, role, threadQueryKey, uid]);

  return (
    <>
      <div className="flex h-[calc(100dvh-112px)] min-h-[620px] flex-col overflow-hidden border border-neutral-200 bg-white">
        {threads.isLoading ? <div className="p-5"><LoadingSkeleton rows={7} /></div> : threads.isError ? <div className="p-5"><ErrorState message="Không tải được hội thoại." onRetry={() => threads.refetch()} /></div> : <Conversations threads={threads.data ?? []} configured={configured} initialPickerOpen={initialPickerOpen} role={role} uid={uid} onOpenTemplates={() => setTemplatesOpen(true)} />}
      </div>
      <UtilityTemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} role={role} />
    </>
  );
}
