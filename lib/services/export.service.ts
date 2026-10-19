import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groups,
  sessionAssignments,
  sessionRecords,
  teams,
  templates,
  users,
} from "@/lib/db/schema";
import { parseKm, round2 } from "@/lib/metrics/utils";
import type { PermissionUser } from "@/lib/permissions";
import { canManageTeam, canViewAthlete, isDirector } from "@/lib/permissions";
import { whereSessionDateBetween } from "@/lib/services/plan.service";
import { logAudit } from "@/lib/services/audit.service";
import {
  getAthleteMetrics,
  getGroupMetrics,
  getTeamMetrics,
} from "@/lib/services/metric.service";
import type { PdfSessionRow } from "@/lib/exports/athlete-report";
import type { ExportEntity, ExportFile } from "@/lib/validations/export.schemas";
import type { MetricsPeriod } from "@/lib/validations/metric.schemas";

/**
 * Generación de archivos de exportación (Fase 33).
 *
 * Todos los archivos se construyen EN MEMORIA (sin tocar el sistema de
 * archivos), para mantener compatibilidad con el runtime edge de
 * Cloudflare Workers donde `fs` no existe.
 *
 * Formatos:
 *   - PDF  : informe del atleta (@react-pdf/renderer)
 *   - XLSX : registros y métricas (exceljs, workbook en memoria)
 *   - CSV  : listados globales para el admin
 */

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const NO_DATA_MESSAGE =
  "No hay datos para exportar en el periodo seleccionado";

const STATUS_LABEL: Record<string, string> = {
  planned: "Planificada",
  in_progress: "En curso",
  completed: "Completada",
  partial: "Parcial",
  not_done: "No realizada",
};

function periodLabel(period: MetricsPeriod): string {
  if (period.kind === "custom") {
    return `${period.from} a ${period.to}`;
  }
  if (period.kind === "year") {
    return `Año ${period.year ?? "actual"}`;
  }
  return "Temporada actual";
}

function safeSlug(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "export";
}

/** Convierte lo que devuelve exceljs (Buffer) a Uint8Array sin usar fs. */
function toUint8(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (Array.isArray(data)) {
    return new Uint8Array(data as number[]);
  }
  return new Uint8Array(0);
}

/** Normaliza una columna date() de MySQL a ISO (YYYY-MM-DD). */
function isoDate(value: Date | string | null): string {
  if (!value) {
    return "";
  }
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

// ---------------------------------------------------------------------------
// PDF — Informe del atleta
// ---------------------------------------------------------------------------

export async function exportAthletePDF(
  athleteId: string,
  period: MetricsPeriod,
): Promise<ServiceResult<ExportFile>> {
  const metrics = await getAthleteMetrics(athleteId, period);
  if (!metrics.ok) {
    return metrics;
  }
  const data = metrics.data;

  const [athlete] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, athleteId))
    .limit(1);

  const rows = await db
    .select({
      sessionDate: sessionAssignments.sessionDate,
      status: sessionAssignments.status,
      sessionType: templates.sessionType,
      distanceKm: sessionRecords.distanceKm,
      durationMinutes: sessionRecords.durationMinutes,
      rpe: sessionRecords.rpe,
      notDoneReason: sessionRecords.notDoneReason,
    })
    .from(sessionAssignments)
    .innerJoin(templates, eq(sessionAssignments.templateId, templates.id))
    .leftJoin(
      sessionRecords,
      eq(sessionRecords.assignmentId, sessionAssignments.id),
    )
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereSessionDateBetween(data.period.from, data.period.to),
      ),
    )
    .orderBy(asc(sessionAssignments.sessionDate));

  if (rows.length === 0) {
    return { ok: false, error: NO_DATA_MESSAGE };
  }

  const pdfRows: PdfSessionRow[] = rows.map((row) => ({
    date: isoDate(row.sessionDate),
    sessionType: row.sessionType,
    status: row.status,
    distanceKm: row.distanceKm ? String(parseKm(row.distanceKm)) : null,
    durationMinutes: row.durationMinutes,
    rpe: row.rpe,
    note: row.notDoneReason ?? "",
  }));

  // @react-pdf/renderer y el documento del informe se cargan aquí y no en la
  // cabecera del módulo: pesan, y solo hacen falta cuando alguien descarga un
  // PDF. Así no se evalúan en el arranque del Worker ni en cada isolate.
  const [{ renderToBuffer }, { AthleteReportDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/exports/athlete-report"),
  ]);

  const doc = AthleteReportDocument({
    athleteName: athlete?.name ?? "Atleta",
    athleteEmail: athlete?.email ?? "",
    periodLabel: periodLabel(period),
    rangeLabel: `${data.period.from} a ${data.period.to}`,
    compliance: data.compliance.percent,
    completed: data.totals.completed,
    totalKm: round2(data.totals.km),
    totalMinutes: data.totals.minutes,
    streak: data.streak,
    avgRpe: data.avgRpe,
    vo2max: data.vo2max,
    thresholdHr: data.thresholdHr,
    rows: pdfRows,
    distribution: data.distribution ?? {},
  });

  const buffer = await renderToBuffer(doc);

  return {
    ok: true,
    data: {
      filename: `informe-${safeSlug(athlete?.name ?? "atleta")}.pdf`,
      contentType: "application/pdf",
      data: toUint8(buffer),
    },
  };
}

