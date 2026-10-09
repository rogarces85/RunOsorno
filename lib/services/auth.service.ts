import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const DUMMY_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function authenticate(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    await compare(password, DUMMY_HASH);
    return { ok: false as const };
  }

  const validPassword = await compare(password, user.passwordHash);
  if (!validPassword || !user.isActive) {
    return { ok: false as const };
  }

  return { ok: true as const, user };
}
