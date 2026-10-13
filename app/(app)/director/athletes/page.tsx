import Link from "next/link";
import { notFound } from "next/navigation";
import { AthletesList } from "@/components/coach/AthletesList";
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
          <h2 className="page-title">Atletas del grupo</h2>
          <div className="card">
            <div className="card-body text-secondary text-center py-4">
              Necesitas ser Director Técnico de un grupo para ver sus atletas.{" "}
              <Link href="/coach/groups">Ver grupos disponibles</Link>
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
          <h2 className="page-title">Atletas del grupo</h2>
          <div className="alert alert-warning" role="alert">
            Necesitas ser Director Técnico del grupo para ver sus atletas.
          </div>
        </div>
      </div>
    );
  }

  const athletes = await getAllAthletes({ groupId });

  return (
    <div className="row">
      <div className="col-12">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="page-title mb-1">Atletas de {selected.name}</h2>
            <div className="text-secondary">
              Vista de solo lectura · {athletes.length} atleta
              {athletes.length === 1 ? "" : "s"} en el grupo
            </div>
          </div>
          <Link
            href={`/director/dashboard?group=${groupId}`}
            className="btn btn-outline-secondary btn-sm"
          >
            Ver resumen del grupo
          </Link>
        </div>

        {directorGroups.length > 1 ? (
          <div className="mb-3">
            <div className="btn-group" role="group" aria-label="Grupo">
              {directorGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/director/athletes?group=${group.id}`}
                  className={`btn btn-sm ${
                    group.id === groupId ? "btn-secondary" : "btn-outline-secondary"
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
