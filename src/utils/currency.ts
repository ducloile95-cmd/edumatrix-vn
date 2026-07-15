/** Dinh dang tien VND kieu "xxx.xxx đ" (dau cham ngan chuc, khong dung so tho). */
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} đ`;
}
