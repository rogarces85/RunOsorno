import Link from "next/link";
import { AnnouncementForm } from "@/components/director/AnnouncementForm";
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
          <h2 className="page-title">Anuncios</h2>
          <div className="card">
            <div className="card-body text-secondary text-center py-4">
              Necesitas ser Director Técnico de un grupo para enviar anuncios.{" "}
              <Link href="/coach/groups">Ver grupos disponibles</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultGroup = directorGroups[0];
  const director = await isDirector({ id: user.id, role: "coach" }, defaultGroup.id);

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title mb-3">Anuncios</h2>

        {!director ? (
          <div className="alert alert-warning" role="alert">
            Necesitas ser Director Técnico del grupo para enviar anuncios.
          </div>
        ) : (
          <>
            <p className="text-secondary">
              Envía un anuncio a todos los miembros de tu grupo. Se entrega como
              notificación in-app y, para los eventos críticos, por email.
            </p>
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
