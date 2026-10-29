import { BIcon } from "@/components/ui/BIcon";

/**
 * `ProgressBarDashboard` - Barra de progreso para dashboards.
 *
 * Muestra un porcentaje de cumplimiento o meta con tres variantes de color:
 * - `success`: cumplimiento >= 80% → verde cancha `--app-success`
 * - `warning`: 50-79% → ámbar `--app-warning`
 * - `danger`: < 50% → rojo `--app-danger`
 *
 * La barra tiene fija altura (`var(--app-radius-chip)` = 4px) y el porcentaje
 * centrado encima. El label va debajo en texto pequeño.
 *
 * Props:
 * - `value`: número 0-100 (porcentaje)
 * - `label`: texto descriptivo (ej. "Cumplimiento del team")
 * - `variant`: "success" | "warning" | "danger" (define el color de la barra)
 */
export interface ProgressBarDashboardProps {
  value: number;
  label: string;
  variant?: "success" | "warning" | "danger";
}

/** Barra de progreso para dashboards. */
export function ProgressBarDashboard({
  value,
  label,
  variant = "success",
}: ProgressBarDashboardProps) {
  const progress = Math.max(0, Math.min(100, value));
  const isSuccess = variant === "success";
  const isWarning = variant === "warning";
  const isDanger = variant === "danger";

  const barColor = isSuccess
    ? "--app-success"
    : isWarning
      ? "--app-warning"
      : "--app-danger";

  const labelColor = isSuccess
    ? "--app-success-on"
    : isWarning
      ? "--app-warning-on"
      : "--app-danger-on";

  return (
    <div className="progress-bar-dashboard">
      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      <span className="progress-bar-label" style={{ color: labelColor }}>
        {label}: {progress}%
      </span>
      {value > 0 && (
        <span className="progress-bar-percent">
          {progress}%
        </span>
      )}
    </div>
  );
}