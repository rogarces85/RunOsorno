/**
 * Esquemas de configuración, exportación, notificaciones y periodo de métricas
 * (Fase 41, tarea 41.11).
 *
 * Estos cuatro archivos comparten una característica: la columna `settings` es
 * JSON libre, así que el esquema es lo único que impide que un valor con la
 * forma equivocada llegue a la base. También `metricsPeriodSchema`, que decide
 * qué rango de fechas calcula cada gráfica.
 */

import { describe, expect, it } from "vitest";
import {
  emailFromSchema,
  limitsSettingsSchema,
  notDoneReasonsSchema,
  updateLimitsSchema,
} from "@/lib/validations/settings.schemas";
import { exportDataSchema } from "@/lib/validations/export.schemas";
import { markAsReadSchema } from "@/lib/validations/notification.schemas";
import {
  metricsPeriodSchema,
  periodFromSearchParams,
  periodToQuery,
} from "@/lib/validations/metric.schemas";

const UUID = "3f1a5d7c-1f1a-4a1a-9a1a-1a1a1a1a1a1a";

function primerMensaje(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  return result.success ? null : (result.error?.issues[0]?.message ?? "");
}

describe("límites de configuración (34.5 / 40.6)", () => {
  const validos = {
    maxTeamsPerCoach: 10,
    maxAthletesPerTeam: 50,
    editWindowHours: 48,
    alertNoRecordDays: 7,
  };

  it("acepta los valores por defecto", () => {
    expect(limitsSettingsSchema.safeParse(validos).success).toBe(true);
    expect(updateLimitsSchema.safeParse(validos).success).toBe(true);
  });

  it("rechaza ceros, negativos y fracciones", () => {
    expect(
      primerMensaje(
        updateLimitsSchema.safeParse({ ...validos, maxTeamsPerCoach: 0 }),
      ),
    ).toBe("Mínimo 1");
    expect(
      primerMensaje(
        updateLimitsSchema.safeParse({ ...validos, editWindowHours: -1 }),
      ),
    ).toBe("Mínimo 1");
    expect(
      primerMensaje(
        updateLimitsSchema.safeParse({ ...validos, alertNoRecordDays: 1.5 }),
      ),
    ).toBe("Debe ser un número entero");
    expect(
      primerMensaje(
        updateLimitsSchema.safeParse({ ...validos, maxTeamsPerCoach: "10" }),
      ),
    ).toBe("Debe ser un número");
  });

  it("rechaza valores fuera de rango (semanas de edición)", () => {
    expect(
      primerMensaje(
        updateLimitsSchema.safeParse({ ...validos, editWindowHours: 24 * 31 }),
      ),
    ).toBe("Máximo 720");
  });
});

describe("motivos de no realizada (34.6)", () => {
  it("acepta la lista por defecto y rechaza duplicados o vacía", () => {
    expect(
      notDoneReasonsSchema.safeParse([
        { id: "lesion", label: "Lesión" },
        { id: "trabajo", label: "Trabajo" },
      ]).success,
    ).toBe(true);

    expect(primerMensaje(notDoneReasonsSchema.safeParse([]))).toBe(
      "Debe existir al menos un motivo",
    );

    expect(
      primerMensaje(
        notDoneReasonsSchema.safeParse([
          { id: "lesion", label: "Lesión" },
          { id: "lesion", label: "Lesión otra vez" },
        ]),
      ),
    ).toBe("No puede haber motivos duplicados");
  });

  it("exige identificadores sin acentos ni espacios", () => {
    expect(
      primerMensaje(
        notDoneReasonsSchema.safeParse([
          { id: "Lesión grave", label: "Lesión" },
        ]),
      ),
    ).toMatch(/minúsculas/);
  });
});

describe("remitente de email (34.8)", () => {
  it("exige que tenga un correo dentro", () => {
    expect(
      emailFromSchema.safeParse("RunOsorno <no-reply@runosorno.cl>").success,
    ).toBe(true);
    // El mensaje sugiere el formato con nombre, pero la comprobación real solo
    // exige que haya un correo: una dirección suelta también vale (Resend la
    // acepta igual). El test documenta la conducta, no la que sugiere el texto.
    expect(emailFromSchema.safeParse("no-reply@runosorno.cl").success).toBe(
      true,
    );
    expect(primerMensaje(emailFromSchema.safeParse("RunOsorno"))).toBe(
      "Usa el formato: Nombre <correo@dominio.cl>",
    );
    expect(primerMensaje(emailFromSchema.safeParse(""))).toBe(
      "El remitente es obligatorio",
    );
  });
});

