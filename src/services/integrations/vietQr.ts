import { requestJson } from "@/services/api/request";

export interface VietQrBank {
  bin: string;
  code: string;
  shortName: string;
  name: string;
  logo: string;
  transferSupported: number;
}

interface BankResponse { code: string; data?: VietQrBank[]; }

export async function listVietQrBanks(): Promise<VietQrBank[]> {
  const payload = await requestJson<BankResponse>("https://api.vietqr.io/v2/banks", {
    headers: { Accept: "application/json" },
    timeoutMs: 12_000,
  });
  if (payload.code !== "00" || !Array.isArray(payload.data)) throw new Error("Dữ liệu ngân hàng VietQR không hợp lệ");
  return payload.data.filter((bank) => bank.transferSupported === 1 && /^\d{6}$/.test(bank.bin));
}
