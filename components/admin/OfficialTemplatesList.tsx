"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { deleteOfficialTemplateAction } from "@/lib/actions/template.actions";
import { SESSION_TYPE_LABELS } from "@/lib/config/constants";
import type { OfficialTemplateListItem } from "@/lib/services/template.service";
import { formatDateChile } from "@/lib/utils/date";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OfficialTemplateForm, type OfficialFormNotice } from "./OfficialTemplateForm";

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

  return (
    <>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-secondary mb-0">
          {templates.length === 0
            ? "Aún no hay plantillas oficiales."
            : `${templates.length} plantilla${templates.length === 1 ? "" : "s"} oficial${templates.length === 1 ? "" : "es"}`}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <IconPlus size={18} stroke={1.75} className="me-1" />
          Nueva oficial
        </button>
      </div>

      {notice && (
        <div
          className={`alert alert-${notice.type} alert-dismissible`}
          role="alert"
        >
          {notice.message}
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setNotice(null)}
          />
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-vcenter card-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Secciones</th>
                <th>Actualizada</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-secondary text-center py-4">
                    Sin plantillas oficiales. Crea la primera con “Nueva
                    oficial”.
                  </td>
                </tr>
              )}
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="fw-medium">{template.name}</td>
                  <td>
                    <span className="badge bg-blue-lt">
                      {SESSION_TYPE_LABELS[
                        template.sessionType as keyof typeof SESSION_TYPE_LABELS
                      ] ?? template.sessionType}
                    </span>
                  </td>
                  <td>{template.sectionCount}</td>
                  <td className="text-secondary">
                    {formatDateChile(template.updatedAt)}
                  </td>
                  <td className="text-end">
                    <div className="btn-list flex-nowrap justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost-secondary"
                        title="Editar"
                        onClick={() => {
                          setEditing(template);
                          setFormOpen(true);
                        }}
                      >
                        <IconEdit size={16} stroke={1.75} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost-danger"
                        title="Eliminar"
                        onClick={() => setDeleting(template)}
                      >
                        <IconTrash size={16} stroke={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
