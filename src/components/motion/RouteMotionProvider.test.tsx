// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import { RouteMotionProvider } from "@/components/motion/RouteMotionProvider";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RouteMotionProvider", () => {
  test("starts a native transition for an internal link", () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: false })) });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: vi.fn((callback: () => void) => { callback(); return {}; }) });
    render(
      <MemoryRouter initialEntries={["/first"]}>
        <RouteMotionProvider>
          <Link to="/second">Trang tiếp theo</Link>
          <Routes>
            <Route path="/first" element={<p>Trang đầu</p>} />
            <Route path="/second" element={<p>Trang thứ hai</p>} />
          </Routes>
        </RouteMotionProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Trang tiếp theo" }));

    expect(document.startViewTransition).toHaveBeenCalledOnce();
    expect(screen.getByText("Trang thứ hai")).not.toBeNull();
  });
});
