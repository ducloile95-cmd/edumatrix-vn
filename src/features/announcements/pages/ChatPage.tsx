import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, MessageCircle } from "lucide-react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Tab, Tabs } from "@/components/ui/Tabs";
import {
  ConnectionBar,
  Conversations,
  Outbox,
  UtilityTemplatesModal,
} from "@/features/announcements/components/ChatWorkspace";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listChatThreads } from "@/services/firestore/chat";

type Section = "conversations" | "outbox";

export default function ChatPage() {
  const { firebaseUser, userDoc } = useAuth();
  const role = userDoc?.role === "admin" ? "admin" : "teacher";
  const uid = firebaseUser?.uid ?? "";
  const configured = Boolean(import.meta.env.VITE_MESSENGER_WORKER_URL?.trim());
  const initialPickerOpen = new URLSearchParams(window.location.search).get("create") === "message";
  const [section, setSection] = useState<Section>("conversations");
  const [newMessageSignal, setNewMessageSignal] = useState(0);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const threads = useQuery({ queryKey: ["chat-threads", role, uid], queryFn: () => listChatThreads(role, uid), enabled: Boolean(uid) });
  const tabs = [
    { value: "conversations" as const, label: "Hội thoại", icon: MessageCircle },
    { value: "outbox" as const, label: "Nhật ký gửi", icon: History },
  ];

  return (
    <>
      <div className="flex h-[calc(100dvh-112px)] min-h-[620px] flex-col overflow-hidden rounded-[18px] border border-neutral-200/80 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,.45)]">
        <ConnectionBar configured={configured} onOpenTemplates={() => setTemplatesOpen(true)} onNewMessage={() => { setSection("conversations"); setNewMessageSignal((signal) => signal + 1); }} />
        <Tabs label="Nhánh Chat" className="shrink-0 px-3">
          {tabs.map(({ value, label, icon: Icon }) => <Tab key={value} active={section === value} onClick={() => setSection(value)} className="min-h-[50px]"><Icon size={16} />{label}</Tab>)}
        </Tabs>
        {section === "conversations" && (threads.isLoading ? <div className="p-5"><LoadingSkeleton rows={7} /></div> : threads.isError ? <div className="p-5"><ErrorState message="Không tải được hội thoại." onRetry={() => threads.refetch()} /></div> : <Conversations threads={threads.data ?? []} configured={configured} initialPickerOpen={initialPickerOpen} newMessageSignal={newMessageSignal} />)}
        {section === "outbox" && <Outbox role={role} uid={uid} />}
      </div>
      <UtilityTemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} role={role} />
    </>
  );
}
