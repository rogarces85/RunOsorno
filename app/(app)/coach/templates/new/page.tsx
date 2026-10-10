import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { requireRole } from "@/lib/auth/guards";

export const instant = false;

export default async function NewTemplatePage() {
  await requireRole("coach");

  return (
    <div className="row">
      <div className="col-12 col-xl-9">
        <h2 className="page-title">Nueva plantilla</h2>
        <TemplateEditor />
      </div>
    </div>
  );
}
