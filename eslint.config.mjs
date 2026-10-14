import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Bundle que genera OpenNext para Cloudflare Workers (Fase 43).
    ".open-next/**",
    // Bundle temporal que deja `wrangler dev` al previsualizar.
    ".wrangler/**",
    // Tipos de bindings que genera `wrangler types`.
    "cloudflare-env.d.ts",
    // Informes generados: cobertura de Vitest, reportes y trazas de Playwright.
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
