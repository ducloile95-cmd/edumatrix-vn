import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Composer } from "@/features/announcements/components/fanpage/Composer";
import { PostQueueList } from "@/features/announcements/components/fanpage/PostQueueList";
import { listFanpagePosts } from "@/services/firestore/fanpagePosts";

type Sub = "compose" | "queue";

interface FanpagePanelProps {
  configured: boolean;
  actorUid: string;
  actorName: string;
}

export function FanpagePanel({ configured, actorUid, actorName }: FanpagePanelProps) {
  const [sub, setSub] = useState<Sub>("compose");
  // Cung queryKey voi PostQueueList - react-query dung chung cache, chi de lay so dem cho badge tab.
  const posts = useQuery({ queryKey: ["fanpage-posts"], queryFn: listFanpagePosts });
  const pendingCount = (posts.data ?? []).filter((post) => post.status === "scheduled").length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 p-3 sm:p-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 inline-grid grid-flow-col gap-0.5 rounded-input bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setSub("compose")}
            className={`min-h-9 rounded-[7px] px-4 text-xs font-bold ${sub === "compose" ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500"}`}
          >
            Soạn bài
          </button>
          <button
            type="button"
            onClick={() => setSub("queue")}
            className={`flex min-h-9 items-center gap-1.5 rounded-[7px] px-4 text-xs font-bold ${sub === "queue" ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500"}`}
          >
            Hàng chờ &amp; Lịch sử
            {pendingCount > 0 && (
              <span className="flex min-w-[17px] items-center justify-center rounded-full bg-warning-500 px-1 text-3xs font-extrabold text-white">{pendingCount}</span>
            )}
          </button>
        </div>

        {sub === "compose"
          ? <Composer configured={configured} actorUid={actorUid} actorName={actorName} />
          : <PostQueueList actorUid={actorUid} actorName={actorName} />}
      </div>
    </div>
  );
}
