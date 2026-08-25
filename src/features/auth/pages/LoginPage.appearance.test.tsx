// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/features/auth/pages/LoginPage";
import { AppearanceProvider } from "@/features/preferences/AppearanceContext";
import { APPEARANCE_STORAGE_KEY } from "@/features/preferences/appearance";

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ isSignedIn: false, loading: false }) }));
vi.mock("@/services/firebase/auth", () => ({
  activateAccount: vi.fn(),
  authErrorMessage: vi.fn(),
  resetPassword: vi.fn(),
  signInEmail: vi.fn(),
  signInGoogle: vi.fn(),
}));

describe("LoginPage appearance controls", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("edumatrix_welcomed", "1");
    document.documentElement.className = "";
    document.documentElement.lang = "vi";
  });

  it("changes language from the legal footer without exposing a theme control", async () => {
    const { unmount } = render(
      <MemoryRouter>
        <AppearanceProvider>
          <LoginPage />
        </AppearanceProvider>
      </MemoryRouter>,
    );

    const languageControl = screen.getByRole("radiogroup", { name: "Ngôn ngữ" });
    expect(screen.queryByRole("radiogroup", { name: "Giao diện" })).toBeNull();
    fireEvent.click(within(languageControl).getByRole("radio", { name: "EN" }));

    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}")).toEqual({ theme: "light", language: "en" });
    unmount();
  });
});
