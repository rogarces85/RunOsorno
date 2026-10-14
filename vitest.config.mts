import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      reportsDirectory: "./coverage",
      // 41.15: el núcleo de cálculo y de permisos es la parte del sistema donde
      // un error no se ve en pantalla (nadie mira un porcentaje), así que se
      // exige cobertura real. El resto del proyecto se mide pero no se exige.
      include: [
        "lib/metrics/**/*.ts",
        "lib/permissions/**/*.ts",
        "lib/validations/**/*.ts",
        "lib/auth/guards.ts",
        "lib/services/session.service.ts",
      ],
      thresholds: {
        "lib/metrics/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        "lib/permissions/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        "lib/auth/guards.ts": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        "lib/services/session.service.ts": {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
      },
    },
  },
});
