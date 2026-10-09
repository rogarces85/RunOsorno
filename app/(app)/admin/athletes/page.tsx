import { AthletesList } from "@/components/coach/AthletesList";
import { requireRole } from "@/lib/auth/guards";
import {
  getAllAthletes,
  getAllTeamOptions,
  type AthleteFilters,
} from "@/lib/services/athlete.service";
import { getCoaches } from "@/lib/services/user.service";
import { getGroups } from "@/lib/services/group.service";

export const instant = false;

function parseFilters(
  params: Record<string, string | string[] | undefined>,
): AthleteFilters {
  const single = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value ? value : undefined;
  };
  const status = single("status");
  return {
    coachId: single("coachId"),
    teamId: single("teamId"),
    groupId: single("groupId"),
    status: status === "active" || status === "inactive" ? status : "all",
  };
}

export default async function AdminAthletesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin");
  const filters = parseFilters(await searchParams);

  const [athletes, coaches, groups, teamOptions] = await Promise.all([
    getAllAthletes(filters),
    getCoaches({ status: "active" }),
    getGroups(),
    getAllTeamOptions(),
  ]);

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title">Atletas</h2>

        <form method="get" action="/admin/athletes" className="card mb-3">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label" htmlFor="filter-coach">
                  Coach
                </label>
                <select
                  id="filter-coach"
                  name="coachId"
                  className="form-select"
                  defaultValue={filters.coachId ?? ""}
                >
                  <option value="">Todos</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="filter-team">
                  Team
                </label>
                <select
                  id="filter-team"
                  name="teamId"
                  className="form-select"
                  defaultValue={filters.teamId ?? ""}
                >
                  <option value="">Todos</option>
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} — {team.coachName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="filter-group">
                  Grupo
                </label>
                <select
                  id="filter-group"
                  name="groupId"
                  className="form-select"
                  defaultValue={filters.groupId ?? ""}
                >
                  <option value="">Todos</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="filter-status">
                  Estado
                </label>
                <select
                  id="filter-status"
                  name="status"
                  className="form-select"
                  defaultValue={filters.status ?? "all"}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
              <div className="col-md-2 d-flex gap-2">
                <button type="submit" className="btn btn-primary flex-fill">
                  Filtrar
                </button>
                <a href="/admin/athletes" className="btn btn-ghost-secondary">
                  Limpiar
                </a>
              </div>
            </div>
          </div>
        </form>

        <AthletesList
          athletes={athletes}
          teams={[]}
          canTransfer
          teamOptions={teamOptions}
        />
      </div>
    </div>
  );
}
