import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export type TemplateSection = {
  id: string;
  order: number;
  title: string;
  type:
    | "warmup"
    | "main"
    | "cooldown"
    | "stretching"
    | "recovery"
    | "strength"
    | "custom";
  content: string;
};

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "coach", "athlete"]).notNull(),
  avatarKey: varchar("avatar_key", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const groups = mysqlTable("groups", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  logoKey: varchar("logo_key", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMembers = mysqlTable(
  "group_members",
  {
    groupId: varchar("group_id", { length: 36 })
      .notNull()
      .references(() => groups.id),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    isDirector: boolean("is_director").notNull().default(false),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

export const groupRequests = mysqlTable(
  "group_requests",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    groupId: varchar("group_id", { length: 36 })
      .notNull()
      .references(() => groups.id),
    coachId: varchar("coach_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    status: mysqlEnum("status", ["pending", "approved", "rejected"])
      .notNull()
      .default("pending"),
    requestedAt: timestamp("requested_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: varchar("resolved_by", { length: 36 }).references(
      () => users.id,
    ),
  },
  (t) => [
    uniqueIndex("group_requests_group_coach_unique").on(t.groupId, t.coachId),
  ],
);

export const teams = mysqlTable(
  "teams",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    coachId: varchar("coach_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("teams_coach_id_idx").on(t.coachId)],
);

export const teamMembers = mysqlTable(
  "team_members",
  {
    teamId: varchar("team_id", { length: 36 })
      .notNull()
      .references(() => teams.id),
    athleteId: varchar("athlete_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.athleteId] })],
);

export const athleteProfiles = mysqlTable("athlete_profiles", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id),
  birthDate: date("birth_date"),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  heightCm: decimal("height_cm", { precision: 5, scale: 1 }),
  maxHr: int("max_hr"),
  restingHr: int("resting_hr"),
});

export const templates = mysqlTable("templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  coachId: varchar("coach_id", { length: 36 }).references(() => users.id),
  groupId: varchar("group_id", { length: 36 }).references(() => groups.id),
  name: varchar("name", { length: 150 }).notNull(),
  sessionType: varchar("session_type", { length: 50 }).notNull(),
  isOfficial: boolean("is_official").notNull().default(false),
  isShared: boolean("is_shared").notNull().default(false),
  structure: json("structure").$type<TemplateSection[]>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessionAssignments = mysqlTable(
  "session_assignments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    athleteId: varchar("athlete_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    templateId: varchar("template_id", { length: 36 })
      .notNull()
      .references(() => templates.id),
    sessionDate: date("session_date").notNull(),
    weekStart: date("week_start").notNull(),
    status: mysqlEnum("status", [
      "planned",
      "in_progress",
      "completed",
      "partial",
      "not_done",
    ])
      .notNull()
      .default("planned"),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("session_assignments_athlete_date_idx").on(
      t.athleteId,
      t.sessionDate,
    ),
    index("session_assignments_athlete_week_idx").on(t.athleteId, t.weekStart),
    index("session_assignments_created_by_idx").on(t.createdBy),
  ],
);

export const sessionRecords = mysqlTable(
  "session_records",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    assignmentId: varchar("assignment_id", { length: 36 })
      .notNull()
      .unique()
      .references(() => sessionAssignments.id),
    distanceKm: decimal("distance_km", { precision: 6, scale: 2 }),
    durationMinutes: int("duration_minutes"),
    rpe: int("rpe"),
    comments: text("comments"),
    notDoneReason: varchar("not_done_reason", { length: 50 }),
    customReason: text("custom_reason"),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  () => [check("session_records_rpe_check", sql`rpe >= 1 AND rpe <= 10`)],
);

export const sessionFeedback = mysqlTable("session_feedback", {
  id: varchar("id", { length: 36 }).primaryKey(),
  assignmentId: varchar("assignment_id", { length: 36 })
    .notNull()
    .references(() => sessionAssignments.id),
  authorId: varchar("author_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = mysqlTable(
  "notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: varchar("entity_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // Dos índices en vez del único `(user_id, is_read)` que había antes
  // (Fase 47, tarea 47.3). Los dos accesos reales son distintos:
  //
  // - La campanita y el centro de notificaciones piden `WHERE user_id = ?
  //   AND is_read = ? ORDER BY created_at DESC`. Con el índice anterior MySQL
  //   filtraba bien pero tenía que ordenar aparte (`Using filesort`).
  // - El listado "todas" filtra solo por usuario, así que necesita el orden
  //   por fecha sin la columna `is_read` en medio.
  //
  // Con la fecha al final de cada índice, ambos salen del índice ya ordenados.
  (t) => [
    index("notifications_user_read_created_idx").on(
      t.userId,
      t.isRead,
      t.createdAt,
    ),
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
  ],
);

/**
 * Logs de auditoría (Fase 35), con índices propios (Fase 47, tarea 47.3).
 *
 * Esta tabla **no tenía ningún índice** aparte de la clave primaria, y es la
 * que más crece: cada acción crítica inserta una fila. `/admin/logs` filtra
 * por rango de fechas, por usuario y por tipo de acción, y ordena por
 * `created_at DESC`, así que MySQL recorría la tabla entera y ordenaba el
 * resultado en memoria (verificado con `EXPLAIN`: `type = ALL`, `key = NULL`,
 * `Using where; Using filesort`).
 */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 36 }),
    details: json("details"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // Vista por defecto: rango de fechas, del más reciente al más antiguo.
    index("audit_logs_created_at_idx").on(t.createdAt),
    // Filtro por usuario + orden por fecha (el más usado de los tres).
    index("audit_logs_user_created_idx").on(t.userId, t.createdAt),
    // Filtro por tipo de acción y lista de acciones distintas del filtro.
    // Con `created_at` al final, el listado de esa acción sale ya ordenado.
    index("audit_logs_action_created_idx").on(t.action, t.createdAt),
  ],
);

export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: json("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Intentos de login por IP y ventana (Fase 45, tarea 45.5).
 *
 * Una fila por combinación IP + ventana. El `expiresAt` permite purgar lo viejo
 * sin cron: la consulta cuenta solo lo que aún no venció.
 */
export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    key: varchar("key", { length: 120 }).primaryKey(),
    ip: varchar("ip", { length: 45 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("login_attempts_expires_idx").on(t.expiresAt)],
);

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: datetime("expires_at").notNull(),
});
