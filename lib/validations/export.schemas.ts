import { z } from "zod";
import { metricsPeriodSchema } from "./metric.schemas";

/** Entidades que el admin puede exportar globalmente (tarea 33.6). */
export const exportEntitySchema = z.enum(["coaches", "athletes", "groups"]);
export type ExportEntity = z.infer<typeof exportEntitySchema>;

export const exportFormatSchema = z.enum(["pdf", "xlsx", "csv"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

/**
 * Solicitud de exportación.
 *
 * Se discrimina por la combinación `kind:format` porque `format` por sí solo
 * no es único: "xlsx" sirve para atleta, team y grupo.
 */
export const exportDataSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("athlete:pdf"),
    kind: z.literal("athlete"),
    format: z.literal("pdf"),
    athleteId: z.uuid("ID inválido"),
    period: metricsPeriodSchema,
  }),
  z.object({
    target: z.literal("athlete:xlsx"),
    kind: z.literal("athlete"),
    format: z.literal("xlsx"),
    athleteId: z.uuid("ID inválido"),
    period: metricsPeriodSchema,
  }),
  z.object({
    target: z.literal("team:xlsx"),
    kind: z.literal("team"),
    format: z.literal("xlsx"),
    teamId: z.uuid("ID inválido"),
    period: metricsPeriodSchema,
  }),
  z.object({
    target: z.literal("group:xlsx"),
    kind: z.literal("group"),
    format: z.literal("xlsx"),
    groupId: z.uuid("ID inválido"),
    period: metricsPeriodSchema,
  }),
  // La exportación global solo existe en CSV: no tiene datos de periodo.
  z.object({
    target: z.literal("global:csv"),
    kind: z.literal("global"),
    format: z.literal("csv"),
    entity: exportEntitySchema,
  }),
]);

export type ExportDataInput = z.infer<typeof exportDataSchema>;

export type ExportFile = {
  filename: string;
  contentType: string;
  /** Archivo generado en memoria (Buffer en Node, Uint8Array en edge). */
  data: Uint8Array;
};
