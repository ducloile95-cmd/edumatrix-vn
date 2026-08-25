import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "firebase/tests/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**", "Agents Instuctions/**"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      thresholds: { statements: 40, branches: 70, functions: 50, lines: 40 },
    },
  },
});
