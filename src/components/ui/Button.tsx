import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type ButtonVariant = "primary" | "soft" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}

const base =
  "motion-control relative inline-flex min-h-touch items-center justify-center gap-2 whitespace-nowrap rounded-input border text-sm font-semibold shadow-none active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "border-primary-600 bg-primary-600 text-white hover:border-primary-700 hover:bg-primary-700",
  // Hành động phụ nhưng cần nổi hơn secondary (vd. "Xem chi tiết", "Thêm buổi").
  soft: "border-primary-200 bg-primary-50 text-primary-700 hover:border-primary-300 hover:bg-primary-100",
  secondary: "border-neutral-300 bg-neutral-0 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 hover:text-neutral-950",
  danger: "border-danger-700 bg-danger-700 text-white hover:border-danger-900 hover:bg-danger-900",
  ghost: "border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 text-xs",
  md: "px-4",
};

function cx(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  className,
  icon,
  loading = false,
  loadingLabel = "Đang xử lý",
  size = "md",
  type = "button",
  variant = "secondary",
  disabled,
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={loading ? loadingLabel : ariaLabel}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
