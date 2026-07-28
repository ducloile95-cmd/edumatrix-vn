import logoUrl from "@/assets/logo.webp";

/** Logo EduMatrix VN (lockup dọc: biểu tượng + chữ). */
export function Logo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="EduMatrix VN" className={className} />;
}
