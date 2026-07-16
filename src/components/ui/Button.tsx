import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const base =
  "motion-control inline-flex min-h-touch items-center justify-center gap-2 rounded-input text-sm font-medium active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_8px_20px_rgba(35,72,214,.25)]",
  secondary: "border border-neutral-300 bg-white/70 text-neutral-700 hover:bg-neutral-50 hover:text-primary-700",
  danger: "bg-danger-500 text-white hover:bg-danger-700",
  ghost: "text-neutral-600 hover:bg-neutral-50 hover:text-primary-700",
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
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cx(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
