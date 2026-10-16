import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { requireRole } from "@/lib/auth/guards";

export const instant = false;

export default async function NewTemplatePage() {
  await requireRole("coach");

  return (
    <div className="row">
      <div className="col-12 col-xl-9">
        <h1 className="page-title">Nueva plantilla</h1>
        <TemplateEditor />
      </div>
    </div>
  );
}
