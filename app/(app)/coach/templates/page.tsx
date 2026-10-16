import { TemplateList } from "@/components/templates/TemplateList";
import { requireRole } from "@/lib/auth/guards";
import { getMyGroups } from "@/lib/services/group.service";
import { getTemplatesByCoach } from "@/lib/services/template.service";

export const instant = false;

export default async function CoachTemplatesPage() {
  const { user } = await requireRole("coach");
  const [templates, groups] = await Promise.all([
    getTemplatesByCoach(user.id),
    getMyGroups(user.id),
  ]);

  return (
    <div className="row">
      <div className="col-12">
        <h1 className="page-title">Biblioteca de plantillas</h1>
        <TemplateList templates={templates} groups={groups} />
      </div>
    </div>
  );
}
