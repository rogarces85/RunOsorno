import { describe, expect, it } from "vitest";
import { calcCompliance } from "@/lib/metrics/compliance";
import { calcWeeklyLoad, type LoadRecord } from "@/lib/metrics/load";
import { calcProgression } from "@/lib/metrics/progression";
import { calcTypeDistribution } from "@/lib/metrics/distribution";
import { calcStreak } from "@/lib/metrics/streaks";
import { calcHRZones, calcThresholdHr, calcTRIMP } from "@/lib/metrics/heart-rate";
import { calcPlannedRpe, plannedRpeTarget } from "@/lib/metrics/rpe";
import { estimateVO2max } from "@/lib/metrics/vo2max";
import { detectAlerts } from "@/lib/metrics/alerts";
import { getMetricsPeriod } from "@/lib/services/metric.service";
import { metricsPeriodSchema } from "@/lib/validations/metric.schemas";

const REFERENCE = "2026-10-11"; // domingo

describe("calcCompliance (25.11)", () => {
  it("retorna el % correcto con datos de prueba", () => {
    const result = calcCompliance([
      { status: "completed" },
      { status: "completed" },
      { status: "partial" },
      { status: "planned" },
    ]);
    expect(result).toEqual({ percent: 50, completed: 2, total: 4 });
  });

  it("retorna 0% con lista vacía", () => {
    expect(calcCompliance([])).toEqual({ percent: 0, completed: 0, total: 0 });
  });

  it("retorna 100% cuando todo está completado", () => {
    const result = calcCompliance([
      { status: "completed" },
      { status: "completed" },
    ]);
    expect(result.percent).toBe(100);
  });

  it("retorna 0% cuando hay sesiones pero ninguna completada (41.3)", () => {
    const result = calcCompliance([
      { status: "planned" },
      { status: "not_done" },
      { status: "partial" },
    ]);
    // La parcial no cuenta como completada: es lo que ve el coach en el panel.
    expect(result).toEqual({ percent: 0, completed: 0, total: 3 });
  });
});

describe("calcWeeklyLoad (25.12)", () => {
  const weekStart = "2026-10-05"; // lunes

  it("suma correctamente km y minutos dentro de la semana", () => {
    const records: LoadRecord[] = [
      { date: "2026-10-06", distanceKm: "10.5", durationMinutes: 55, rpe: 7 },
      { date: "2026-10-09", distanceKm: 5, durationMinutes: 30, rpe: 5 },
      { date: "2026-10-04", distanceKm: 99, durationMinutes: 99 }, // semana previa
      { date: "2026-10-12", distanceKm: 99, durationMinutes: 99 }, // semana siguiente
    ];
    const load = calcWeeklyLoad(records, weekStart);
    expect(load.km).toBe(15.5);
    expect(load.minutes).toBe(85);
  });

  it("estima TSS con RPE y lo omite sin RPE", () => {
    const withRpe = calcWeeklyLoad(
      [{ date: "2026-10-06", distanceKm: 10, durationMinutes: 60, rpe: 8 }],
      weekStart,
    );
    expect(withRpe.tss).toBe(80); // 1h @ RPE 8 → 80

    const withoutRpe = calcWeeklyLoad(
      [{ date: "2026-10-06", distanceKm: 10, durationMinutes: 60 }],
      weekStart,
    );
    expect(withoutRpe.tss).toBeNull();
  });

  it("calcula TRIMP solo cuando se pasa el perfil de FC", () => {
    const records: LoadRecord[] = [
      { date: "2026-10-06", distanceKm: 8, durationMinutes: 60, rpe: 7 },
    ];
    expect(calcWeeklyLoad(records, weekStart).trimp).toBeNull();
    const withProfile = calcWeeklyLoad(records, weekStart, {
      maxHr: 190,
      restingHr: 50,
    });
    expect(withProfile.trimp).toBeTypeOf("number");
    expect(withProfile.trimp).toBeGreaterThan(0);
  });
});

describe("calcProgression (25.3)", () => {
  it("retorna las últimas N semanas en orden cronológico con ceros", () => {
    const records: LoadRecord[] = [
      { date: "2026-09-16", distanceKm: 20, durationMinutes: 120 }, // semana 2026-09-14
      { date: "2026-10-07", distanceKm: 12.5, durationMinutes: 70 }, // semana 2026-10-05
    ];
    const points = calcProgression(records, 4, REFERENCE);
    expect(points).toHaveLength(4);
    expect(points.map((p) => p.week)).toEqual([
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
      "2026-10-05",
    ]);
    expect(points[0]).toEqual({ week: "2026-09-14", km: 20, minutes: 120 });
    expect(points[1]).toEqual({ week: "2026-09-21", km: 0, minutes: 0 });
    expect(points[3]).toEqual({ week: "2026-10-05", km: 12.5, minutes: 70 });
  });
});

