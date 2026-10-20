import { CoachesList } from "@/components/admin/CoachesList";
import { ExportButton } from "@/components/export/ExportButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { getCoaches } from "@/lib/services/user.service";

export const instant = false;

export default async function AdminCoachesPage() {
  await requireRole("admin");
  const coaches = await getCoaches({ status: "all" });

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Coaches"
          description="Altas, estado y acceso de los entrenadores de la plataforma."
          actions={
            <ExportButton
              target={{ kind: "global", entity: "coaches", formats: ["csv"] }}
              label="Exportar CSV"
              size="sm"
            />
          }
        />
        <CoachesList coaches={coaches} />
      </div>
    </div>
  );
}
