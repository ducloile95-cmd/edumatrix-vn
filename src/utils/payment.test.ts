import { describe, expect, test } from "vitest";
import { buildVietQrImageUrl, createInvoiceCode, createPaymentContent } from "@/utils/payment";

describe("payment helpers", () => {
  test("creates reconcilable invoice code", () => expect(createInvoiceCode("hs001", new Date("2026-07-01"))).toBe("HP-HS001-202607"));
  test("creates transfer content", () => expect(createPaymentContent("HP-HS001-202607")).toBe("HP HS001 202607"));
  test("builds an encoded VietQR Quick Link", () => {
    const url = new URL(buildVietQrImageUrl({
      bankBin: "970436",
      accountNumber: "012345678901",
      accountName: "EDUMATRIX VIET NAM",
      amount: 5_000_000,
      content: "HP HS001 202607",
    }));
    expect(url.origin).toBe("https://img.vietqr.io");
    expect(url.pathname).toBe("/image/970436-012345678901-compact2.png");
    expect(url.searchParams.get("amount")).toBe("5000000");
    expect(url.searchParams.get("addInfo")).toBe("HP HS001 202607");
  });
});
