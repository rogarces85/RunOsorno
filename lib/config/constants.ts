export const SESSION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "partial",
  "not_done",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_STATUS_META: Record<
  SessionStatus,
  { label: string; color: string }
> = {
  planned: { label: "Planificada", color: "secondary" },
  in_progress: { label: "En curso", color: "primary" },
  completed: { label: "Completada", color: "success" },
  partial: { label: "Parcial", color: "warning" },
  not_done: { label: "No realizada", color: "danger" },
};

export const BASE_SESSION_TYPES = [
  "series",
  "intervalos",
  "fondos",
  "tempo",
  "recuperacion",
  "descanso",
] as const;

export type BaseSessionType = (typeof BASE_SESSION_TYPES)[number];

export const SESSION_TYPE_LABELS: Record<BaseSessionType, string> = {
  series: "Series",
  intervalos: "Intervalos",
  fondos: "Fondos",
  tempo: "Tempo",
  recuperacion: "Recuperación",
  descanso: "Descanso",
};

export const SECTION_TYPES = [
  "warmup",
  "main",
  "cooldown",
  "stretching",
  "recovery",
  "strength",
  "custom",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  warmup: "Calentamiento",
  main: "Entrenamiento específico",
  cooldown: "Enfriamiento",
  stretching: "Estiramientos",
  recovery: "Recuperación",
  strength: "Musculación",
  custom: "Personalizado",
};

export const DEFAULT_NOT_DONE_REASONS = [
  "lesion",
  "trabajo",
  "enfermedad",
  "personal",
  "otro",
] as const;

export type NotDoneReason = (typeof DEFAULT_NOT_DONE_REASONS)[number];

export const NOT_DONE_REASON_LABELS: Record<NotDoneReason, string> = {
  lesion: "Lesión",
  trabajo: "Trabajo",
  enfermedad: "Enfermedad",
  personal: "Personal",
  otro: "Otro",
};
