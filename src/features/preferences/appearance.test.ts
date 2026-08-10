// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  applyAppearancePreferences,
  loadAppearancePreferences,
  persistAppearancePreferences,
} from "@/features/preferences/appearance";

describe("appearance preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
  });

  it("uses safe defaults for missing or invalid stored preferences", () => {
    expect(loadAppearancePreferences()).toEqual({ theme: "light", language: "vi" });
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ theme: "system", language: "fr" }));
    expect(loadAppearancePreferences()).toEqual({ theme: "light", language: "vi" });
  });

  it("persists and applies dark English preferences to the document", () => {
    const preferences = { theme: "dark" as const, language: "en" as const };
    persistAppearancePreferences(preferences);
    applyAppearancePreferences(preferences);

    expect(loadAppearancePreferences()).toEqual(preferences);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});
