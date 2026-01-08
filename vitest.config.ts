import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}", "convex/__tests__/**/*.test.ts"],
    // Use node environment for convex-test integration tests
    environmentMatchGlobs: [
      ["convex/__tests__/**", "node"],
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/__tests__/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/components/ui/**",  // shadcn UI components (external)
      ],
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
