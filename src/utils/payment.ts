export function createInvoiceCode(studentId:string,date=new Date()):string{return `HP-${studentId.toUpperCase()}-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}`;}
export function createPaymentContent(invoiceCode:string):string{return invoiceCode.split("-").join(" ");}
interface VietQrImageInput {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  content: string;
  template?: string;
}

function safePathSegment(value: string): string {
  return encodeURIComponent(value.trim().replace(/[^a-zA-Z0-9_]/g, ""));
}

/**
 * VietQR Quick Link khong can client-id/API key, phu hop voi Spark client-side.
 * Anh duoc tao boi img.vietqr.io; QR chi ho tro chuyen khoan, khong xac nhan giao dich.
 */
export function buildVietQrImageUrl(input: VietQrImageInput): string {
  const bank = safePathSegment(input.bankBin);
  const account = safePathSegment(input.accountNumber);
  const template = safePathSegment(input.template || "compact2") || "compact2";
  const params = new URLSearchParams();
  if (Number.isFinite(input.amount) && input.amount > 0) params.set("amount", String(Math.round(input.amount)));
  if (input.content.trim()) params.set("addInfo", input.content.trim().slice(0, 50));
  if (input.accountName.trim()) params.set("accountName", input.accountName.trim().slice(0, 50));
  return `https://img.vietqr.io/image/${bank}-${account}-${template}.png?${params.toString()}`;
}

/** @deprecated Dung buildVietQrImageUrl de tao QR VietQR that. */
export function buildPaymentQrPayload(input: VietQrImageInput): string {
  return buildVietQrImageUrl(input);
}
