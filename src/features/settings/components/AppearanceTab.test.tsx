// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AppearanceProvider } from "@/features/preferences/AppearanceContext";
import { APPEARANCE_STORAGE_KEY } from "@/features/preferences/appearance";
import { AppearanceTab } from "@/features/settings/components/AppearanceTab";

describe("AppearanceTab segmented preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.lang = "vi";
  });

  it("applies theme and language directly from the segmented controls", async () => {
    render(
      <AppearanceProvider>
        <AppearanceTab />
      </AppearanceProvider>,
    );

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Giao diện" })).getByRole("radio", { name: "Tối" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Ngôn ngữ" })).getByRole("radio", { name: "EN" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));

    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}")).toEqual({ theme: "dark", language: "en" });
  });
});
