// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LinkRequestsPanel } from "@/features/users/components/LinkRequestsPanel";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";
import type { StudentDoc } from "@/types/academic";
import type { LinkRequest } from "@/services/firestore/linkRequests";

const serviceMocks = vi.hoisted(() => ({
  listPendingLinkRequests: vi.fn(),
  approveLinkRequest: vi.fn(),
  rejectLinkRequest: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ firebaseUser: { uid: "admin-1" } }) }));
vi.mock("@/services/firestore/linkRequests", () => ({
  listPendingLinkRequests: serviceMocks.listPendingLinkRequests,
  approveLinkRequest: serviceMocks.approveLinkRequest,
  rejectLinkRequest: serviceMocks.rejectLinkRequest,
}));

const students = [
  { id: "HS001", fullName: "Nguyễn Minh Anh", nickname: "Bi", dateOfBirth: "2015-04-02" },
  { id: "HS002", fullName: "Trần Bảo Long", dateOfBirth: "2016-08-08" },
] as unknown as (StudentDoc & { id: string })[];

const twoChildRequest = {
  id: "parent-1",
  email: "ph@gmail.com",
  parentName: "Ngô Thanh Tâm",
  phone: "0912847193",
  relationship: "Bố",
  status: "pending",
  children: [
    { fullName: "Nguyễn Minh Anh", nickname: "Bi", dateOfBirth: "2015-04-02" },
    { fullName: "Hoàng Bảo Khanh", dateOfBirth: "2018-12-01" },
  ],
} as unknown as LinkRequest;

const approveButton = () => screen.getByRole("button", { name: /^Duyệt$/ }) as HTMLButtonElement;

describe("LinkRequestsPanel", () => {
  beforeEach(() => {
    serviceMocks.listPendingLinkRequests.mockResolvedValue([twoChildRequest]);
    serviceMocks.approveLinkRequest.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("nut Duyet bi khoa cho toi khi moi con deu co quyet dinh", async () => {
    renderWithQueryClient(<LinkRequestsPanel students={students} />);
    await screen.findByText("Ngô Thanh Tâm");

    expect(approveButton().disabled).toBe(true);

    // Con thu nhat: gan vao ho so duoc goi y.
    fireEvent.click(screen.getByRole("button", { name: "Gán" }));
    expect(approveButton().disabled).toBe(true);

    // Con thu hai khong co goi y nao -> phai tao ho so moi.
    fireEvent.click(screen.getByRole("button", { name: /Tạo hồ sơ mới/ }));
    fireEvent.change(screen.getByPlaceholderText("HS001"), { target: { value: "hs009" } });
    fireEvent.click(screen.getByRole("button", { name: /Dùng mã này/ }));

    await waitFor(() => expect(approveButton().disabled).toBe(false));
  });

  test("duyet gui dung so quyet dinh, ma hoc sinh moi duoc chuan hoa hoa", async () => {
    renderWithQueryClient(<LinkRequestsPanel students={students} />);
    await screen.findByText("Ngô Thanh Tâm");

    fireEvent.click(screen.getByRole("button", { name: "Gán" }));
    fireEvent.click(screen.getByRole("button", { name: /Tạo hồ sơ mới/ }));
    fireEvent.change(screen.getByPlaceholderText("HS001"), { target: { value: "hs009" } });
    fireEvent.click(screen.getByRole("button", { name: /Dùng mã này/ }));
    await waitFor(() => expect(approveButton().disabled).toBe(false));
    fireEvent.click(approveButton());

    await waitFor(() => expect(serviceMocks.approveLinkRequest).toHaveBeenCalledTimes(1));
    const [, , decisions] = serviceMocks.approveLinkRequest.mock.calls[0];
    expect(decisions).toEqual([
      { mode: "existing", studentId: "HS001" },
      { mode: "new", studentCode: "hs009" },
    ]);
  });

  test("chi goi y ho so that su khop - con thu hai khong co goi y nao", async () => {
    renderWithQueryClient(<LinkRequestsPanel students={students} />);
    await screen.findByText("Ngô Thanh Tâm");
    expect(screen.getAllByRole("button", { name: "Gán" })).toHaveLength(1);
    expect(screen.getByText(/Không có hồ sơ nào khớp/)).toBeDefined();
  });
});
