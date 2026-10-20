import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectorToggle } from "@/components/admin/DirectorToggle";
import { RequestsPending } from "@/components/admin/RequestsPending";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table } from "@/components/ui/Table";
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
        <PageHeader
          title={group.name}
          description={group.description ?? undefined}
        />

        <div className="row">
          <div className="col-lg-7">
            <Card title="Coaches miembros" className="mb-3" bodyClassName="p-0">
              <Table label={`Coaches del grupo ${group.name}`}>
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
              </Table>
            </Card>
          </div>
          <div className="col-lg-5">
            <Card title="Solicitudes pendientes">
              <RequestsPending requests={requests} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
