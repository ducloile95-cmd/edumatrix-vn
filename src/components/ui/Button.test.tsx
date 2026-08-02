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
});
