import Link from "next/link";
import { notFound } from "next/navigation";
import { AthletesList } from "@/components/coach/AthletesList";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";
import { isDirector } from "@/lib/permissions";
import { getAllAthletes } from "@/lib/services/athlete.service";
import { getDirectorGroups } from "@/lib/services/group.service";

export const instant = false;

export default async function DirectorAthletesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireRole("coach");
  const params = await searchParams;
  const directorGroups = await getDirectorGroups(user.id);

  if (directorGroups.length === 0) {
    return (
      <div className="row">
        <div className="col-12">
          <PageHeader title="Atletas del grupo" />
          <div className="card">
            <div className="card-body">
              <EmptyState
                title="Sin grupos asignados"
                description="Necesitas ser Director Técnico de un grupo para ver sus atletas."
                actionLabel="Ver grupos disponibles"
                actionHref="/coach/groups"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupId =
    typeof params.group === "string" &&
    directorGroups.some((group) => group.id === params.group)
      ? params.group
      : directorGroups[0].id;
  const selected = directorGroups.find((group) => group.id === groupId);

  if (!selected) {
    notFound();
  }

  const director = await isDirector({ id: user.id, role: "coach" }, groupId);

  if (!director) {
    return (
      <div className="row">
        <div className="col-12">
          <PageHeader title="Atletas del grupo" />
          <Alert variant="warning">
            Necesitas ser Director Técnico del grupo para ver sus atletas.
          </Alert>
        </div>
      </div>
    );
  }

  const athletes = await getAllAthletes({ groupId });

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title={`Atletas de ${selected.name}`}
          description={`Vista de solo lectura · ${athletes.length} atleta${athletes.length === 1 ? "" : "s"} en el grupo`}
          actions={
            <Link
              href={`/director/dashboard?group=${groupId}`}
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              Ver resumen del grupo
            </Link>
          }
        />

        {directorGroups.length > 1 ? (
          <div className="mb-3">
            <div className="btn-group" role="group" aria-label="Grupo">
              {directorGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/director/athletes?group=${group.id}`}
                  className={`btn btn-sm ${
                    group.id === groupId
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                >
                  {group.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <AthletesList athletes={athletes} teams={[]} />
      </div>
    </div>
  );
}
