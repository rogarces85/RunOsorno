"use client";

import { useDraggable } from "@dnd-kit/core";
import { BIcon } from "@/components/ui/BIcon";
import { formatSessionType } from "@/lib/utils/format";

export type TemplateOption = {
  id: string;
  name: string;
  sessionType: string;
};

function DraggableTemplate({ template }: { template: TemplateOption }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: template.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`list-group-item list-group-item-action template-drag-item d-flex justify-content-between align-items-center${isDragging ? " opacity-50" : ""}`}
      data-testid="sidebar-template"
      data-template-id={template.id}
    >
      <div>
        <div className="fw-medium">{template.name}</div>
        <div className="text-secondary small">
          {formatSessionType(template.sessionType)}
        </div>
      </div>
      <BIcon name="grip-vertical" size={16} className="text-secondary" aria-hidden />
    </div>
  );
}

/**
 * Bandeja de plantillas arrastrables del calendario del coach (Fase 19).
 *
 * Por debajo de `lg` no se muestra: arrastrar desde una lista situada sobre
 * el calendario exigiría desplazar la página con el dedo mientras se mantiene
 * el gesto, y la celda destino queda fuera de pantalla. En ese rango la
 * asignación se hace tocando el día (`AssignTemplateForm`).
 */
export function TemplateSidebar({
  templates,
}: {
  templates: TemplateOption[];
}) {
  return (
    <div className="card d-none d-lg-block" data-testid="template-sidebar">
      <div className="card-header">
        <h2 className="card-title">Plantillas</h2>
      </div>
      <div className="list-group list-group-flush">
        {templates.length === 0 ? (
          <div className="list-group-item text-secondary">
            No hay plantillas disponibles.
          </div>
        ) : (
          templates.map((template) => (
            <DraggableTemplate key={template.id} template={template} />
          ))
        )}
      </div>
      <div className="card-footer text-secondary small">
        Arrastra una plantilla a un día del calendario.
      </div>
    </div>
  );
}
