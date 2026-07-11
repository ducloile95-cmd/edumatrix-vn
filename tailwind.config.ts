import type { Config } from "tailwindcss";

// Bang mau he thong Edumatrix-vn - "truong phai giao duc":
// tin cay (primary blue) + tang truong (success green) + than thien am (neutral warm)
// Xem chi tiet dien giai trong README.md muc "Design tokens".
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EFF4FF",
          100: "#DBE6FE",
          200: "#BFD3FE",
          300: "#93B4FD",
          400: "#6090FA",
          500: "#3366F0",
          600: "#2348D6",
          700: "#1D39AC",
          800: "#1C3389",
          900: "#1B2E6E",
          DEFAULT: "#3366F0",
        },
        accent: {
          50: "#FFF4EA",
          100: "#FFE3C7",
          300: "#FFBB78",
          500: "#FF8A3D",
          700: "#C85E1D",
          DEFAULT: "#FF8A3D",
        },
        success: {
          50: "#ECFDF3",
          100: "#D1FADF",
          300: "#6CE9A6",
          500: "#16A34A",
          700: "#0F7A37",
          900: "#0A5227",
          DEFAULT: "#16A34A",
        },
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          300: "#FCD34D",
          500: "#F59E0B",
          700: "#B45309",
          900: "#78350F",
          DEFAULT: "#F59E0B",
        },
        danger: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          300: "#FCA5A5",
          500: "#E4453A",
          700: "#B91C1C",
          900: "#7F1D1D",
          DEFAULT: "#E4453A",
        },
        info: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          300: "#7DD3FC",
          500: "#0EA5E9",
          700: "#0369A1",
          900: "#0C4A6E",
          DEFAULT: "#0EA5E9",
        },
        neutral: {
          0: "#FFFFFF",
          50: "#FAFAF9",
          100: "#F4F3F1",
          200: "#E7E5E2",
          300: "#D3D0CB",
          400: "#A6A29C",
          500: "#78746D",
          600: "#57534D",
          700: "#403D39",
          800: "#2B2926",
          900: "#1C1A15",
        },
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
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
} satisfies Config;
