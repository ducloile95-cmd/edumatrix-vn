/**
 * Chuan hoa email ve dang so sanh duoc: trim + lowercase (A7.4).
 * Dung lam document ID cho invites/{normalizedEmail} (A13).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
