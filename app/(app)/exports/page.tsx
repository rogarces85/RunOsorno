import Link from "next/link";
import { ExportButton } from "@/components/export/ExportButton";
import { requireAuth } from "@/lib/auth/guards";
import { getMyGroups } from "@/lib/services/group.service";
import { getTeamsByCoach } from "@/lib/services/team.service";
import { isDirector } from "@/lib/permissions";

export const instant = false;

/**
 * Página de exportaciones (Fase 33).
 *
 * Centraliza los botones de exportación del rol:
 *   - Admin  : CSV global de coaches, atletas y grupos
 *   - Coach   : Excel del team e informes de sus atletas
 *   - Director: Excel agregado del grupo
 *
 * Cualquier rol autenticado puede verla; el contenido depende del rol.
 */
export default async function ExportsPage() {
  const { user } = await requireAuth();

  const isAdmin = user.role === "admin";
  const isCoach = user.role === "coach";

  const teams = isCoach ? await getTeamsByCoach(user.id) : [];
  const groups = isCoach ? await getMyGroups(user.id) : [];
  const directorGroups: { id: string; name: string }[] = [];

  for (const group of groups) {
    if (await isDirector({ id: user.id, role: "coach" }, group.id)) {
      directorGroups.push({ id: group.id, name: group.name });
    }
  }

  return (
    <div className="row">
      <div className="col-12">
        <h1 className="page-title mb-1">Exportes</h1>
        <p className="text-secondary">
          Descarga los datos de entrenamiento en PDF, Excel o CSV.
        </p>

        {isAdmin && (
          <div className="card mb-3">
            <div className="card-header">
              <h2 className="card-title">Listados globales (CSV)</h2>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {(
                  [
                    { entity: "coaches" as const, label: "Coaches" },
                    { entity: "athletes" as const, label: "Atletas" },
                    { entity: "groups" as const, label: "Grupos" },
                  ]
                ).map((item) => (
                  <div key={item.entity} className="col-md-4">
                    <div className="card">
                      <div className="card-body">
                        <h3 className="card-title">{item.label}</h3>
                        <ExportButton
                          target={{
                            kind: "global",
                            entity: item.entity,
                            formats: ["csv"],
                          }}
                          label="Exportar CSV"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isCoach && (
          <>
            {teams.length > 0 && (
              <div className="card mb-3">
                <div className="card-header">
                  <h2 className="card-title">Resumen de teams (Excel)</h2>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {teams.map((team) => (
                      <div key={team.id} className="col-md-4">
                        <div className="card">
                          <div className="card-body">
                            <h3 className="card-title">{team.name}</h3>
                            <ExportButton
                              target={{ kind: "team", teamId: team.id }}
                              label="Exportar Excel"
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {directorGroups.length > 0 && (
              <div className="card mb-3">
                <div className="card-header">
                  <h2 className="card-title">
                    Métricas de grupo (Excel)
                  </h2>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {directorGroups.map((group) => (
                      <div key={group.id} className="col-md-4">
                        <div className="card">
                          <div className="card-body">
                            <h3 className="card-title">{group.name}</h3>
                            <ExportButton
                              target={{ kind: "group", groupId: group.id }}
                              label="Exportar Excel"
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {teams.length === 0 && directorGroups.length === 0 && (
              <div className="card">
                <div className="card-body text-secondary text-center py-4">
                  Todavía no tienes equipos para exportar.{" "}
                  <Link href="/coach/teams">Ir a mis teams</Link>
                </div>
              </div>
            )}
          </>
        )}

        {!isAdmin && !isCoach && (
          <div className="card">
            <div className="card-body text-secondary text-center py-4">
              Los exportes están disponibles para coaches y administradores.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
