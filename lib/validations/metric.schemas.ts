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
