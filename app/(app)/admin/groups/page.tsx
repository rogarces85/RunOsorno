import { GroupsList } from "@/components/admin/GroupsList";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportButton } from "@/components/export/ExportButton";
import { requireRole } from "@/lib/auth/guards";
import { getGroups } from "@/lib/services/group.service";

export const instant = false;

export default async function AdminGroupsPage() {
  await requireRole("admin");
  const groups = await getGroups();

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Grupos"
          description="Grupos o escuelas de la plataforma y las solicitudes de coaches."
          actions={
            <ExportButton
              target={{ kind: "global", entity: "groups", formats: ["csv"] }}
              label="Exportar CSV"
              size="sm"
            />
          }
        />
        <GroupsList groups={groups} />
      </div>
    </div>
  );
}
