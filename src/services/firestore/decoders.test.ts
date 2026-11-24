import { describe, expect, it } from "vitest";
import { decodeUserDoc } from "@/services/firestore/decoders";

const timestamp = { seconds: 0, nanoseconds: 0 };

describe("Firestore document decoders", () => {
  it("accepts a valid user document", () => {
    const user = decodeUserDoc({
      email: "admin@example.com",
      displayName: "Admin",
      photoURL: null,
      role: "admin",
      studentIds: [],
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    }, "users/admin");

    expect(user.role).toBe("admin");
  });

  it("normalizes a missing legacy photoURL to null", () => {
    const user = decodeUserDoc({
      email: "legacy-admin@example.com",
      displayName: "Legacy Admin",
      role: "admin",
      studentIds: [],
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    }, "users/legacy-admin");

    expect(user.photoURL).toBeNull();
  });

  it("rejects a legacy user document whose studentIds is not an array", () => {
    expect(() => decodeUserDoc({
      email: "parent@example.com",
      displayName: "Parent",
      photoURL: null,
      role: "viewer",
      studentIds: "student-1",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    }, "users/parent"))
      .toThrowError("INVALID_FIRESTORE_DOCUMENT:users/parent");
  });
});
