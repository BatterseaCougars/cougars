import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/*/src/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
  },
});
