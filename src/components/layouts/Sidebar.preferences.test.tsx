// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/layouts/Sidebar";
import { AppearanceProvider } from "@/features/preferences/AppearanceContext";
import { APPEARANCE_STORAGE_KEY } from "@/features/preferences/appearance";
import type { UserRole } from "@/types/user";

const authState = vi.hoisted(() => ({ role: "admin" as UserRole }));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    role: authState.role,
    userDoc: { role: authState.role, displayName: "Minh Anh" },
  }),
}));
vi.mock("@/components/layouts/SidebarClockWeather", () => ({ SidebarClockWeather: () => null }));
vi.mock("@/services/firebase/authClient", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));

describe("Sidebar account preferences", () => {
  afterEach(cleanup);

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.lang = "vi";
  });

  it.each<UserRole>(["admin", "teacher", "viewer"])("applies the same system-wide controls for the %s role", async (role) => {
    authState.role = role;
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AppearanceProvider>
          <Sidebar collapsed={false} mobileOpen={false} onClose={vi.fn()} onToggle={vi.fn()} />
        </AppearanceProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Minh Anh/ }));
    expect(screen.getByText("Thông tin tài khoản")).toBeTruthy();

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Giao diện" })).getByRole("radio", { name: "Tối" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Ngôn ngữ" })).getByRole("radio", { name: "EN" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}")).toEqual({ theme: "dark", language: "en" });
  });
});
