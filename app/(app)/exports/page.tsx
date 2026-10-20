import { ExportButton } from "@/components/export/ExportButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
        <PageHeader
          title="Exportes"
          description="Descarga los datos de entrenamiento en PDF, Excel o CSV."
        />

        {isAdmin && (
          <Card title="Listados globales (CSV)" className="mb-3">
            <div className="row g-3">
              {[
                { entity: "coaches" as const, label: "Coaches" },
                { entity: "athletes" as const, label: "Atletas" },
                { entity: "groups" as const, label: "Grupos" },
              ].map((item) => (
                <div key={item.entity} className="col-md-4">
                  <Card title={item.label} level={3}>
                    <ExportButton
                      target={{
                        kind: "global",
                        entity: item.entity,
                        formats: ["csv"],
                      }}
                      label="Exportar CSV"
                      size="sm"
                    />
                  </Card>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isCoach && (
          <>
            {teams.length > 0 && (
              <Card title="Resumen de teams (Excel)" className="mb-3">
                <div className="row g-3">
                  {teams.map((team) => (
                    <div key={team.id} className="col-md-4">
                      <Card title={team.name} level={3}>
                        <ExportButton
                          target={{ kind: "team", teamId: team.id }}
                          label="Exportar Excel"
                          size="sm"
                        />
                      </Card>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {directorGroups.length > 0 && (
              <Card title="Métricas de grupo (Excel)" className="mb-3">
                <div className="row g-3">
                  {directorGroups.map((group) => (
                    <div key={group.id} className="col-md-4">
                      <Card title={group.name} level={3}>
                        <ExportButton
                          target={{ kind: "group", groupId: group.id }}
                          label="Exportar Excel"
                          size="sm"
                        />
                      </Card>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {teams.length === 0 && directorGroups.length === 0 && (
              <Card>
                <EmptyState
                  title="Sin equipos para exportar"
                  description="Todavía no tienes equipos para exportar."
                  actionLabel="Ir a mis teams"
                  actionHref="/coach/teams"
                />
              </Card>
            )}
          </>
        )}

        {!isAdmin && !isCoach && (
          <Card>
            <EmptyState
              title="Exportes no disponibles"
              description="Los exportes están disponibles para coaches y administradores."
            />
          </Card>
        )}
      </div>
    </div>
  );
}
