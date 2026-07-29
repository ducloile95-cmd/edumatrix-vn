import { describe, expect, test } from "vitest";
import { normalizeName, suggestMatches, type MatchCandidate } from "@/utils/studentMatch";

const students: MatchCandidate[] = [
  { id: "HS001", fullName: "Nguyễn Minh Anh", nickname: "Bi", dateOfBirth: "2015-04-02" },
  { id: "HS002", fullName: "Nguyễn Minh Anh", nickname: "Bon", dateOfBirth: "2016-09-11" },
  { id: "HS003", fullName: "Trần Bảo Long", nickname: "", dateOfBirth: "2015-04-02" },
  { id: "HS004", fullName: "Lê Thu Hà", nickname: "", dateOfBirth: "2013-01-20" },
];

describe("suggestMatches", () => {
  test("hai hoc sinh trung ten khac ngay sinh - ngay sinh quyet dinh thu tu", () => {
    const result = suggestMatches({ fullName: "Nguyễn Minh Anh", dateOfBirth: "2016-09-11" }, students);
    expect(result[0].student.id).toBe("HS002");
    expect(result[0].score).toBe(5);
    expect(result[1].student.id).toBe("HS001");
    expect(result[1].score).toBe(2);
  });

  test("trung ten trung ngay sinh - biet danh la thu duy nhat tach duoc", () => {
    const twins: MatchCandidate[] = [
      { id: "HS010", fullName: "Phạm Gia Bảo", nickname: "Bo", dateOfBirth: "2014-06-06" },
      { id: "HS011", fullName: "Phạm Gia Bảo", nickname: "Bi", dateOfBirth: "2014-06-06" },
    ];
    const result = suggestMatches({ fullName: "Phạm Gia Bảo", nickname: "Bi", dateOfBirth: "2014-06-06" }, twins);
    expect(result[0].student.id).toBe("HS011");
    expect(result[0].score).toBe(7);
    expect(result[1].score).toBe(5);
  });

  test("khong ai khop thi tra mang rong", () => {
    expect(suggestMatches({ fullName: "Hoàng Văn Khoa", dateOfBirth: "2011-03-03" }, students)).toEqual([]);
  });

  test("go khong dau van khop - phu huynh hiem khi go dau day du", () => {
    const result = suggestMatches({ fullName: "nguyen minh anh", dateOfBirth: "2015-04-02" }, students);
    expect(result[0].student.id).toBe("HS001");
    expect(result[0].reasons).toEqual(["Trùng ngày sinh", "Trùng họ tên"]);
  });

  test("chi tra toi da 3 goi y", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ id: `HS10${i}`, fullName: "Đỗ Nam Trân", dateOfBirth: "2015-01-01" }));
    expect(suggestMatches({ fullName: "Do Nam Tran" }, many)).toHaveLength(3);
  });
});

describe("normalizeName", () => {
  test("bo dau, ha thuong, gop khoang trang, doi d gach ngang", () => {
    expect(normalizeName("  Đỗ   Nam  Trân ")).toBe("do nam tran");
  });

  test("chuoi rong va undefined deu ra chuoi rong", () => {
    expect(normalizeName(undefined)).toBe("");
    expect(normalizeName("   ")).toBe("");
  });
});
