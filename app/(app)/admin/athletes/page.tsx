import { AthletesList } from "@/components/coach/AthletesList";
import { ExportButton } from "@/components/export/ExportButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
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
        <PageHeader
          title="Atletas"
          description="Listado global con filtros por coach, team, grupo y estado."
          actions={
            <ExportButton
              target={{ kind: "global", entity: "athletes", formats: ["csv"] }}
              label="Exportar CSV"
              size="sm"
            />
          }
        />

        <form method="get" action="/admin/athletes" className="card mb-3">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <Field id="filter-coach" label="Coach">
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
                </Field>
              </div>
              <div className="col-md-3">
                <Field id="filter-team" label="Team">
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
                </Field>
              </div>
              <div className="col-md-2">
                <Field id="filter-group" label="Grupo">
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
                </Field>
              </div>
              <div className="col-md-2">
                <Field id="filter-status" label="Estado">
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
                </Field>
              </div>
              <div className="col-md-2 d-flex gap-2">
                <Button type="submit" className="flex-fill">
                  Filtrar
                </Button>
                <a
                  href="/admin/athletes"
                  className={buttonClassName({ variant: "ghost" })}
                >
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
