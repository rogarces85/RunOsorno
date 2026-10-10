import { SESSION_TYPE_LABELS } from "@/lib/config/constants";

export function formatDistance(km: number | string | null | undefined): string {
  if (km === null || km === undefined) {
    return "—";
  }
  const value = typeof km === "string" ? Number(km) : km;
  if (Number.isNaN(value)) {
    return "—";
  }
  return `${value.toLocaleString("es-CL", { maximumFractionDigits: 2 })} km`;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "—";
  }
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) {
    return `${rest} min`;
  }
  if (rest === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${rest} min`;
}

export function formatRpe(rpe: number | null | undefined): string {
  if (rpe === null || rpe === undefined || Number.isNaN(rpe)) {
    return "—";
  }
  return `${rpe}/10`;
}

export function formatSessionType(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const trimmed = value.trim();
  const key = trimmed.toLowerCase() as keyof typeof SESSION_TYPE_LABELS;
  return SESSION_TYPE_LABELS[key] ?? trimmed;
}
