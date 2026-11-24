// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { RescheduleReasonDialog } from "@/features/sessions/components/RescheduleReasonDialog";

afterEach(cleanup);

const request = {
  sessionId: "session-1",
  className: "Lớp A1",
  previousStartAt: new Date(2026, 7, 26, 18, 0),
  previousEndAt: new Date(2026, 7, 26, 19, 30),
  startAt: new Date(2026, 7, 28, 18, 30),
  endAt: new Date(2026, 7, 28, 20, 0),
};

describe("RescheduleReasonDialog", () => {
  test("requires a reason and submits the trimmed parent-facing message", () => {
    const onConfirm = vi.fn();
    render(<RescheduleReasonDialog request={request} isPending={false} isError={false} onCancel={vi.fn()} onConfirm={onConfirm} />);

    const submit = screen.getByRole("button", { name: "Xác nhận đổi lịch" });
    expect(submit).toHaveProperty("disabled", true);
    expect(screen.getByText("Lịch hiện tại")).toBeTruthy();
    expect(screen.getByText("Lịch mới")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Lý do đổi lịch/), { target: { value: "  Giáo viên có lịch công tác.  " } });
    expect(submit).toHaveProperty("disabled", false);
    fireEvent.click(submit);

    expect(onConfirm).toHaveBeenCalledWith("Giáo viên có lịch công tác.");
  });

  test("keeps the reason visible when the update fails", () => {
    render(<RescheduleReasonDialog request={request} isPending={false} isError onCancel={vi.fn()} onConfirm={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Lý do đổi lịch/), { target: { value: "Chuyển phòng học theo yêu cầu trung tâm." } });

    expect(screen.getByRole("alert").textContent).toContain("Lý do đã nhập vẫn được giữ");
    expect(screen.getByLabelText(/Lý do đổi lịch/)).toHaveProperty("value", "Chuyển phòng học theo yêu cầu trung tâm.");
  });
});
