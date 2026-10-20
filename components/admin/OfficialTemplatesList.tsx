"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconEdit,
  IconPlus,
  IconTrash,
  IconTemplate,
} from "@tabler/icons-react";
import { deleteOfficialTemplateAction } from "@/lib/actions/template.actions";
import { SESSION_TYPE_LABELS } from "@/lib/config/constants";
import type { OfficialTemplateListItem } from "@/lib/services/template.service";
import { formatDateChile } from "@/lib/utils/date";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import {
  OfficialTemplateForm,
  type OfficialFormNotice,
} from "./OfficialTemplateForm";

export function OfficialTemplatesList({
  templates,
}: {
  templates: OfficialTemplateListItem[];
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<OfficialFormNotice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OfficialTemplateListItem | null>(null);
  const [deleting, setDeleting] = useState<OfficialTemplateListItem | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const runDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    const result = await deleteOfficialTemplateAction(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) {
      setNotice({ type: "success", message: "Plantilla oficial eliminada" });
      router.refresh();
    } else {
      setNotice({ type: "danger", message: result.error });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-secondary mb-0">
          {templates.length === 0
            ? "Listado de plantillas oficiales"
            : `${templates.length} plantilla${templates.length === 1 ? "" : "s"} oficial${templates.length === 1 ? "" : "es"}`}
        </p>
        <Button onClick={openCreate}>
          <IconPlus size={18} stroke={1.75} className="me-1" />
          Nueva oficial
        </Button>
      </div>

      {notice && (
        <Alert
          variant={notice.type}
          dismissible
          onDismiss={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      <div className="card">
        {templates.length === 0 ? (
          <div className="card-body">
            <EmptyState
              icon={IconTemplate}
              title="No hay plantillas oficiales"
              description="Las plantillas oficiales están precargadas para todos los coaches, que pueden clonarlas pero no editarlas. Carga la primera para arrancar la biblioteca."
              actionLabel="Nueva plantilla oficial"
              onAction={openCreate}
            />
          </div>
        ) : (
          <Table label="Listado de plantillas oficiales" stackOnMobile>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th className="text-end">Secciones</th>
                <th>Actualizada</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="fw-medium" data-label="Nombre">
                    {template.name}
                  </td>
                  <td data-label="Tipo">
                    <Badge tone="primary">
                      {SESSION_TYPE_LABELS[
                        template.sessionType as keyof typeof SESSION_TYPE_LABELS
                      ] ?? template.sessionType}
                    </Badge>
                  </td>
                  <td className="text-end app-numeric" data-label="Secciones">
                    {template.sectionCount}
                  </td>
                  <td className="text-secondary" data-label="Actualizada">
                    {formatDateChile(template.updatedAt)}
                  </td>
                  <td className="text-end" data-label="Acciones">
                    <div className="btn-list flex-nowrap justify-content-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Editar ${template.name}`}
                        title="Editar"
                        onClick={() => {
                          setEditing(template);
                          setFormOpen(true);
                        }}
                      >
                        <IconEdit size={16} stroke={1.75} />
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Eliminar ${template.name}`}
                        title="Eliminar"
                        onClick={() => setDeleting(template)}
                      >
                        <IconTrash size={16} stroke={1.75} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <OfficialTemplateForm
        open={formOpen}
        template={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(savedNotice) => {
          setNotice(savedNotice);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar plantilla oficial"
        message={
          deleting
            ? `¿Eliminar la plantilla oficial "${deleting.name}"? Los coaches que ya la clonaron conservarán sus copias.`
            : ""
        }
        confirmLabel="Eliminar"
        danger
        busy={busy}
        onConfirm={runDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
