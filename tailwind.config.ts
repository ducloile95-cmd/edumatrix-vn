import type { Config } from "tailwindcss";

// Bang mau he thong Edumatrix-vn - "truong phai giao duc":
// tin cay (primary blue) + tang truong (success green) + than thien am (neutral warm)
// Xem chi tiet dien giai trong README.md muc "Design tokens".
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Token mau doc tu CSS variable (src/index.css): :root = sang, html.dark = toi.
      // - neutral: dao thang mau o che do toi (0 = nen panel, 900 = chu chinh).
      // - mau ngu nghia 50-300: nen nhat/vien, tu doi theo theme; 400-900: mau dac co dinh cho nen/nut.
      // - textColor 600-900 rieng: dam tren nen sang, sang tren nen toi (xem textColor ben duoi).
      // - ink: mau toi co dinh cho backdrop/mockup, khong dao theo theme.
      colors: {
        primary: {
          50: "rgb(var(--primary-50) / <alpha-value>)",
          100: "rgb(var(--primary-100) / <alpha-value>)",
          200: "rgb(var(--primary-200) / <alpha-value>)",
          300: "rgb(var(--primary-300) / <alpha-value>)",
          400: "#6090FA",
          500: "#3366F0",
          600: "#2348D6",
          700: "#1D39AC",
          800: "#1C3389",
          900: "#1B2E6E",
          DEFAULT: "#3366F0",
        },
        accent: {
          50: "rgb(var(--accent-50) / <alpha-value>)",
          100: "rgb(var(--accent-100) / <alpha-value>)",
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          500: "#FF8A3D",
          600: "#E5722A",
          700: "#C85E1D",
          800: "#A44C17",
          900: "#7F3B12",
          DEFAULT: "#FF8A3D",
        },
        success: {
          50: "rgb(var(--success-50) / <alpha-value>)",
          100: "rgb(var(--success-100) / <alpha-value>)",
          200: "rgb(var(--success-200) / <alpha-value>)",
          300: "rgb(var(--success-300) / <alpha-value>)",
          500: "#16A34A",
          600: "#15803D",
          700: "#0F7A37",
          800: "#0D6630",
          900: "#0A5227",
          DEFAULT: "#16A34A",
        },
        warning: {
          50: "rgb(var(--warning-50) / <alpha-value>)",
          100: "rgb(var(--warning-100) / <alpha-value>)",
          200: "rgb(var(--warning-200) / <alpha-value>)",
          300: "rgb(var(--warning-300) / <alpha-value>)",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
          DEFAULT: "#F59E0B",
        },
        danger: {
          50: "rgb(var(--danger-50) / <alpha-value>)",
          100: "rgb(var(--danger-100) / <alpha-value>)",
          200: "rgb(var(--danger-200) / <alpha-value>)",
          300: "rgb(var(--danger-300) / <alpha-value>)",
          500: "#E4453A",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          DEFAULT: "#E4453A",
        },
        info: {
          50: "rgb(var(--info-50) / <alpha-value>)",
          100: "rgb(var(--info-100) / <alpha-value>)",
          200: "rgb(var(--info-200) / <alpha-value>)",
          300: "rgb(var(--info-300) / <alpha-value>)",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
          DEFAULT: "#0EA5E9",
        },
        neutral: {
          0: "rgb(var(--n-0) / <alpha-value>)",
          50: "rgb(var(--n-50) / <alpha-value>)",
          100: "rgb(var(--n-100) / <alpha-value>)",
          200: "rgb(var(--n-200) / <alpha-value>)",
          300: "rgb(var(--n-300) / <alpha-value>)",
          400: "rgb(var(--n-400) / <alpha-value>)",
          500: "rgb(var(--n-500) / <alpha-value>)",
          600: "rgb(var(--n-600) / <alpha-value>)",
          700: "rgb(var(--n-700) / <alpha-value>)",
          800: "rgb(var(--n-800) / <alpha-value>)",
          900: "rgb(var(--n-900) / <alpha-value>)",
          950: "rgb(var(--n-950) / <alpha-value>)",
        },
        ink: { 700: "#403D39", 800: "#2B2926", 900: "#1C1A15", DEFAULT: "#1C1A15" },
      },
      textColor: {
        primary: { 600: "rgb(var(--primary-text-600) / <alpha-value>)", 700: "rgb(var(--primary-text-700) / <alpha-value>)", 800: "rgb(var(--primary-text-800) / <alpha-value>)", 900: "rgb(var(--primary-text-900) / <alpha-value>)" },
        accent: { 600: "rgb(var(--accent-text-600) / <alpha-value>)", 700: "rgb(var(--accent-text-700) / <alpha-value>)", 800: "rgb(var(--accent-text-800) / <alpha-value>)", 900: "rgb(var(--accent-text-900) / <alpha-value>)" },
        success: { 600: "rgb(var(--success-text-600) / <alpha-value>)", 700: "rgb(var(--success-text-700) / <alpha-value>)", 800: "rgb(var(--success-text-800) / <alpha-value>)", 900: "rgb(var(--success-text-900) / <alpha-value>)" },
        warning: { 600: "rgb(var(--warning-text-600) / <alpha-value>)", 700: "rgb(var(--warning-text-700) / <alpha-value>)", 800: "rgb(var(--warning-text-800) / <alpha-value>)", 900: "rgb(var(--warning-text-900) / <alpha-value>)" },
        danger: { 600: "rgb(var(--danger-text-600) / <alpha-value>)", 700: "rgb(var(--danger-text-700) / <alpha-value>)", 800: "rgb(var(--danger-text-800) / <alpha-value>)", 900: "rgb(var(--danger-text-900) / <alpha-value>)" },
        info: { 600: "rgb(var(--info-text-600) / <alpha-value>)", 700: "rgb(var(--info-text-700) / <alpha-value>)", 800: "rgb(var(--info-text-800) / <alpha-value>)", 900: "rgb(var(--info-text-900) / <alpha-value>)" },
      },
      fontFamily: {
        sans: [
          '"Be Vietnam Pro"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      borderRadius: {
        input: "8px",
        card: "12px",
        modal: "16px",
        "chat-bubble": "14px",
        "chat-tail": "4px",
      },
      fontSize: {
        // Toi thieu 11px: chu Viet nhieu dau, nho hon se dinh dau va kho doc voi nguoi lon tuoi.
        "3xs": ["calc(11px + var(--web-font-size-adjustment, 0px))", { lineHeight: "1rem" }],
        "2xs": ["calc(12px + var(--web-font-size-adjustment, 0px))", { lineHeight: "1rem" }],
        xs: ["calc(13px + var(--web-font-size-adjustment, 0px))", { lineHeight: "1.125rem" }],
        sm: ["calc(14px + var(--web-font-size-adjustment, 0px))", { lineHeight: "1.25rem" }],
        base: ["calc(15px + var(--web-font-size-adjustment, 0px))", { lineHeight: "1.5rem" }],
        lg: ["calc(17px + var(--web-font-size-adjustment, 0px))", { lineHeight: "1.625rem" }],
        xl: ["calc(19px + var(--web-font-size-adjustment, 0px))", { lineHeight: "1.75rem" }],
        "2xl": ["calc(22px + var(--web-font-size-adjustment, 0px))", { lineHeight: "1.875rem" }],
        "3xl": ["calc(28px + var(--web-font-size-adjustment, 0px))", { lineHeight: "2.25rem" }],
      },
      // Chỉ dùng các mức này (hoặc var(--shadow-1..4)); không viết shadow-[...] tùy ý, không glow màu.
      boxShadow: {
        xs: "0 1px 2px rgba(28, 26, 21, .05)",
        up: "0 -8px 24px rgba(28, 26, 21, .06)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      transitionDuration: {
        DEFAULT: "var(--motion-standard)",
        micro: "var(--motion-instant)",
        fast: "var(--motion-fast)",
        overlay: "var(--motion-emphasis)",
        page: "var(--motion-slow)",
        progress: "var(--motion-progress)",
      },
      animation: {
        spin: "spin var(--motion-spinner) linear infinite",
        pulse: "pulse var(--motion-pulse) cubic-bezier(.4, 0, .6, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
