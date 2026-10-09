import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectorToggle } from "@/components/admin/DirectorToggle";
import { RequestsPending } from "@/components/admin/RequestsPending";
import { requireRole } from "@/lib/auth/guards";
import {
  getGroupById,
  getGroupMembers,
  getPendingRequests,
} from "@/lib/services/group.service";

export const instant = false;

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const group = await getGroupById(id);
  if (!group) {
    notFound();
  }

  const [members, requests] = await Promise.all([
    getGroupMembers(id),
    getPendingRequests(id),
  ]);

  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <Link href="/admin/groups" className="link-secondary">
            ← Volver a grupos
          </Link>
        </div>
        <h2 className="page-title">{group.name}</h2>
        {group.description && (
          <p className="text-secondary">{group.description}</p>
        )}

        <div className="row">
          <div className="col-lg-7">
            <div className="card mb-3">
              <div className="card-header">
                <h3 className="card-title">Coaches miembros</h3>
              </div>
              <div className="table-responsive">
                <table className="table table-vcenter card-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol en el grupo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-secondary text-center py-4"
                        >
                          Sin coaches miembros aún.
                        </td>
                      </tr>
                    )}
                    {members.map((member) => (
                      <tr key={member.userId}>
                        <td className="fw-medium">{member.name}</td>
                        <td className="text-secondary">{member.email}</td>
                        <td>
                          <DirectorToggle
                            groupId={id}
                            userId={member.userId}
                            isDirector={member.isDirector}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Solicitudes pendientes</h3>
              </div>
              <div className="card-body">
                <RequestsPending requests={requests} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
