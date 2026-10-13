import { eq } from "drizzle-orm";
import { DEFAULT_SETTINGS } from "@/lib/config";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  defaultBaseSessionTypes,
  defaultNotDoneReasons,
} from "@/lib/validations/settings.schemas";

/**
 * Lectura y escritura de la configuración global (Fase 34).
 *
 * La tabla `settings` guarda JSON libre, así que este servicio es el único
 * punto donde se traduce entre el formato almacenado y los tipos que usa el
 * resto de la aplicación.
 */

/** Motivo editable: identificador interno + etiqueta visible. */
export type NotDoneReasonItem = { id: string; label: string };
export type BaseSessionTypeItem = { id: string; label: string };

export type LimitsSettings = {
  maxTeamsPerCoach: number;
  maxAthletesPerTeam: number;
  editWindowHours: number;
  alertNoRecordDays: number;
};

export type EmailSettings = { emailFrom: string };

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Los motivos y tipos viene guardados como array de strings en el seed
 * original. Se aceptan ambas formas (string o {id,label}) y se normalizan
 * a {id,label}, de modo que editar la configuración no rompe datos previos.
 *
 * OJO: la columna `value` es `longtext`, no `JSON`, así que Drizzle devuelve
 * SIEMPRE el contenido como string (aunque sea JSON válido). Hay que
 * parsearlo explícitamente; si no, un array guardado como '[...]' se
 * descarta silenciosamente y se vuelve a los valores por defecto.
 */
function normalizeItems(
  raw: unknown,
  fallbackLabels: Record<string, string>,
): { id: string; label: string }[] | null {
  let value: unknown = raw;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    try {
      value = JSON.parse(trimmed);
    } catch {
      // No es JSON: puede ser una lista separada por comas.
      value = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const items: { id: string; label: string }[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const id = entry.trim();
      if (!id) {
        continue;
      }
      items.push({ id, label: fallbackLabels[id] ?? id });
    } else if (entry && typeof entry === "object") {
      const record = entry as { id?: unknown; label?: unknown };
      const id = typeof record.id === "string" ? record.id.trim() : "";
      if (!id) {
        continue;
      }
      const label =
        typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : (fallbackLabels[id] ?? id);
      items.push({ id, label });
    }
  }
  return items.length > 0 ? items : null;
}

const DEFAULT_REASON_LABELS: Record<string, string> = {
  lesion: "Lesión",
  trabajo: "Trabajo",
  enfermedad: "Enfermedad",
  personal: "Personal",
  otro: "Otro",
};

const DEFAULT_TYPE_LABELS: Record<string, string> = {
  series: "Series",
  intervalos: "Intervalos",
  fondos: "Fondos",
  tempo: "Tempo",
  recuperacion: "Recuperación",
  descanso: "Descanso",
};

/** Lee el valor crudo de una clave, o `undefined` si no existe. */
export async function getRawSetting<T = unknown>(
  key: string,
): Promise<T | undefined> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row ? (row.value as T) : undefined;
}

/** Escritura (upsert) de una clave. */
export async function setSetting(key: string, value: unknown): Promise<void> {
  const now = new Date();
  await db
    .insert(settings)
    .values({ key, value, updatedAt: now })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: now } });
}

export async function getNumberSetting(
  key: string,
  fallback: number,
): Promise<number> {
  const raw = await getRawSetting(key);
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export async function getMaxAthletesPerTeam(): Promise<number> {
  return getNumberSetting(
    "max_athletes_per_team",
    DEFAULT_SETTINGS.maxAthletesPerTeam,
  );
}

export async function getMaxTeamsPerCoach(): Promise<number> {
  return getNumberSetting(
    "max_teams_per_coach",
    DEFAULT_SETTINGS.maxTeamsPerCoach,
  );
}

export async function getEditWindowHours(): Promise<number> {
  return getNumberSetting("edit_window_hours", DEFAULT_SETTINGS.editWindowHours);
}

export async function getAlertNoRecordDays(): Promise<number> {
  return getNumberSetting("alert_no_record_days", 7);
}

// --- Motivos y tipos -----------------------------------------------------

/**
 * Motivos de "no realizada" configurables.
 * Se usa en el select del formulario de sesión del atleta.
 */
export async function getNotDoneReasons(): Promise<NotDoneReasonItem[]> {
  const raw = await getRawSetting("not_done_reasons");
  return (
    normalizeItems(raw, DEFAULT_REASON_LABELS) ?? defaultNotDoneReasons()
  );
}

/** Tipos de sesión base configurables. */
export async function getBaseSessionTypes(): Promise<BaseSessionTypeItem[]> {
  const raw = await getRawSetting("base_session_types");
  return (
    normalizeItems(raw, DEFAULT_TYPE_LABELS) ?? defaultBaseSessionTypes()
  );
}

// --- Grupos de configuración para la UI ----------------------------------

export async function getLimitsSettings(): Promise<LimitsSettings> {
  const [maxTeams, maxAthletes, editWindow, alertDays] = await Promise.all([
    getMaxTeamsPerCoach(),
    getMaxAthletesPerTeam(),
    getEditWindowHours(),
    getAlertNoRecordDays(),
  ]);
  return {
    maxTeamsPerCoach: maxTeams,
    maxAthletesPerTeam: maxAthletes,
    editWindowHours: editWindow,
    alertNoRecordDays: alertDays,
  };
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const raw = await getRawSetting<string>("email_from");
  return {
    emailFrom:
      typeof raw === "string" && raw.trim()
        ? raw.trim()
        : DEFAULT_SETTINGS.emailFrom,
  };
}

/** Toda la configuración, para pintar la página de administración. */
export async function getAllSettings(): Promise<{
  limits: LimitsSettings;
  reasons: NotDoneReasonItem[];
  types: BaseSessionTypeItem[];
  email: EmailSettings;
}> {
  const [limits, reasons, types, email] = await Promise.all([
    getLimitsSettings(),
    getNotDoneReasons(),
    getBaseSessionTypes(),
    getEmailSettings(),
  ]);
  return { limits, reasons, types, email };
}

// --- Escrituras (validadas por el llamador con Zod) ----------------------

export async function updateLimits(
  limits: LimitsSettings,
): Promise<ServiceResult<null>> {
  await setSetting("max_teams_per_coach", limits.maxTeamsPerCoach);
  await setSetting("max_athletes_per_team", limits.maxAthletesPerTeam);
  await setSetting("edit_window_hours", limits.editWindowHours);
  await setSetting("alert_no_record_days", limits.alertNoRecordDays);
  return { ok: true, data: null };
}

export async function updateNotDoneReasons(
  reasons: NotDoneReasonItem[],
): Promise<ServiceResult<null>> {
  await setSetting("not_done_reasons", reasons);
  return { ok: true, data: null };
}

export async function updateBaseSessionTypes(
  types: BaseSessionTypeItem[],
): Promise<ServiceResult<null>> {
  await setSetting("base_session_types", types);
  return { ok: true, data: null };
}

export async function updateEmail(
  email: EmailSettings,
): Promise<ServiceResult<null>> {
  await setSetting("email_from", email.emailFrom);
  return { ok: true, data: null };
}
