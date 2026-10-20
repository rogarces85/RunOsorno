import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";
import { getTeamAthletes, getTeamsByCoach } from "@/lib/services/team.service";

export const instant = false;

export default async function CoachCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireRole("coach");
  const params = await searchParams;
  const teamId = typeof params.team === "string" ? params.team : null;
  const teams = await getTeamsByCoach(user.id);

  if (!teamId) {
    return (
      <div className="row">
        <div className="col-12 mb-3">
          <PageHeader title="Calendario" description="Selecciona un team" />
        </div>
        {teams.length === 0 ? (
          <div className="col-12">
            <Alert variant="secondary">Aún no tienes teams creados.</Alert>
          </div>
        ) : (
          teams.map((team) => (
            <div className="col-12 col-md-6 col-lg-4 mb-3" key={team.id}>
              <Card title={team.name} className="h-100">
                <div className="text-secondary mb-3">
                  {team.athletesCount} atleta
                  {team.athletesCount === 1 ? "" : "s"}
                </div>
                <Link
                  className={buttonClassName()}
                  href={`/coach/calendar?team=${team.id}`}
                >
                  Seleccionar
                </Link>
              </Card>
            </div>
          ))
        )}
      </div>
    );
  }

  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team) {
    notFound();
  }
  const athletesResult = await getTeamAthletes(teamId, user.id);
  const athletes = athletesResult.ok ? athletesResult.data : [];

  return (
    <div className="row">
      <div className="col-12 mb-3">
        <div className="mb-3">
          <Link
            href="/coach/calendar"
            className={buttonClassName({ variant: "ghost", size: "sm" })}
          >
            ← Teams
          </Link>
        </div>
        <PageHeader
          title={`Calendario — ${team.name}`}
          description="Selecciona un atleta"
        />
      </div>
      {athletes.length === 0 ? (
        <div className="col-12">
          <Alert variant="secondary">Este team aún no tiene atletas.</Alert>
        </div>
      ) : (
        athletes.map((athlete) => (
          <div
            className="col-12 col-md-6 col-lg-4 mb-3"
            key={athlete.athleteId}
          >
            <Card title={athlete.name} className="h-100">
              <div className="text-secondary mb-1">{athlete.email}</div>
              <div className="text-secondary small mb-3">
                {athlete.completedSessions}/{athlete.totalSessions} sesiones
                completadas
              </div>
              <Link
                className={buttonClassName()}
                href={`/coach/calendar/${team.id}/${athlete.athleteId}`}
              >
                Ver calendario
              </Link>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
