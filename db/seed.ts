import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  BASE_SESSION_TYPES,
  DEFAULT_NOT_DONE_REASONS,
} from "../lib/config/constants";
import { db } from "../lib/db/index";
import { settings, users } from "../lib/db/schema";

const ADMIN_EMAIL = "admin@runosorno.cl";
const ADMIN_PASSWORD = "Admin1234!";

const DEFAULT_SETTINGS = [
  { key: "max_teams_per_coach", value: 10 },
  { key: "max_athletes_per_team", value: 50 },
  { key: "edit_window_hours", value: 48 },
  {
    key: "not_done_reasons",
    value: [...DEFAULT_NOT_DONE_REASONS],
  },
  {
    key: "base_session_types",
    value: [...BASE_SESSION_TYPES],
  },
];

async function main() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL));

  if (existing.length === 0) {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      name: "Administrador",
      email: ADMIN_EMAIL,
      passwordHash: hashSync(ADMIN_PASSWORD, 10),
      role: "admin",
      isActive: true,
      mustChangePassword: true,
    });
    console.log(`Admin creado: ${ADMIN_EMAIL}`);
  } else {
    console.log("Admin ya existe, se omite");
  }

  for (const setting of DEFAULT_SETTINGS) {
    await db
      .insert(settings)
      .values(setting)
      .onDuplicateKeyUpdate({
        set: { value: setting.value, updatedAt: new Date() },
      });
  }
  console.log(`Settings verificadas: ${DEFAULT_SETTINGS.length} claves`);

  const admin = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL));

  if (admin.length !== 1) {
    throw new Error("Admin no encontrado tras el seed");
  }
  console.log(
    `OK — admin verificado (id=${admin[0].id}, role=${admin[0].role})`,
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
