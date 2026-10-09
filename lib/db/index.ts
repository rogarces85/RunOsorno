import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL no está definida en .env.local");
}

export const db = drizzle({
  connection: { uri: url },
  schema,
  mode: "default",
});
