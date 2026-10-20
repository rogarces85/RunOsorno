import { TemplateList } from "@/components/templates/TemplateList";
import { PageHeader } from "@/components/ui/PageHeader";
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
        <PageHeader
          title="Biblioteca de plantillas"
          description="Tus sesiones reutilizables; puedes compartirlas con tu grupo."
        />
        <TemplateList templates={templates} groups={groups} />
      </div>
    </div>
  );
}
