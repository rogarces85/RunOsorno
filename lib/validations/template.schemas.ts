import { z } from "zod";
import { SECTION_TYPES } from "@/lib/config/constants";

export const sectionSchema = z.object({
  id: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  title: z
    .string()
    .trim()
    .min(1, "Ingresa el título de la sección")
    .max(100, "Máximo 100 caracteres"),
  type: z.enum(SECTION_TYPES),
  content: z
    .string()
    .trim()
    .min(1, "Describe la sección")
    .max(2000, "Máximo 2000 caracteres"),
});

export const templateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa un nombre (mínimo 2 caracteres)")
    .max(150, "Máximo 150 caracteres"),
  sessionType: z
    .string()
    .trim()
    .min(1, "Selecciona o escribe un tipo de sesión")
    .max(50, "Máximo 50 caracteres"),
  structure: z
    .array(sectionSchema)
    .min(1, "Agrega al menos una sección con contenido"),
});

export const templateIdSchema = z.uuid("ID inválido");

export const cloneTemplateSchema = z.object({
  templateId: z.uuid("ID inválido"),
  newName: z
    .string()
    .trim()
    .min(2, "Ingresa un nombre (mínimo 2 caracteres)")
    .max(150, "Máximo 150 caracteres"),
});

export const shareTemplateSchema = z.object({
  templateId: z.uuid("ID inválido"),
  groupId: z.uuid("ID inválido"),
});

export type SectionInput = z.infer<typeof sectionSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type CloneTemplateInput = z.infer<typeof cloneTemplateSchema>;
export type ShareTemplateInput = z.infer<typeof shareTemplateSchema>;