describe("calcTypeDistribution (25.4)", () => {
  it("retorna porcentajes por tipo que suman 100", () => {
    const result = calcTypeDistribution([
      { sessionType: "fondos" },
      { sessionType: "fondos" },
      { sessionType: "fondos" },
      { sessionType: "series" },
      { sessionType: "series" },
      { sessionType: "tempo" },
    ]);
    expect(result).toEqual({ fondos: 50, series: 33, tempo: 17 });
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("ajusta el redondeo para sumar exactamente 100", () => {
    const result = calcTypeDistribution([
      { sessionType: "series" },
      { sessionType: "fondos" },
      { sessionType: "tempo" },
    ]);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("retorna objeto vacío sin datos", () => {
    expect(calcTypeDistribution([])).toEqual({});
  });
});

describe("calcStreak (25.13)", () => {
  it("detecta racha consecutiva terminando hoy", () => {
    const streak = calcStreak(
      [
        { date: "2026-10-11", status: "completed" },
        { date: "2026-10-10", status: "completed" },
        { date: "2026-10-09", status: "completed" },
        { date: "2026-10-07", status: "completed" }, // hueco el 8
      ],
      REFERENCE,
    );
    expect(streak).toBe(3);
  });

  it("la racha sigue viva si ayer completó y hoy aún no", () => {
    const streak = calcStreak(
      [
        { date: "2026-10-10", status: "completed" },
        { date: "2026-10-09", status: "completed" },
      ],
      REFERENCE,
    );
    expect(streak).toBe(2);
  });

  it("detecta racha larga sin límite (41.7)", () => {
    // 21 días consecutivos terminando en la fecha de referencia.
    const registros = Array.from({ length: 21 }, (_, i) => {
      const day = new Date("2026-10-11T12:00:00Z");
      day.setUTCDate(day.getUTCDate() - i);
      return { date: day.toISOString().slice(0, 10), status: "completed" };
    });
    expect(calcStreak(registros, REFERENCE)).toBe(21);
  });

  it("ignora estados que no son completed y retorna 0 sin racha", () => {
    expect(
      calcStreak(
        [
          { date: "2026-10-11", status: "partial" },
          { date: "2026-10-10", status: "not_done" },
        ],
        REFERENCE,
      ),
    ).toBe(0);
    expect(calcStreak([], REFERENCE)).toBe(0);
  });
});

describe("calcHRZones (25.14)", () => {
  it("genera zonas Karvonen 1-5 correctas", () => {
    const zones = calcHRZones(190, 50);
    expect(zones).toEqual([
      { zone: 1, from: 120, to: 134 },
      { zone: 2, from: 134, to: 148 },
      { zone: 3, from: 148, to: 162 },
      { zone: 4, from: 162, to: 176 },
      { zone: 5, from: 176, to: 190 },
    ]);
  });

  it("lanza error con datos de FC inválidos", () => {
    expect(() => calcHRZones(50, 190)).toThrow("Datos de FC inválidos");
    expect(() => calcHRZones(190, 0)).toThrow("Datos de FC inválidos");
  });
});

describe("calcTRIMP (25.7)", () => {
  it("calcula TRIMP con perfil y registros con RPE", () => {
    const trimp = calcTRIMP(
      [
        { durationMinutes: 60, rpe: 8 },
        { durationMinutes: 30, rpe: 6 },
      ],
      { maxHr: 190, restingHr: 50 },
    );
    expect(trimp).toBeTypeOf("number");
    expect(trimp).toBeGreaterThan(0);
  });

  it("retorna null sin datos de FC o sin registros válidos", () => {
    expect(
      calcTRIMP([{ durationMinutes: 60, rpe: 8 }], { maxHr: null, restingHr: null }),
    ).toBeNull();
    expect(
      calcTRIMP([{ durationMinutes: 0, rpe: null }], {
        maxHr: 190,
        restingHr: 50,
      }),
    ).toBeNull();
  });
});

describe("estimateVO2max (25.8)", () => {
  it("estima VO2max con FC máx/reposo y registros", () => {
    const vo2 = estimateVO2max([{ durationMinutes: 45 }], {
      maxHr: 190,
      restingHr: 50,
    });
    expect(vo2).toBe(58.1); // 15.3 × 190/50 = 58.14
  });

  it("retorna null sin datos suficientes", () => {
    expect(
      estimateVO2max([{ durationMinutes: 45 }], { maxHr: null, restingHr: 48 }),
    ).toBeNull();
    expect(
      estimateVO2max([], { maxHr: 190, restingHr: 50 }),
    ).toBeNull();
    expect(
      estimateVO2max([{ durationMinutes: 0 }], { maxHr: 190, restingHr: 50 }),
    ).toBeNull();
  });
});

describe("detectAlerts (25.15)", () => {
  it("genera alerta cuando el atleta lleva > X días sin registrar", () => {
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      [{ athleteId: "a1", date: "2026-10-01", status: "completed" }],
      { daysWithoutLogging: 7 },
      REFERENCE,
    );
    const noLogging = alerts.find((alert) => alert.kind === "no_logging");
    expect(noLogging).toBeDefined();
    expect(noLogging?.message).toContain("10 días");
  });

  it("alerta al atleta sin ningún registro", () => {
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      [],
      {},
      REFERENCE,
    );
    expect(
      alerts.some(
        (alert) =>
          alert.kind === "no_logging" &&
          alert.message.includes("no tiene registros"),
      ),
    ).toBe(true);
  });

  it("no alerta a quien registró hoy", () => {
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      [{ athleteId: "a1", date: REFERENCE, status: "completed" }],
      {},
      REFERENCE,
    );
    expect(alerts.some((alert) => alert.kind === "no_logging")).toBe(false);
  });

  it("detecta caída de carga entre semanas", () => {
    const records = [
      // semana previa (2026-09-28 a 2026-10-04): 20 km
      { athleteId: "a1", date: "2026-09-30", distanceKm: 10 },
      { athleteId: "a1", date: "2026-10-02", distanceKm: 10 },
      // semana actual (2026-10-05 a 2026-10-11): 5 km
      { athleteId: "a1", date: "2026-10-06", distanceKm: 5 },
      { athleteId: "a1", date: REFERENCE, status: "completed" },
    ];
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      records,
      { loadDropPercent: 40 },
      REFERENCE,
    );
    const drop = alerts.find((alert) => alert.kind === "load_drop");
    expect(drop).toBeDefined();
    expect(drop?.message).toContain("75%");
  });

  it("detecta RPE alto sostenido por N días", () => {
    const records = [
      { athleteId: "a1", date: "2026-10-11", status: "completed", rpe: 9 },
      { athleteId: "a1", date: "2026-10-10", status: "completed", rpe: 8 },
      { athleteId: "a1", date: "2026-10-09", status: "completed", rpe: 9 },
      { athleteId: "a1", date: "2026-10-06", status: "completed", rpe: 3 },
    ];
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      records,
      { highRpeDays: 3, highRpe: 8 },
      REFERENCE,
    );
    const highRpe = alerts.find((alert) => alert.kind === "high_rpe");
    expect(highRpe).toBeDefined();
    expect(highRpe?.message).toContain("3 días seguidos");
  });

  it("respeta configuración personalizada", () => {
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      [{ athleteId: "a1", date: "2026-10-08", status: "completed" }],
      { daysWithoutLogging: 14 },
      REFERENCE,
    );
    expect(alerts).toHaveLength(0);
  });

  // ---------------------------------------------------------------------
  // 47.5: los registros llegan acotados a una ventana corta, así que la
  // fecha real del último registro va aparte. Sin esto, un atleta con el
  // último registro hace meses saldría como "no tiene registros".
  // ---------------------------------------------------------------------
  it("usa lastActivity cuando la ventana no alcanza el último registro", () => {
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      [],
      {},
      REFERENCE,
      { a1: "2026-06-01" },
    );
    const noLogging = alerts.find((alert) => alert.kind === "no_logging");
    expect(noLogging?.message).toBe("Ana lleva 132 días sin registrar sesiones.");
    expect(noLogging?.message).not.toContain("no tiene registros");
  });

  it("lastActivity manda sobre la fecha deducida de la ventana", () => {
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      [{ athleteId: "a1", date: REFERENCE, status: "completed" }],
      {},
      REFERENCE,
      { a1: "2026-09-20" },
    );
    expect(
      alerts.find((alert) => alert.kind === "no_logging")?.message,
    ).toContain("21 días");
  });

  it("sin lastActivity sigue usando la ventana (comportamiento anterior)", () => {
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      [{ athleteId: "a1", date: "2026-10-01", status: "completed" }],
      {},
      REFERENCE,
    );
    expect(
      alerts.find((alert) => alert.kind === "no_logging")?.message,
    ).toContain("10 días");
  });

  it("un atleta con lastActivity en la ventana no dispara alerta", () => {
    const alerts = detectAlerts(
      [{ id: "a1", name: "Ana" }],
      [{ athleteId: "a1", date: "2026-10-10", status: "completed" }],
      {},
      REFERENCE,
      { a1: "2026-10-10" },
    );
    expect(alerts.some((alert) => alert.kind === "no_logging")).toBe(false);
  });
});

