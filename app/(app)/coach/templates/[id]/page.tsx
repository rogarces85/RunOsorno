import Link from "next/link";
import { notFound } from "next/navigation";
import { CloneButton } from "@/components/templates/CloneButton";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { SECTION_TYPE_LABELS } from "@/lib/config/constants";
import {
  getTemplateById,
  getTemplateVisibility,
} from "@/lib/services/template.service";
import { formatSessionType } from "@/lib/utils/format";

export const instant = false;

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole("coach");
  const { id } = await params;

  const template = await getTemplateById(id);
  if (!template) {
    notFound();
  }

  const visibility = await getTemplateVisibility(template, user);
  if (!visibility.canView) {
    notFound();
  }

  if (visibility.canEdit) {
    return (
      <div className="row">
        <div className="col-12 col-xl-9">
          <PageHeader title="Editar plantilla" />
          <TemplateEditor
            templateId={template.id}
            initial={{
              name: template.name,
              sessionType: template.sessionType,
              structure: template.structure,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12 col-xl-9">
        <div className="mb-3">
          <Link href="/coach/templates" className="link-secondary">
            ← Volver a la biblioteca
          </Link>
        </div>
        <PageHeader
          title={template.name}
          description="Esta plantilla es de solo lectura. Clónala para crear tu propia versión editable."
          actions={
            <CloneButton
              template={{ id: template.id, name: template.name }}
              variant="secondary"
            />
          }
        />
        <div className="d-flex gap-1 flex-wrap mb-3">
          <Badge tone="neutral">
            {formatSessionType(template.sessionType)}
          </Badge>
          {template.isOfficial && <Badge tone="info">Oficial</Badge>}
          {template.isShared && template.groupName && (
            <Badge tone="primary">Compartida · {template.groupName}</Badge>
          )}
        </div>
        {template.structure.map((section, index) => (
          <Card
            key={section.id ?? index}
            className="mb-3"
            title={
              <>
                {index + 1}. {section.title}
                <Badge tone="neutral" className="ms-2">
                  {SECTION_TYPE_LABELS[section.type] ?? section.type}
                </Badge>
              </>
            }
          >
            <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
              {section.content}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
