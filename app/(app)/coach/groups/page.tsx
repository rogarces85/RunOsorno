import { GroupRequestCard } from "@/components/coach/GroupRequestCard";
import { requireRole } from "@/lib/auth/guards";
import { getAvailableGroups } from "@/lib/services/group.service";

export const instant = false;

export default async function CoachGroupsPage() {
  const { user } = await requireRole("coach");
  const available = await getAvailableGroups(user.id);

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title">Unirse a un grupo</h2>
        <p className="text-secondary">
          Estos son los grupos a los que aún no perteneces. Solicita unirse y el
          administrador la revisará.
        </p>
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
