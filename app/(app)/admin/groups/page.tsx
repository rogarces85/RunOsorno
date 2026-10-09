import { GroupsList } from "@/components/admin/GroupsList";
import { requireRole } from "@/lib/auth/guards";
import { getGroups } from "@/lib/services/group.service";

export const instant = false;

export default async function AdminGroupsPage() {
  await requireRole("admin");
  const groups = await getGroups();

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title">Grupos</h2>
        <GroupsList groups={groups} />
      </div>
    </div>
  );
}
