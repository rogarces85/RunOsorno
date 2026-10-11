import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const metricsPeriodSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("season") }),
    z.object({
      kind: z.literal("year"),
      year: z.number().int().min(2000).max(2100).optional(),
    }),
    z.object({ kind: z.literal("custom"), from: isoDate, to: isoDate }),
  ])
  .refine((period) => period.kind !== "custom" || period.from <= period.to, {
    message: "El rango de fechas es inválido",
    path: ["from"],
  });

export type MetricsPeriod = z.infer<typeof metricsPeriodSchema>;

export const athleteMetricsInputSchema = z.object({
  athleteId: z.uuid("ID inválido"),
  period: metricsPeriodSchema,
});

export const teamMetricsInputSchema = z.object({
  teamId: z.uuid("ID inválido"),
  period: metricsPeriodSchema,
});

export const groupMetricsInputSchema = z.object({
  groupId: z.uuid("ID inválido"),
  period: metricsPeriodSchema,
});

export function periodFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): MetricsPeriod {
  const kind = typeof params.period === "string" ? params.period : "season";
  if (kind === "year") {
    const year =
      typeof params.year === "string" ? Number.parseInt(params.year, 10) : NaN;
    return Number.isInteger(year) && year >= 2000 && year <= 2100
      ? { kind: "year", year }
      : { kind: "year" };
  }
  if (kind === "custom") {
    const from = typeof params.from === "string" ? params.from : "";
    const to = typeof params.to === "string" ? params.to : "";
    const parsed = metricsPeriodSchema.safeParse({ kind: "custom", from, to });
    if (parsed.success) {
      return parsed.data;
    }
  }
  return { kind: "season" };
}

export function periodToQuery(period: MetricsPeriod): string {
  const params = new URLSearchParams();
  params.set("period", period.kind);
  if (period.kind === "year" && period.year !== undefined) {
    params.set("year", String(period.year));
  }
  if (period.kind === "custom") {
    params.set("from", period.from);
    params.set("to", period.to);
  }
  return params.toString();
}
