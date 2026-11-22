import { describe, expect, test } from "vitest";
import { canHardDeleteAccount } from "@/features/users/accountPermissions";

describe("canHardDeleteAccount", () => {
  test("only an admin may delete, never an admin account or self", () => {
    expect(canHardDeleteAccount("admin", { uid: "t1", role: "teacher" }, "a1")).toBe(true);
    expect(canHardDeleteAccount("admin", { uid: "v1", role: "viewer" }, "a1")).toBe(true);
    expect(canHardDeleteAccount("admin", { uid: "a2", role: "admin" }, "a1")).toBe(false);
    expect(canHardDeleteAccount("admin", { uid: "a1", role: "teacher" }, "a1")).toBe(false);
    expect(canHardDeleteAccount("teacher", { uid: "v1", role: "viewer" }, "t1")).toBe(false);
    expect(canHardDeleteAccount(undefined, { uid: "v1", role: "viewer" }, undefined)).toBe(false);
  });
});
