import { describe, expect, it } from "vitest";
import { translateToEnglish } from "@/features/preferences/translations";

describe("English translations", () => {
  it("uses curated product terminology", () => {
    expect(translateToEnglish("Quản lý lớp học")).toBe("Class management");
    expect(translateToEnglish("Học phí")).toBe("Tuition");
  });

  it("translates known phrases inside dynamic interface text", () => {
    expect(translateToEnglish("12 Học sinh")).toBe("12 Students");
    expect(translateToEnglish("Thứ Hai, 10/08/2026")).toBe("Monday, 10/08/2026");
  });
});
