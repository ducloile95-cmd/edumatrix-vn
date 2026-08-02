// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";
import { canUseViewTransition, runViewTransition } from "@/utils/viewTransition";

afterEach(() => vi.restoreAllMocks());

describe("viewTransition", () => {
  test("uses the native transition when motion is allowed", () => {
    const update = vi.fn();
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: false })) });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: vi.fn((callback: () => void) => { callback(); return {}; }) });

    expect(canUseViewTransition()).toBe(true);
    runViewTransition(update);

    expect(document.startViewTransition).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  test("updates without a transition for reduced motion", () => {
    const update = vi.fn();
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: true })) });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: vi.fn() });

    runViewTransition(update);

    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
  });
});
