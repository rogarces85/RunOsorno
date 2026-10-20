import { AnnouncementForm } from "@/components/director/AnnouncementForm";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { isDirector } from "@/lib/permissions";
import { getDirectorGroups } from "@/lib/services/group.service";

export const instant = false;

export default async function DirectorAnnouncementsPage() {
  const { user } = await requireRole("coach");
  const directorGroups = await getDirectorGroups(user.id);

  if (directorGroups.length === 0) {
    return (
      <div className="row">
        <div className="col-12">
          <PageHeader title="Anuncios" />
          <div className="card">
            <div className="card-body">
              <EmptyState
                title="Sin grupos asignados"
                description="Necesitas ser Director Técnico de un grupo para enviar anuncios."
                actionLabel="Ver grupos disponibles"
                actionHref="/coach/groups"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultGroup = directorGroups[0];
  const director = await isDirector(
    { id: user.id, role: "coach" },
    defaultGroup.id,
  );

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Anuncios"
          description="Envía un anuncio a todos los miembros de tu grupo. Se entrega como notificación in-app y, para los eventos críticos, por email."
        />

        {!director ? (
          <Alert variant="warning">
            Necesitas ser Director Técnico del grupo para enviar anuncios.
          </Alert>
        ) : (
          <>
            <AnnouncementForm
              groups={directorGroups.map((group) => ({
                id: group.id,
                name: group.name,
              }))}
              defaultGroupId={defaultGroup.id}
              senderName={user.name}
            />
          </>
        )}
      </div>
    </div>
  );
}
