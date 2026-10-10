import { OfficialTemplatesList } from "@/components/admin/OfficialTemplatesList";
import { requireRole } from "@/lib/auth/guards";
import { getOfficialTemplates } from "@/lib/services/template.service";

export const instant = false;

export default async function AdminTemplatesPage() {
  await requireRole("admin");
  const templates = await getOfficialTemplates();

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title">Plantillas oficiales</h2>
        <OfficialTemplatesList templates={templates} />
      </div>
    </div>
  );
}
