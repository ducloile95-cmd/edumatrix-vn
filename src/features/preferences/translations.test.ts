import { beforeAll, describe, expect, it } from "vitest";
import { loadEnglishDictionary, translateToEnglish } from "@/features/preferences/translations";

describe("English translations", () => {
  it("only knows curated terms until the full dictionary is loaded", async () => {
    expect(translateToEnglish("-- Chọn khóa học --")).toBe("-- Chọn khóa học --");
    await loadEnglishDictionary();
    expect(translateToEnglish("-- Chọn khóa học --")).toBe("-- Select course --");
  });

  describe("after loading", () => {
    beforeAll(() => loadEnglishDictionary());

    it("uses curated product terminology", () => {
      expect(translateToEnglish("Quản lý lớp học")).toBe("Class management");
      expect(translateToEnglish("Học phí")).toBe("Tuition");
    });

    it("translates known phrases inside dynamic interface text", () => {
      expect(translateToEnglish("12 Học sinh")).toBe("12 Students");
      expect(translateToEnglish("Thứ Hai, 10/08/2026")).toBe("Monday, 10/08/2026");
    });

    it("ignores object prototype keys", () => {
      expect(translateToEnglish("constructor")).toBe("constructor");
      expect(translateToEnglish("toString")).toBe("toString");
    });

    it("never replaces inside a longer word or number", () => {
      expect(translateToEnglish("Thứ Hailey")).toBe("Thứ Hailey");
      expect(translateToEnglish("tháng 12, tháng 1")).toBe("December, January");
    });
  });
});
