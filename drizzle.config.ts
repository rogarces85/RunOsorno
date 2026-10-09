import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL no está definida en .env.local");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "mysql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
