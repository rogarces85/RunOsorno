import type { AthleteMetrics } from "@/lib/services/metric.service";
import { formatPercent } from "@/lib/i18n/format";
import { formatDistance } from "@/lib/utils/format";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";

type AthleteMetricsPanelProps = {
  metrics: AthleteMetrics;
};

function formatNullable(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function AthleteMetricsPanel({ metrics }: AthleteMetricsPanelProps) {
  const {
    compliance,
    weeklyLoad,
    streak,
    distribution,
    vo2max,
    thresholdHr,
    avgRpe,
    plannedRpe,
    hrZones,
  } = metrics;
  const distEntries = Object.entries(distribution).filter(
    ([, percent]) => percent > 0,
  );
  const rpeDelta =
    avgRpe !== null && plannedRpe !== null
      ? Math.round((avgRpe - plannedRpe) * 10) / 10
      : null;

  return (
    <>
      {hrZones === null ? (
        <Alert variant="warning">
          Datos insuficientes. Completa tu perfil con FC máx y FC reposo.
        </Alert>
      ) : null}

      <div className="row mb-3">
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">Cumplimiento</div>
            <div className="h1 mb-0 app-numeric">
              {formatPercent(compliance.percent)}
            </div>
            <div className="text-secondary small">
              {compliance.completed} de {compliance.total} sesiones
            </div>
          </Card>
        </div>
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">Carga semanal</div>
            <div className="h1 mb-0 app-numeric">
              {formatDistance(weeklyLoad.km)}
            </div>
            <div className="text-secondary small">
              {weeklyLoad.minutes} min · TSS {formatNullable(weeklyLoad.tss)} ·
              TRIMP {formatNullable(weeklyLoad.trimp)}
            </div>
          </Card>
        </div>
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">Racha</div>
            <div className="h1 mb-0 app-numeric">{streak}</div>
            <div className="text-secondary small">días consecutivos</div>
          </Card>
        </div>
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">Distribución</div>
            {distEntries.length === 0 ? (
              <div className="text-secondary">—</div>
            ) : (
              <div className="d-flex flex-wrap gap-1">
                {distEntries.map(([type, percent]) => (
                  <Badge key={type} tone="primary">
                    {type} {percent}%
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">VO2máx estimado</div>
            <div className="h2 mb-0 app-numeric">
              {vo2max === null ? "—" : Math.round(vo2max * 10) / 10}
            </div>
            <div className="text-secondary small">ml/kg/min</div>
          </Card>
        </div>
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">FC de umbral</div>
            <div className="h2 mb-0 app-numeric">
              {formatNullable(thresholdHr)}
            </div>
            <div className="text-secondary small">
              {thresholdHr === null ? "sin datos de FC" : "lpm estimados"}
            </div>
          </Card>
        </div>
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">RPE medio vs planificado</div>
            <div className="h2 mb-0 app-numeric">
              {formatNullable(avgRpe)}{" "}
              <span className="text-secondary h4">
                / {formatNullable(plannedRpe)}
              </span>
            </div>
            {rpeDelta === null ? (
              <div className="text-secondary small">real / planificado</div>
            ) : rpeDelta > 0 ? (
              <Badge tone="danger">+{rpeDelta} sobre objetivo</Badge>
            ) : rpeDelta < 0 ? (
              <Badge tone="primary">{rpeDelta} bajo objetivo</Badge>
            ) : (
              <Badge tone="success">en objetivo</Badge>
            )}
          </Card>
        </div>
      </div>

      {hrZones !== null ? (
        <div className="row mb-3">
          <div className="col-12">
            <Card title="Zonas de FC (Karvonen)" bodyClassName="p-0">
              <Table label="Zonas de frecuencia cardíaca" stackOnMobile>
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th className="text-end">Desde</th>
                    <th className="text-end">Hasta</th>
                  </tr>
                </thead>
                <tbody>
                  {hrZones.map((zone) => (
                    <tr key={zone.zone}>
                      <td data-label="Zona">Zona {zone.zone}</td>
                      <td className="text-end app-numeric" data-label="Desde">
                        {zone.from} lpm
                      </td>
                      <td className="text-end app-numeric" data-label="Hasta">
                        {zone.to} lpm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
