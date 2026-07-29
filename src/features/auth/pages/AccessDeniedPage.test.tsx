// @vitest-environment jsdom

import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AccessDeniedPage from "@/features/auth/pages/AccessDeniedPage";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";
import type { LinkRequest } from "@/services/firestore/linkRequests";

const authState = vi.hoisted(() => ({
  value: { claimFailureReason: "no_invite" as string | null, firebaseUser: { email: "ph@gmail.com", uid: "parent-1" } },
}));

const serviceMocks = vi.hoisted(() => ({ subscribeMyLinkRequest: vi.fn(), createLinkRequest: vi.fn() }));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => authState.value }));
vi.mock("@/services/firebase/authClient", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/services/firestore/linkRequests", () => ({
  subscribeMyLinkRequest: serviceMocks.subscribeMyLinkRequest,
  createLinkRequest: serviceMocks.createLinkRequest,
}));

/** Gia lap onSnapshot: bao ngay gia tri roi tra ve ham huy. */
function emit(request: LinkRequest | null) {
  serviceMocks.subscribeMyLinkRequest.mockImplementation((_uid: string, cb: (r: LinkRequest | null) => void) => {
    cb(request);
    return () => undefined;
  });
}

const baseRequest = {
  id: "parent-1",
  email: "ph@gmail.com",
  parentName: "Ngô Thanh Tâm",
  phone: "0912847193",
  relationship: "Bố",
  children: [{ fullName: "Nguyễn Minh Anh", nickname: "Bi", dateOfBirth: "2015-04-02" }],
} as unknown as LinkRequest;

describe("AccessDeniedPage", () => {
  beforeEach(() => {
    authState.value = { claimFailureReason: "no_invite", firebaseUser: { email: "ph@gmail.com", uid: "parent-1" } };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("chua tung gui yeu cau thi hien form khai bao", async () => {
    emit(null);
    renderWithQueryClient(<AccessDeniedPage />);
    await screen.findByText("Thông tin con");
    expect(screen.getByRole("button", { name: /Gửi cho trung tâm/ })).toBeDefined();
  });

  test("dang cho duyet thi hien man cho, khong hien form", async () => {
    emit({ ...baseRequest, status: "pending" } as LinkRequest);
    renderWithQueryClient(<AccessDeniedPage />);
    await screen.findByText("Đang chờ trung tâm duyệt");
    // Doi chieu quan trong: khong duoc de phu huynh gui them ban ghi thu hai.
    expect(screen.queryByRole("button", { name: /Gửi cho trung tâm/ })).toBeNull();
    expect(screen.getByText(/Nguyễn Minh Anh \(Bi\) · 02\/04\/2015/)).toBeDefined();
  });

  test("bi tu choi thi hien ly do va nut gui lai", async () => {
    emit({ ...baseRequest, status: "rejected", rejectReason: "Sai ngày sinh" } as LinkRequest);
    renderWithQueryClient(<AccessDeniedPage />);
    await screen.findByText("Sai ngày sinh");
    expect(screen.getByRole("button", { name: /Sửa và gửi lại/ })).toBeDefined();
  });

  test("ly do khac no_invite thi khong goi den link_requests", async () => {
    authState.value = { claimFailureReason: "email_not_verified", firebaseUser: { email: "ph@gmail.com", uid: "parent-1" } };
    renderWithQueryClient(<AccessDeniedPage />);
    await waitFor(() => expect(screen.getByText(/chưa được xác minh/)).toBeDefined());
    expect(serviceMocks.subscribeMyLinkRequest).not.toHaveBeenCalled();
  });
});
