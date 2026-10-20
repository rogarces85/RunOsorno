import { OfficialTemplatesList } from "@/components/admin/OfficialTemplatesList";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { getOfficialTemplates } from "@/lib/services/template.service";

export const instant = false;

export default async function AdminTemplatesPage() {
  await requireRole("admin");
  const templates = await getOfficialTemplates();

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Plantillas oficiales"
          description="Plantillas disponibles para todos los coaches, clonables y editables."
        />
        <OfficialTemplatesList templates={templates} />
      </div>
    </div>
  );
}
