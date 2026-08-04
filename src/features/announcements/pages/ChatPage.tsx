import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import {
  ConnectionBar,
  Conversations,
  UtilityTemplatesModal,
} from "@/features/announcements/components/ChatWorkspace";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listChatThreads } from "@/services/firestore/chat";

export default function ChatPage() {
  const { firebaseUser, userDoc } = useAuth();
  const role = userDoc?.role === "admin" ? "admin" : "teacher";
  const uid = firebaseUser?.uid ?? "";
  const configured = Boolean(import.meta.env.VITE_MESSENGER_WORKER_URL?.trim());
  const initialPickerOpen = new URLSearchParams(window.location.search).get("create") === "message";
  const [newMessageSignal, setNewMessageSignal] = useState(0);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const threads = useQuery({ queryKey: ["chat-threads", role, uid], queryFn: () => listChatThreads(role, uid), enabled: Boolean(uid) });

  return (
    <>
      <div className="flex h-[calc(100dvh-112px)] min-h-[620px] flex-col overflow-hidden rounded-[18px] border border-neutral-200/80 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,.45)]">
        <ConnectionBar configured={configured} onOpenTemplates={() => setTemplatesOpen(true)} onNewMessage={() => setNewMessageSignal((signal) => signal + 1)} />
        {threads.isLoading ? <div className="p-5"><LoadingSkeleton rows={7} /></div> : threads.isError ? <div className="p-5"><ErrorState message="Không tải được hội thoại." onRetry={() => threads.refetch()} /></div> : <Conversations threads={threads.data ?? []} configured={configured} initialPickerOpen={initialPickerOpen} newMessageSignal={newMessageSignal} />}
      </div>
      <UtilityTemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} role={role} />
    </>
  );
}
