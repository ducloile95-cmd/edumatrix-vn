// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { useState } from "react";
import { ConfirmProvider } from "@/components/feedback/ConfirmProvider";
import { useConfirm } from "@/components/feedback/confirmContext";

function Harness() {
  const confirm = useConfirm();
  const [result, setResult] = useState("chưa trả lời");
  return (
    <>
      <button type="button" onClick={async () => setResult(String(await confirm({ title: "Xóa tag?", confirmLabel: "Xóa" })))}>Hỏi</button>
      <output>{result}</output>
    </>
  );
}

afterEach(cleanup);

describe("ConfirmProvider", () => {
  test("resolves true when the user confirms", async () => {
    render(<ConfirmProvider><Harness /></ConfirmProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Hỏi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("true"));
  });

  test("resolves false when the user cancels", async () => {
    render(<ConfirmProvider><Harness /></ConfirmProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Hỏi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("false"));
  });
});
