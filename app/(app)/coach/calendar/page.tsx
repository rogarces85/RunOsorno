import Link from "next/link";
import { notFound } from "next/navigation";
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
          <h1 className="page-title mb-0">Calendario</h1>
          <div className="text-secondary">Selecciona un team</div>
        </div>
        {teams.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-secondary">
              Aún no tienes teams creados.
            </div>
          </div>
        ) : (
          teams.map((team) => (
            <div className="col-12 col-md-6 col-lg-4 mb-3" key={team.id}>
              <div className="card">
                <div className="card-body">
                  <h2 className="card-title">{team.name}</h2>
                  <div className="text-secondary mb-3">
                    {team.athletesCount} atleta{team.athletesCount === 1 ? "" : "s"}
                  </div>
                  <Link
                    className="btn btn-primary"
                    href={`/coach/calendar?team=${team.id}`}
                  >
                    Seleccionar
                  </Link>
                </div>
              </div>
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
        <div className="d-flex align-items-center gap-2 mb-1">
          <Link href="/coach/calendar" className="btn btn-sm btn-ghost-secondary">
            ← Teams
          </Link>
          <h1 className="page-title mb-0">Calendario — {team.name}</h1>
        </div>
        <div className="text-secondary">Selecciona un atleta</div>
      </div>
      {athletes.length === 0 ? (
        <div className="col-12">
          <div className="alert alert-secondary">
            Este team aún no tiene atletas.
          </div>
        </div>
      ) : (
        athletes.map((athlete) => (
          <div className="col-12 col-md-6 col-lg-4 mb-3" key={athlete.athleteId}>
            <div className="card">
              <div className="card-body">
                <h2 className="card-title">{athlete.name}</h2>
                <div className="text-secondary mb-1">{athlete.email}</div>
                <div className="text-secondary small mb-3">
                  {athlete.completedSessions}/{athlete.totalSessions} sesiones completadas
                </div>
                <Link
                  className="btn btn-primary"
                  href={`/coach/calendar/${team.id}/${athlete.athleteId}`}
                >
                  Ver calendario
                </Link>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