// ---------------------------------------------------------------------------
// XLSX — Atleta
// ---------------------------------------------------------------------------

export async function exportAthleteExcel(
  athleteId: string,
  period: MetricsPeriod,
): Promise<ServiceResult<ExportFile>> {
  const metrics = await getAthleteMetrics(athleteId, period);
  if (!metrics.ok) {
    return metrics;
  }
  const data = metrics.data;

  const [athlete] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, athleteId))
    .limit(1);

  const rows = await db
    .select({
      sessionDate: sessionAssignments.sessionDate,
      status: sessionAssignments.status,
      templateName: templates.name,
      sessionType: templates.sessionType,
      distanceKm: sessionRecords.distanceKm,
      durationMinutes: sessionRecords.durationMinutes,
      rpe: sessionRecords.rpe,
      comments: sessionRecords.comments,
      notDoneReason: sessionRecords.notDoneReason,
    })
    .from(sessionAssignments)
    .innerJoin(templates, eq(sessionAssignments.templateId, templates.id))
    .leftJoin(
      sessionRecords,
      eq(sessionRecords.assignmentId, sessionAssignments.id),
    )
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereSessionDateBetween(data.period.from, data.period.to),
      ),
    )
    .orderBy(asc(sessionAssignments.sessionDate));

  if (rows.length === 0) {
    return { ok: false, error: NO_DATA_MESSAGE };
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RunOsorno";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [
    { header: "Métrica", key: "metric", width: 32 },
    { header: "Valor", key: "value", width: 24 },
  ];
  summary.getRow(1).font = { bold: true };
  const summaryRows: [string, string | number][] = [
    ["Atleta", athlete?.name ?? ""],
    ["Email", athlete?.email ?? ""],
    ["Periodo", `${data.period.from} a ${data.period.to}`],
    ["Sesiones planificadas", data.totals.sessions],
    ["Sesiones completadas", data.totals.completed],
    ["Cumplimiento (%)", data.compliance.percent],
    ["Distancia total (km)", round2(data.totals.km)],
    ["Tiempo total (min)", data.totals.minutes],
    ["Racha actual (sesiones)", data.streak],
    ["RPE medio", data.avgRpe ?? "—"],
    ["RPE planificado", data.plannedRpe ?? "—"],
    ["VO2max estimado", data.vo2max ? round2(data.vo2max) : "—"],
    ["FC umbral", data.thresholdHr ?? "—"],
  ];
  for (const [metric, value] of summaryRows) {
    summary.addRow({ metric, value });
  }

  const sheet = workbook.addWorksheet("Sesiones");
  sheet.columns = [
    { header: "Fecha", key: "date", width: 14 },
    { header: "Plantilla", key: "template", width: 26 },
    { header: "Tipo", key: "type", width: 16 },
    { header: "Estado", key: "status", width: 16 },
    { header: "Distancia (km)", key: "km", width: 16 },
    { header: "Tiempo (min)", key: "minutes", width: 15 },
    { header: "RPE", key: "rpe", width: 8 },
    { header: "Motivo no realizada", key: "reason", width: 22 },
    { header: "Comentarios", key: "comments", width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      date: isoDate(row.sessionDate),
      template: row.templateName ?? "",
      type: row.sessionType ?? "",
      status: STATUS_LABEL[row.status] ?? row.status,
      km: row.distanceKm ? parseKm(row.distanceKm) : null,
      minutes: row.durationMinutes,
      rpe: row.rpe,
      reason: row.notDoneReason ?? "",
      comments: row.comments ?? "",
    });
  }

  const output = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      filename: `atleta-${safeSlug(athlete?.name ?? "atleta")}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: toUint8(output),
    },
  };
}

// ---------------------------------------------------------------------------
// XLSX — Team
// ---------------------------------------------------------------------------

export async function exportTeamExcel(
  teamId: string,
  period: MetricsPeriod,
): Promise<ServiceResult<ExportFile>> {
  const teamMetrics = await getTeamMetrics(teamId, period);
  if (!teamMetrics.ok) {
    return teamMetrics;
  }
  const data = teamMetrics.data;

  const [team] = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (data.athletes.length === 0) {
    return { ok: false, error: NO_DATA_MESSAGE };
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RunOsorno";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [
    { header: "Métrica", key: "metric", width: 36 },
    { header: "Valor", key: "value", width: 24 },
  ];
  summary.getRow(1).font = { bold: true };
  const summaryRows: [string, string | number][] = [
    ["Team", team?.name ?? ""],
    ["Periodo", `${data.period.from} a ${data.period.to}`],
    ["Atletas", data.athletes.length],
    ["Cumplimiento > 80%", data.buckets.high],
    ["Cumplimiento 50-80%", data.buckets.medium],
    ["Cumplimiento < 50%", data.buckets.low],
    ["Sin plan", data.buckets.withoutPlan],
    ["Carga media (km)", round2(data.averageLoadKm)],
    ["Alertas", data.alerts.length],
  ];
  for (const [metric, value] of summaryRows) {
    summary.addRow({ metric, value });
  }

  const sheet = workbook.addWorksheet("Atletas");
  sheet.columns = [
    { header: "Atleta", key: "name", width: 28 },
    { header: "Cumplimiento (%)", key: "compliance", width: 18 },
    { header: "Sesiones", key: "sessions", width: 12 },
    { header: "Completadas", key: "completed", width: 14 },
    { header: "Distancia (km)", key: "km", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const athlete of data.athletes) {
    sheet.addRow({
      name: athlete.name,
      compliance: athlete.compliance,
      sessions: athlete.sessions,
      completed: athlete.completed,
      km: round2(athlete.km),
    });
  }

  if (data.alerts.length > 0) {
    const alertsSheet = workbook.addWorksheet("Alertas");
    alertsSheet.columns = [
      { header: "Atleta", key: "athlete", width: 28 },
      { header: "Tipo", key: "kind", width: 18 },
      { header: "Mensaje", key: "message", width: 60 },
    ];
    alertsSheet.getRow(1).font = { bold: true };
    for (const alert of data.alerts) {
      alertsSheet.addRow({
        athlete: alert.athleteName,
        kind: alert.kind,
        message: alert.message,
      });
    }
  }

  const output = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      filename: `team-${safeSlug(team?.name ?? "team")}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: toUint8(output),
    },
  };
}

