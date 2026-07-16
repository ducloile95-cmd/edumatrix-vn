import { useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { USER_ROLES } from "@/constants/roles";
import { SchoolInfoTab } from "@/features/settings/components/SchoolInfoTab";
import { RolesPermissionsTab } from "@/features/settings/components/RolesPermissionsTab";
import { NotificationsTab } from "@/features/settings/components/NotificationsTab";
import { AppearanceTab } from "@/features/settings/components/AppearanceTab";

type SettingsTab = "school" | "roles" | "notifications" | "appearance";

const ADMIN_TABS: { value: SettingsTab; label: string }[] = [
  { value: "school", label: "Thông tin trường học" },
  { value: "roles", label: "Vai trò & phân quyền" },
  { value: "notifications", label: "Thông báo" },
  { value: "appearance", label: "Giao diện" },
];

// Giao vien chi thay phan lien quan den ca nhan - thong tin truong hoc va phan
// quyen chi Admin duoc sua (khop firestore.rules settings/{docId}: isAdmin()).
const TEACHER_TABS: { value: SettingsTab; label: string }[] = [
  { value: "notifications", label: "Thông báo" },
  { value: "appearance", label: "Giao diện" },
];

export default function SettingsPage() {
  const { role } = useAuth();
  const isAdmin = role === USER_ROLES.ADMIN;
  const tabs = isAdmin ? ADMIN_TABS : TEACHER_TABS;
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabs[0].value);

  return (
    <AppShell>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-neutral-200" role="tablist" aria-label="Điều hướng cài đặt">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`relative min-h-touch shrink-0 px-4 text-sm font-semibold transition ${
              activeTab === tab.value ? "text-primary-700" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
            {activeTab === tab.value && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary-500" />}
          </button>
        ))}
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        {activeTab === "school" && isAdmin && <SchoolInfoTab />}
        {activeTab === "roles" && isAdmin && <RolesPermissionsTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "appearance" && <AppearanceTab />}
      </div>
    </AppShell>
  );
}
