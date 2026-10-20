import { formatPercent } from "@/lib/i18n/format";
import { Badge, complianceTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type AthleteComplianceChartProps = {
  athletes: { name: string; compliance: number }[];
};

function shortName(name: string): string {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

/**
 * Cumplimiento por atleta, en barras horizontales (Fase 27; sin `recharts`
 * desde la Fase 47).
 *
 * Esta no necesita SVG: son filas de HTML con la barra hecha con `width` en
 * porcentaje. Se pierde el tooltip, pero se gana que no hay nada que hidratar y
 * que el nombre se puede partear en dos líneas en lugar de truncarse, que es lo
 * que pasaba con el eje de categorías.
 */
export function AthleteComplianceChart({
  athletes,
}: AthleteComplianceChartProps) {
  if (athletes.length === 0) {
    return (
      <EmptyState
        title="Sin atletas con plan"
        description="No hay atletas con plan en el periodo seleccionado."
        compact
      />
    );
  }
  return (
    <ul className="metric-bars" data-testid="athlete-compliance-chart">
      {athletes.map((athlete) => (
        <li key={athlete.name} className="metric-bars-row">
          <span className="metric-bars-name" title={athlete.name}>
            {shortName(athlete.name)}
          </span>
          <span
            className="metric-bars-track"
            role="img"
            aria-label={`${athlete.name}: ${formatPercent(athlete.compliance)}`}
          >
            <span
              className="metric-bars-fill"
              style={{
                width: `${Math.min(100, Math.max(0, athlete.compliance))}%`,
              }}
            />
          </span>
          <Badge tone={complianceTone(athlete.compliance)}>
            {formatPercent(athlete.compliance)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