describe("getMetricsPeriod (26.4)", () => {
  it("resuelve la temporada austral (1 ago → 31 jul)", () => {
    const season = getMetricsPeriod({ kind: "season" });
    expect(season.from).toMatch(/^\d{4}-08-01$/);
    expect(season.to).toMatch(/^\d{4}-07-31$/);
    expect(season.from < season.to).toBe(true);
  });

  it("resuelve año con year explícito y con year por defecto", () => {
    expect(getMetricsPeriod({ kind: "year", year: 2025 })).toEqual({
      from: "2025-01-01",
      to: "2025-12-31",
    });
    const currentYear = String(new Date().getFullYear());
    expect(getMetricsPeriod({ kind: "year" })).toEqual({
      from: `${currentYear}-01-01`,
      to: `${currentYear}-12-31`,
    });
  });

  it("respeta el rango personalizado", () => {
    expect(
      getMetricsPeriod({ kind: "custom", from: "2026-03-01", to: "2026-04-30" }),
    ).toEqual({ from: "2026-03-01", to: "2026-04-30" });
  });

  it("el schema acepta periodos válidos y rechaza rangos invertidos", () => {
    expect(metricsPeriodSchema.safeParse({ kind: "season" }).success).toBe(true);
    expect(
      metricsPeriodSchema.safeParse({ kind: "year", year: 2026 }).success,
    ).toBe(true);
    const inverted = metricsPeriodSchema.safeParse({
      kind: "custom",
      from: "2026-05-01",
      to: "2026-04-01",
    });
    expect(inverted.success).toBe(false);
    const badDate = metricsPeriodSchema.safeParse({
      kind: "custom",
      from: "01-05-2026",
      to: "2026-05-02",
    });
    expect(badDate.success).toBe(false);
  });
});

