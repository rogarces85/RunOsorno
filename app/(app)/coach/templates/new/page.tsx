import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";

export const instant = false;

export default async function NewTemplatePage() {
  await requireRole("coach");

  return (
    <div className="row">
      <div className="col-12 col-xl-9">
        <PageHeader
          title="Nueva plantilla"
          description="Define calentamiento, trabajo específico y enfriamiento."
        />
        <TemplateEditor />
      </div>
    </div>
  );
}
