import { eq } from "drizzle-orm";
import { DEFAULT_SETTINGS } from "@/lib/config";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export async function getNumberSetting(
  key: string,
  fallback: number,
): Promise<number> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  if (!row) {
    return fallback;
  }
  const value = Number(row.value);
  return Number.isFinite(value) ? value : fallback;
}

export async function getMaxAthletesPerTeam(): Promise<number> {
  return getNumberSetting(
    "max_athletes_per_team",
    DEFAULT_SETTINGS.maxAthletesPerTeam,
  );
}