describe("calcThresholdHr (28.3)", () => {
  it("estima la FC de umbral al 90% de la reserva de Karvonen", () => {
    expect(calcThresholdHr(190, 48)).toBe(176);
    expect(calcThresholdHr(180, 60)).toBe(168);
  });

  it("retorna null con datos de FC inválidos", () => {
    expect(calcThresholdHr(48, 190)).toBeNull();
    expect(calcThresholdHr(180, 180)).toBeNull();
    expect(calcThresholdHr(180, 0)).toBeNull();
    expect(calcThresholdHr(Number.NaN, 50)).toBeNull();
  });
});

describe("plannedRpe / calcPlannedRpe (28.4)", () => {
  it("resuelve el objetivo por tipo de sesión sin importar mayúsculas ni acentos", () => {
    expect(plannedRpeTarget("Series")).toBe(8);
    expect(plannedRpeTarget("series")).toBe(8);
    expect(plannedRpeTarget("Tempo")).toBe(7);
    expect(plannedRpeTarget("Fondo")).toBe(6);
    expect(plannedRpeTarget("Recuperación")).toBe(3);
    expect(plannedRpeTarget("recovery")).toBe(3);
  });

  it("retorna null para tipos sin objetivo conocido", () => {
    expect(plannedRpeTarget("Descanso")).toBeNull();
    expect(plannedRpeTarget("Fuerza")).toBeNull();
    expect(plannedRpeTarget("")).toBeNull();
  });

  it("promedia solo los tipos con objetivo conocido", () => {
    expect(calcPlannedRpe(["Series", "Fondo", "Descanso"])).toBe(7);
    expect(calcPlannedRpe(["Series", "Series", "Tempo"])).toBe(7.7);
    expect(calcPlannedRpe(["Descanso", "Fuerza"])).toBeNull();
    expect(calcPlannedRpe([])).toBeNull();
  });
});