// ---------------------------------------------------------------------------
// XLSX — Grupo
// ---------------------------------------------------------------------------

export async function exportGroupExcel(
  groupId: string,
  period: MetricsPeriod,
): Promise<ServiceResult<ExportFile>> {
  const groupMetrics = await getGroupMetrics(groupId, period);
  if (!groupMetrics.ok) {
    return groupMetrics;
  }
  const data = groupMetrics.data;

  const [group] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (data.teams.length === 0 && data.coaches.length === 0) {
    return { ok: false, error: NO_DATA_MESSAGE };
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RunOsorno";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [
    { header: "Métrica", key: "metric", width: 32 },
    { header: "Valor", key: "value", width: 24 },
  ];
  summary.getRow(1).font = { bold: true };
  const summaryRows: [string, string | number][] = [
    ["Grupo", group?.name ?? ""],
    ["Periodo", `${data.period.from} a ${data.period.to}`],
    ["Teams", data.teams.length],
    ["Coaches", data.coaches.length],
  ];
  for (const [metric, value] of summaryRows) {
    summary.addRow({ metric, value });
  }

  if (data.teams.length > 0) {
    const teamsSheet = workbook.addWorksheet("Comparativa teams");
    teamsSheet.columns = [
      { header: "Team", key: "team", width: 26 },
      { header: "Coach", key: "coach", width: 26 },
      { header: "Cumplimiento (%)", key: "compliance", width: 18 },
      { header: "Sesiones", key: "sessions", width: 12 },
      { header: "Completadas", key: "completed", width: 14 },
      { header: "Distancia (km)", key: "km", width: 16 },
      { header: "Alertas", key: "alerts", width: 10 },
    ];
    teamsSheet.getRow(1).font = { bold: true };
    for (const team of data.teams) {
      teamsSheet.addRow({
        team: team.teamName,
        coach: team.coachName,
        compliance: team.compliance,
        sessions: team.sessions,
        completed: team.completed,
        km: round2(team.km),
        alerts: team.alerts,
      });
    }
  }

  if (data.coaches.length > 0) {
    const coachesSheet = workbook.addWorksheet("Cumplimiento coaches");
    coachesSheet.columns = [
      { header: "Coach", key: "coach", width: 26 },
      { header: "Teams", key: "teams", width: 10 },
      { header: "Cumplimiento (%)", key: "compliance", width: 18 },
      { header: "Sesiones", key: "sessions", width: 12 },
      { header: "Completadas", key: "completed", width: 14 },
    ];
    coachesSheet.getRow(1).font = { bold: true };
    for (const coach of data.coaches) {
      coachesSheet.addRow({
        coach: coach.coachName,
        teams: coach.teams,
        compliance: coach.compliance,
        sessions: coach.sessions,
        completed: coach.completed,
      });
    }
  }

  const output = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      filename: `grupo-${safeSlug(group?.name ?? "grupo")}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: toUint8(output),
    },
  };
}

// ---------------------------------------------------------------------------
// CSV — Global (admin)
// ---------------------------------------------------------------------------

/** Escapa un valor CSV según RFC 4180. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Genera el CSV con BOM para que Excel abra UTF-8 correctamente. */
function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

export async function exportGlobalCSV(
  entity: ExportEntity,
): Promise<ServiceResult<ExportFile>> {
  let header: string[];
  let rows: (string | number | null)[][];
  let filename: string;

  if (entity === "coaches") {
    header = [
      "Nombre",
      "Email",
      "Estado",
      "Grupos",
      "Equipos",
      "Creado",
      "Ultimo acceso",
    ];
    const coachRows = await db
      .select({
        name: users.name,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        groupsCount: sql<number>`(
          select count(*) from group_members gm where gm.user_id = ${users.id}
        )`,
        teamsCount: sql<number>`(
          select count(*) from teams t where t.coach_id = ${users.id}
        )`,
      })
      .from(users)
      .where(eq(users.role, "coach"))
      .orderBy(users.name);

    if (coachRows.length === 0) {
      return { ok: false, error: NO_DATA_MESSAGE };
    }
    rows = coachRows.map((row) => [
      row.name,
      row.email,
      row.isActive ? "Activo" : "Inactivo",
      Number(row.groupsCount),
      Number(row.teamsCount),
      isoDate(row.createdAt) || null,
      isoDate(row.lastLoginAt) || null,
    ]);
    filename = "coaches.csv";
  } else if (entity === "athletes") {
    header = [
      "Nombre",
      "Email",
      "Estado",
      "Equipos",
      "Fecha nacimiento",
      "Peso (kg)",
      "Altura (cm)",
      "FC maxima",
      "FC reposo",
    ];
    const athleteRows = await db
      .select({
        name: users.name,
        email: users.email,
        isActive: users.isActive,
        birthDate: sql<string | null>`(
          select ap.birth_date from athlete_profiles ap where ap.user_id = ${users.id}
        )`,
        weightKg: sql<string | null>`(
          select ap.weight_kg from athlete_profiles ap where ap.user_id = ${users.id}
        )`,
        heightCm: sql<string | null>`(
          select ap.height_cm from athlete_profiles ap where ap.user_id = ${users.id}
        )`,
        maxHr: sql<number | null>`(
          select ap.max_hr from athlete_profiles ap where ap.user_id = ${users.id}
        )`,
        restingHr: sql<number | null>`(
          select ap.resting_hr from athlete_profiles ap where ap.user_id = ${users.id}
        )`,
        teamsCount: sql<number>`(
          select count(*) from team_members tm where tm.athlete_id = ${users.id}
        )`,
      })
      .from(users)
      .where(eq(users.role, "athlete"))
      .orderBy(users.name);

    if (athleteRows.length === 0) {
      return { ok: false, error: NO_DATA_MESSAGE };
    }
    rows = athleteRows.map((row) => [
      row.name,
      row.email,
      row.isActive ? "Activo" : "Inactivo",
      Number(row.teamsCount),
      row.birthDate ? String(row.birthDate).slice(0, 10) : null,
      row.weightKg,
      row.heightCm,
      row.maxHr,
      row.restingHr,
    ]);
    filename = "atletas.csv";
  } else {
    header = [
      "Nombre",
      "Descripción",
      "Coaches",
      "Directores",
      "Equipos",
      "Atletas",
      "Creado",
    ];
    const groupRows = await db
      .select({
        name: groups.name,
        description: groups.description,
        createdAt: groups.createdAt,
        coachesCount: sql<number>`(
          select count(*) from group_members gm where gm.group_id = ${groups.id}
        )`,
        directorsCount: sql<number>`(
          select count(*) from group_members gm
          where gm.group_id = ${groups.id} and gm.is_director = 1
        )`,
        teamsCount: sql<number>`(
          select count(*) from teams t
          inner join group_members gm on gm.user_id = t.coach_id
          where gm.group_id = ${groups.id}
        )`,
        athletesCount: sql<number>`(
          select count(distinct tm.athlete_id) from team_members tm
          inner join teams t on t.id = tm.team_id
          inner join group_members gm on gm.user_id = t.coach_id
          where gm.group_id = ${groups.id}
        )`,
      })
      .from(groups)
      .orderBy(groups.name);

    if (groupRows.length === 0) {
      return { ok: false, error: NO_DATA_MESSAGE };
    }
    rows = groupRows.map((row) => [
      row.name,
      row.description,
      Number(row.coachesCount),
      Number(row.directorsCount),
      Number(row.teamsCount),
      Number(row.athletesCount),
      isoDate(row.createdAt) || null,
    ]);
    filename = "grupos.csv";
  }

  return {
    ok: true,
    data: {
      filename,
      contentType: "text/csv; charset=utf-8",
      data: new TextEncoder().encode(toCsv(header, rows)),
    },
  };
}

// ---------------------------------------------------------------------------
// Orquestación con permisos y auditoría
// ---------------------------------------------------------------------------

export type ExportRequest =
  | {
      format: "pdf";
      kind: "athlete";
      athleteId: string;
      period: MetricsPeriod;
    }
  | {
      format: "xlsx";
      kind: "athlete";
      athleteId: string;
      period: MetricsPeriod;
    }
  | { format: "xlsx"; kind: "team"; teamId: string; period: MetricsPeriod }
  | { format: "xlsx"; kind: "group"; groupId: string; period: MetricsPeriod }
  | { format: "csv"; kind: "global"; entity: ExportEntity };

/**
 * Ejecuta una exportación verificando permisos del actor.
 * Toda exportación queda registrada en `audit_logs`.
 */
export async function exportData(
  request: ExportRequest,
  actor: PermissionUser,
): Promise<ServiceResult<ExportFile>> {
  let result: ServiceResult<ExportFile>;

  switch (request.kind) {
    case "athlete": {
      if (!(await canViewAthlete(actor, request.athleteId))) {
        return {
          ok: false,
          error: "No tienes permiso para exportar estos datos",
        };
      }
      result =
        request.format === "pdf"
          ? await exportAthletePDF(request.athleteId, request.period)
          : await exportAthleteExcel(request.athleteId, request.period);
      break;
    }
    case "team": {
      if (actor.role === "coach") {
        if (!(await canManageTeam(actor, request.teamId))) {
          return { ok: false, error: "No tienes permiso para exportar este team" };
        }
      } else if (actor.role !== "admin") {
        return { ok: false, error: "No tienes permiso para exportar este team" };
      }
      result = await exportTeamExcel(request.teamId, request.period);
      break;
    }
    case "group": {
      if (!(await isDirector(actor, request.groupId))) {
        return { ok: false, error: "No tienes permiso para exportar este grupo" };
      }
      result = await exportGroupExcel(request.groupId, request.period);
      break;
    }
    case "global": {
      if (actor.role !== "admin") {
        return {
          ok: false,
          error: "Solo el administrador puede exportar datos globales",
        };
      }
      result = await exportGlobalCSV(request.entity);
      break;
    }
  }

  if (result.ok) {
    await logAudit({
      userId: actor.id,
      action: "data_exported",
      entityType: request.kind,
      entityId:
        request.kind === "athlete"
          ? request.athleteId
          : request.kind === "team"
            ? request.teamId
            : request.kind === "group"
              ? request.groupId
              : undefined,
      details: {
        format: request.format,
        filename: result.data.filename,
        entity: request.kind === "global" ? request.entity : undefined,
      },
    });
  }

  return result;
}
