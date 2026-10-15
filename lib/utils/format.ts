import { SESSION_TYPE_LABELS } from "@/lib/config/constants";
import { formatNumber, t } from "@/lib/i18n/format";

/**
 * Números y unidades (Fase 46).
 *
 * El formateo numérico y los textos de unidad salen de `messages/es-CL.json`, de
 * modo que un número y su unidad viajan juntos y no pueden quedar
 * descuadrados: `{value} km` está en los mensajes, no repartido en la plantilla
 * de cada componente.
 */
export function formatDistance(km: number | string | null | undefined): string {
  if (km === null || km === undefined) {
    return t("common.notAvailable");
  }
  const value = typeof km === "string" ? Number(km) : km;
  if (Number.isNaN(value)) {
    return t("common.notAvailable");
  }
  return t("units.kilometers", { value: formatNumber(value) });
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return t("common.notAvailable");
  }
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) {
    return t("units.minutes", { value: rest });
  }
  if (rest === 0) {
    return t("units.hours", { value: hours });
  }
  return t("units.hoursAndMinutes", { hours, minutes: rest });
}

export function formatRpe(rpe: number | null | undefined): string {
  if (rpe === null || rpe === undefined || Number.isNaN(rpe)) {
    return t("common.notAvailable");
  }
  return t("units.rpe", { value: rpe });
}

export function formatSessionType(value: string | null | undefined): string {
  if (!value) {
    return t("common.notAvailable");
  }
  const trimmed = value.trim();
  const key = trimmed.toLowerCase() as keyof typeof SESSION_TYPE_LABELS;
  return SESSION_TYPE_LABELS[key] ?? trimmed;
}
