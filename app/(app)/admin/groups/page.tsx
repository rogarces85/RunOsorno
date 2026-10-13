import { GroupsList } from "@/components/admin/GroupsList";
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
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="page-title mb-0">Grupos</h2>
          <ExportButton
            target={{ kind: "global", entity: "groups", formats: ["csv"] }}
            label="Exportar CSV"
            size="sm"
          />
        </div>
        <GroupsList groups={groups} />
      </div>
    </div>
  );
}