describe("exportDataSchema (33)", () => {
  it("acepta cada destino con su formato", () => {
    expect(
      exportDataSchema.safeParse({
        target: "athlete:pdf",
        kind: "athlete",
        format: "pdf",
        athleteId: UUID,
        period: { kind: "season" },
      }).success,
    ).toBe(true);
    expect(
      exportDataSchema.safeParse({
        target: "team:xlsx",
        kind: "team",
        format: "xlsx",
        teamId: UUID,
        period: { kind: "season" },
      }).success,
    ).toBe(true);
    expect(
      exportDataSchema.safeParse({
        target: "global:csv",
        kind: "global",
        format: "csv",
        entity: "coaches",
      }).success,
    ).toBe(true);
  });

  it("exige que kind y format sean coherentes con el destino", () => {
    // `target` dice athlete:pdf pero se declara team: si no se cruzara el
    // esquema, el servicio recibiría un tipo de export que no pidió.
    expect(
      exportDataSchema.safeParse({
        target: "athlete:pdf",
        kind: "team",
        format: "pdf",
        teamId: UUID,
        period: { kind: "season" },
      }).success,
    ).toBe(false);
  });

  it("no acepta destinos inventados ni UUIDs rotos", () => {
    expect(
      exportDataSchema.safeParse({
        target: "atleta:pdf",
        kind: "athlete",
        format: "pdf",
      }).success,
    ).toBe(false);

    const conUuidRoto = exportDataSchema.safeParse({
      target: "athlete:pdf",
      kind: "athlete",
      format: "pdf",
      athleteId: "no-es-uuid",
      period: { kind: "season" },
    });
    expect(conUuidRoto.success).toBe(false);
    expect(
      conUuidRoto.success
        ? null
        : conUuidRoto.error.issues.some((i) => i.message === "ID inválido"),
    ).toBe(true);
  });
});

describe("notificaciones", () => {
  it("markAsRead exige un id", () => {
    expect(markAsReadSchema.safeParse({ id: UUID }).success).toBe(true);
    expect(markAsReadSchema.safeParse({ id: "" }).success).toBe(false);
  });
});

describe("periodo de métricas (26.4)", () => {
  it("acepta temporada, año y rango personalizado", () => {
    expect(metricsPeriodSchema.safeParse({ kind: "season" }).success).toBe(
      true,
    );
    expect(
      metricsPeriodSchema.safeParse({ kind: "year", year: 2026 }).success,
    ).toBe(true);
    expect(
      metricsPeriodSchema.safeParse({
        kind: "custom",
        from: "2026-01-01",
        to: "2026-12-31",
      }).success,
    ).toBe(true);
  });

  it("rechaza un rango invertido o con fecha mal formada", () => {
    expect(
      primerMensaje(
        metricsPeriodSchema.safeParse({
          kind: "custom",
          from: "2026-12-31",
          to: "2026-01-01",
        }),
      ),
    ).toBe("El rango de fechas es inválido");

    expect(
      primerMensaje(
        metricsPeriodSchema.safeParse({
          kind: "custom",
          from: "01/01/2026",
          to: "2026-12-31",
        }),
      ),
    ).toBe("Fecha inválida");
  });

  it("periodFromSearchParams cae en temporada si los parámetros no sirven", () => {
    expect(periodFromSearchParams({})).toEqual({ kind: "season" });
    expect(periodFromSearchParams({ period: "inventado" })).toEqual({
      kind: "season",
    });
    expect(periodFromSearchParams({ period: "year", year: "2026" })).toEqual({
      kind: "year",
      year: 2026,
    });
    expect(periodFromSearchParams({ period: "year", year: "abc" })).toEqual({
      kind: "year",
    });
    expect(
      periodFromSearchParams({
        period: "custom",
        from: "2026-01-01",
        to: "2026-12-31",
      }),
    ).toEqual({ kind: "custom", from: "2026-01-01", to: "2026-12-31" });
  });

  it("periodToQuery es el inverso", () => {
    expect(periodToQuery({ kind: "season" })).toBe("period=season");
    expect(periodToQuery({ kind: "year", year: 2026 })).toBe(
      "period=year&year=2026",
    );
    expect(
      periodToQuery({ kind: "custom", from: "2026-01-01", to: "2026-12-31" }),
    ).toBe("period=custom&from=2026-01-01&to=2026-12-31");
  });
});
