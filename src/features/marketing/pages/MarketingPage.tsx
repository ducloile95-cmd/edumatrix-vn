import { useAuth } from "@/features/auth/hooks/useAuth";
import { FanpagePanel } from "@/features/marketing/components/fanpage/FanpagePanel";

export default function MarketingPage() {
  const { firebaseUser, userDoc } = useAuth();
  const configured = Boolean(import.meta.env.VITE_MESSENGER_WORKER_URL?.trim());

  return (
    <FanpagePanel
      configured={configured}
      actorUid={firebaseUser?.uid ?? ""}
      actorName={userDoc?.displayName ?? "Admin"}
    />
  );
}
