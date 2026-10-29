import { BIcon } from "@/components/ui/BIcon";
import { Card } from "@/components/ui/Card";

/**
 * `DashboardStatsCard` - Tarjeta de estadística para dashboards.
 *
 * Variantes disponibles:
 * - `elevated`: sombra elevada (--app-shadow-4), buena para resaltar métricas clave.
 * - `outlined`: borde transparente con hover en acento-ink, estilo "tarjeta de contacto".
 * - `gradient`: fondo con gradient sutil sobre superficie, para métricas secundarias.
 *
 * El número grande usa `--app-text-metric` y el label usa `--app-text-body`.
 * Los tones vienen del sistema semántico (success/warning/danger/info).
 */
export interface DashboardStatsCardItem {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "warning" | "danger" | "info" | "default";
  variant: "elevated" | "outlined" | "gradient";
  icon?: React.ReactNode;
}

/**
 * Props for the full card component.
 */
export interface DashboardStatsCardProps {
  items: DashboardStatsCardItem[];
}

/**
 * Tarjeta estadística para dashboards coach/atleta.
 *
 * Cada `item` se renderiza como una tarjeta independiente dentro de un
 * contenedor horizontal. Las variantes controlan elevación, borde y fondo.
 *
 * - `elevated`: shadow-4 + border none
 * - `outlined`: border transparent, hover border-accent-ink
 * - `gradient`: radial gradient sutil + border none
 */
export function DashboardStatsCard({ items }: DashboardStatsCardProps) {
  return (
    <div className="row g-3">
      {items.map((item) => (
        <Card
          key={item.key}
          className="h-100 p-4"
        >
          <div className="d-flex align-items-start justify-content-between">
            <div className="flex-1">
              <h6 className="mb-2 fw-bold fs-4 text-app-ink">{item.value}</h6>
              <p className="fs-6 text-app-ink-2">{item.label}</p>
              {item.sub && <p className="fs-6 small text-app-ink-2">{item.sub}</p>}
            </div>
            {item.icon && (
              <span className="text-app-accent-ink fs-4">
                {item.icon}
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}