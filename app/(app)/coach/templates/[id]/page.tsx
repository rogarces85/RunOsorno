import Link from "next/link";
import { notFound } from "next/navigation";
import { CloneButton } from "@/components/templates/CloneButton";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
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
          <h1 className="page-title">Editar plantilla</h1>
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
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h1 className="page-title mb-1">{template.name}</h1>
            <div className="d-flex gap-1 flex-wrap">
              <span className="badge bg-secondary-lt text-secondary-ink">
                {formatSessionType(template.sessionType)}
              </span>
              {template.isOfficial && (
                <span className="badge bg-purple-lt text-purple-ink">Oficial</span>
              )}
              {template.isShared && template.groupName && (
                <span className="badge bg-blue-lt text-blue-ink">
                  Compartida · {template.groupName}
                </span>
              )}
            </div>
          </div>
          <CloneButton
            template={{ id: template.id, name: template.name }}
            variant="secondary"
          />
        </div>
        <p className="text-secondary">
          Esta plantilla es de solo lectura. Clónala para crear tu propia
          versión editable.
        </p>
        {template.structure.map((section, index) => (
          <div className="card mb-3" key={section.id ?? index}>
            <div className="card-header">
              <h2 className="card-title">
                {index + 1}. {section.title}
                <span className="badge bg-secondary-lt text-secondary-ink ms-2">
                  {SECTION_TYPE_LABELS[section.type] ?? section.type}
                </span>
              </h2>
            </div>
            <div className="card-body">
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {section.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
