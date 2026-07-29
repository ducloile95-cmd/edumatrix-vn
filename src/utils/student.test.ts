import { describe, expect, test } from "vitest";
import { studentLabel } from "@/utils/student";

describe("studentLabel", () => {
  test("chi hien ten khi khong co biet danh", () => {
    expect(studentLabel({ fullName: "Nguyễn Minh Anh" })).toBe("Nguyễn Minh Anh");
  });

  test("ghep biet danh trong ngoac de phan biet hoc sinh trung ten", () => {
    expect(studentLabel({ fullName: "Nguyễn Minh Anh", nickname: "Bi" })).toBe("Nguyễn Minh Anh (Bi)");
  });

  test("coi chuoi rong va chuoi toan khoang trang nhu khong co biet danh", () => {
    // createStudent luon ghi nickname: "" nen day la truong hop pho bien nhat, khong phai ngoai le.
    expect(studentLabel({ fullName: "Trần Bảo", nickname: "" })).toBe("Trần Bảo");
    expect(studentLabel({ fullName: "Trần Bảo", nickname: "   " })).toBe("Trần Bảo");
  });
});
