import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/*/src/**/*.test.ts", "team/*/src/**/*.test.ts", "shared/**/*.test.ts", "scripts/**/*.test.mjs"],
    environment: "node",
  },
});
