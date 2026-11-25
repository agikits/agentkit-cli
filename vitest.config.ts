import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // CLI tests spawn the built executable; Windows runners start Node slowly.
    testTimeout: process.platform === "win32" ? 30_000 : 5_000,
  },
});
