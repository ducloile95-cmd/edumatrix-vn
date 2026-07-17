import { useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { USER_ROLES } from "@/constants/roles";
import { NotificationsTab } from "@/features/settings/components/NotificationsTab";
import { AppearanceTab } from "@/features/settings/components/AppearanceTab";
import SettingsAdminPage from "@/features/settings/pages/SettingsAdminPage";

type PersonalTab = "notifications" | "appearance";

export default function SettingsPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<PersonalTab>("notifications");

  return (
    <AppShell>
      {role === USER_ROLES.ADMIN ? <SettingsAdminPage /> : (
        <div>
          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-neutral-200" role="tablist" aria-label="Cài đặt cá nhân">
            {([{ value: "notifications", label: "Thông báo" }, { value: "appearance", label: "Giao diện" }] as const).map((tab) => (
              <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value} onClick={() => setActiveTab(tab.value)} className={`relative min-h-touch shrink-0 px-4 text-sm font-semibold ${activeTab === tab.value ? "text-primary-700" : "text-neutral-500"}`}>{tab.label}{activeTab === tab.value && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary-500" />}</button>
            ))}
          </div>
          <div className="rounded-card border border-neutral-200 bg-white p-5">
            {activeTab === "notifications" ? <NotificationsTab /> : <AppearanceTab />}
          </div>
        </div>
      )}
    </AppShell>
  );
}
