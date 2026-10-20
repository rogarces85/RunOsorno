import { GroupRequestCard } from "@/components/coach/GroupRequestCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { getAvailableGroups } from "@/lib/services/group.service";

export const instant = false;

export default async function CoachGroupsPage() {
  const { user } = await requireRole("coach");
  const available = await getAvailableGroups(user.id);

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Unirse a un grupo"
          description="Estos son los grupos a los que aún no perteneces. Solicita unirse y el administrador la revisará."
        />
        {available.length === 0 ? (
          <div className="card">
            <div className="card-body text-secondary text-center py-4">
              No hay grupos disponibles (ya eres miembro o tienes una solicitud
              pendiente en todos).
            </div>
          </div>
        ) : (
          <div className="row">
            {available.map((group) => (
              <div key={group.id} className="col-md-6 col-xl-4 mb-3">
                <GroupRequestCard group={group} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
