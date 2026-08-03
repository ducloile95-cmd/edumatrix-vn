import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}

const base =
  "motion-control relative inline-flex min-h-touch items-center justify-center gap-2 whitespace-nowrap rounded-input border text-sm font-bold shadow-none transition-[transform,filter] duration-150 hover:brightness-[1.04] active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "border-primary-700 bg-gradient-to-br from-primary-500 to-primary-700 text-white",
  secondary: "border-neutral-300 bg-gradient-to-b from-white to-neutral-100 text-neutral-700 hover:border-neutral-400 hover:text-neutral-950",
  danger: "border-danger-700 bg-gradient-to-br from-danger-500 to-danger-700 text-white",
  ghost: "border-neutral-200 bg-gradient-to-b from-white/80 to-neutral-100/80 text-neutral-600 hover:border-neutral-300 hover:text-neutral-950",
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
