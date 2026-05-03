import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only is a Next.js compile-time guard that throws when imported
      // outside Server Components. Stub it so unit tests can exercise pure
      // helpers in modules that declare it.
      "server-only": path.resolve(__dirname, "./tests/_stubs/server-only.ts"),
    },
  },
});
