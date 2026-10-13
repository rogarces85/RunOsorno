import { CoachesList } from "@/components/admin/CoachesList";
import { ExportButton } from "@/components/export/ExportButton";
import { requireRole } from "@/lib/auth/guards";
import { getCoaches } from "@/lib/services/user.service";

export const instant = false;

export default async function AdminCoachesPage() {
  await requireRole("admin");
  const coaches = await getCoaches({ status: "all" });

  return (
    <div className="row">
      <div className="col-12">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="page-title mb-0">Coaches</h2>
          <ExportButton
            target={{ kind: "global", entity: "coaches", formats: ["csv"] }}
            label="Exportar CSV"
            size="sm"
          />
        </div>
        <CoachesList coaches={coaches} />
      </div>
    </div>
  );
}
