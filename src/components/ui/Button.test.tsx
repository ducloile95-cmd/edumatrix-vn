// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { Button } from "@/components/ui/Button";

afterEach(cleanup);

describe("Button", () => {
  test("disables repeated actions and announces loading state", () => {
    render(<Button loading loadingLabel="Đang lưu học sinh">Lưu</Button>);

    const button = screen.getByRole("button", { name: "Đang lưu học sinh" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  test("keeps every system variant flat gradient, accessible and API-compatible", () => {
    render(<>
      <Button variant="primary">Lưu</Button>
      <Button variant="secondary">Hủy</Button>
      <Button variant="danger">Xóa</Button>
      <Button variant="ghost">Xem thêm</Button>
    </>);

    expect(screen.getByRole("button", { name: "Lưu" }).className).toContain("bg-gradient-to-br");
    expect(screen.getByRole("button", { name: "Hủy" }).className).toContain("from-white");
    expect(screen.getByRole("button", { name: "Xóa" }).className).toContain("from-danger-500");
    expect(screen.getByRole("button", { name: "Xem thêm" }).className).toContain("to-neutral-100/80");
    expect(screen.getByRole("button", { name: "Lưu" }).className).toContain("shadow-none");
  });
});
