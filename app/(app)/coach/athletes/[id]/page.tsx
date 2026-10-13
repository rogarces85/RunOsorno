import Link from "next/link";
import { notFound } from "next/navigation";
import { ExportButton } from "@/components/export/ExportButton";
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
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h2 className="page-title mb-1">{athlete.name}</h2>
            <p className="text-secondary mb-0">{athlete.email}</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <ExportButton
              target={{ kind: "athlete", athleteId: athlete.id, formats: ["pdf", "xlsx"] }}
              size="sm"
              label="Exportar informe"
            />
            {athlete.isActive ? (
              <span className="badge bg-green-lt">Activo</span>
            ) : (
              <span className="badge bg-red-lt">Inactivo</span>
            )}
          </div>
        </div>

        <div className="row">
          <div className="col-lg-4">
            <div className="card mb-3">
              <div className="card-header">
                <h3 className="card-title">Datos físicos</h3>
              </div>
              <div className="card-body">
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
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header">
                <h3 className="card-title">Teams</h3>
              </div>
              <div className="card-body">
                {athlete.teams.length === 0 ? (
                  <p className="text-secondary mb-0">Sin team asignado.</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {athlete.teams.map((team) => (
                      <li key={team.id}>{team.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card mb-3">
              <div className="card-header">
                <h3 className="card-title">Resumen</h3>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col">
                    <div className="h1 mb-0">
                      {compliancePct === null ? "—" : `${compliancePct}%`}
                    </div>
                    <div className="text-secondary">Cumplimiento</div>
                  </div>
                  <div className="col">
                    <div className="h1 mb-0">
                      {athlete.completedSessions}/{athlete.totalSessions}
                    </div>
                    <div className="text-secondary">Sesiones completadas</div>
                  </div>
                  <div className="col">
                    <div className="h1 mb-0">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
