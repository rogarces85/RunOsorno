import Link from "next/link";
import { notFound } from "next/navigation";
import { ExportButton } from "@/components/export/ExportButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { getAthleteDetail } from "@/lib/services/athlete.service";
import { formatDateChile } from "@/lib/utils/date";
import { formatDistance, formatDuration, formatRpe } from "@/lib/utils/format";

export const instant = false;

export default async function CoachAthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole("coach");
  const { id } = await params;

  const result = await getAthleteDetail(id, {
    id: user.id,
    role: "coach",
  });
  if (!result.ok) {
    notFound();
  }
  const athlete = result.data;

  const compliancePct =
    athlete.totalSessions > 0
      ? Math.round((athlete.completedSessions / athlete.totalSessions) * 100)
      : null;

  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <Link href="/coach/athletes" className="link-secondary">
            ← Volver a atletas
          </Link>
        </div>
        <PageHeader
          title={athlete.name}
          description={athlete.email}
          actions={
            <>
              <ExportButton
                target={{
                  kind: "athlete",
                  athleteId: athlete.id,
                  formats: ["pdf", "xlsx"],
                }}
                size="sm"
                label="Exportar informe"
              />
              {athlete.isActive ? (
                <Badge tone="success">Activo</Badge>
              ) : (
                <Badge tone="danger">Inactivo</Badge>
              )}
            </>
          }
        />

        <div className="row">
          <div className="col-lg-4">
            <Card title="Datos físicos" className="mb-3">
              <dl className="row mb-0">
                <dt className="col-6 text-secondary">Nacimiento</dt>
                <dd className="col-6">
                  {athlete.profile?.birthDate
                    ? formatDateChile(new Date(athlete.profile.birthDate))
                    : "—"}
                </dd>
                <dt className="col-6 text-secondary">Peso</dt>
                <dd className="col-6">
                  {athlete.profile?.weightKg
                    ? `${athlete.profile.weightKg} kg`
                    : "—"}
                </dd>
                <dt className="col-6 text-secondary">Altura</dt>
                <dd className="col-6">
                  {athlete.profile?.heightCm
                    ? `${athlete.profile.heightCm} cm`
                    : "—"}
                </dd>
                <dt className="col-6 text-secondary">FC máxima</dt>
                <dd className="col-6">
                  {athlete.profile?.maxHr
                    ? `${athlete.profile.maxHr} ppm`
                    : "—"}
                </dd>
                <dt className="col-6 text-secondary">FC reposo</dt>
                <dd className="col-6">
                  {athlete.profile?.restingHr
                    ? `${athlete.profile.restingHr} ppm`
                    : "—"}
                </dd>
              </dl>
            </Card>

            <Card title="Teams" className="mb-3">
              {athlete.teams.length === 0 ? (
                <p className="text-secondary mb-0">Sin team asignado.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {athlete.teams.map((team) => (
                    <li key={team.id}>{team.name}</li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="col-lg-8">
            <Card title="Resumen" className="mb-3">
              <div className="row text-center">
                <div className="col">
                  <div className="app-stat-value app-numeric">
                    {compliancePct === null ? "—" : `${compliancePct}%`}
                  </div>
                  <div className="text-secondary">Cumplimiento</div>
                </div>
                <div className="col">
                  <div className="app-stat-value app-numeric">
                    {athlete.completedSessions}/{athlete.totalSessions}
                  </div>
                  <div className="text-secondary">Sesiones completadas</div>
                </div>
                <div className="col">
                  <div className="app-stat-value app-numeric">
                    {athlete.lastRecord
                      ? formatDistance(athlete.lastRecord.distanceKm)
                      : "—"}
                  </div>
                  <div className="text-secondary">Última sesión</div>
                </div>
              </div>
              {athlete.lastRecord && (
                <p className="text-secondary text-center mb-0 mt-3">
                  Último registro:{" "}
                  {formatDistance(athlete.lastRecord.distanceKm)} ·{" "}
                  {formatDuration(athlete.lastRecord.durationMinutes)} · RPE{" "}
                  {formatRpe(athlete.lastRecord.rpe)} ·{" "}
                  {formatDateChile(athlete.lastRecord.recordedAt)}
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
