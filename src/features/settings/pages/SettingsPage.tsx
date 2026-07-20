import { useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { USER_ROLES } from "@/constants/roles";
import { NotificationsTab } from "@/features/settings/components/NotificationsTab";
import { AppearanceTab } from "@/features/settings/components/AppearanceTab";
import SettingsAdminPage from "@/features/settings/pages/SettingsAdminPage";
import { Tab, Tabs } from "@/components/ui/Tabs";

type PersonalTab = "notifications" | "appearance";

export default function SettingsPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<PersonalTab>("notifications");

  return (
    <AppShell>
      {role === USER_ROLES.ADMIN ? <SettingsAdminPage /> : (
        <div>
          <Tabs label="Cài đặt cá nhân" className="mb-4">
            {([{ value: "notifications", label: "Thông báo" }, { value: "appearance", label: "Giao diện" }] as const).map((tab) => (
              <Tab key={tab.value} active={activeTab === tab.value} onClick={() => setActiveTab(tab.value)}>{tab.label}</Tab>
            ))}
          </Tabs>
          <div className="rounded-card border border-neutral-200 bg-white p-5">
            {activeTab === "notifications" ? <NotificationsTab /> : <AppearanceTab />}
          </div>
        </div>
      )}
    </AppShell>
  );
}
