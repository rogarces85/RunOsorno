"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconEdit,
  IconPlus,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import { deleteGroupAction } from "@/lib/actions/group.actions";
import type { GroupListItem } from "@/lib/services/group.service";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { GroupForm, type GroupFormNotice } from "./GroupForm";

export function GroupsList({ groups }: { groups: GroupListItem[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<GroupFormNotice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupListItem | null>(null);
  const [deleting, setDeleting] = useState<GroupListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const runDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    const result = await deleteGroupAction(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) {
      setNotice({ type: "success", message: "Grupo eliminado" });
      router.refresh();
    } else {
      setNotice({ type: "danger", message: result.error });
    }
  };

  return (
    <>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-secondary mb-0">
          {groups.length === 0
            ? "Listado de grupos"
            : `${groups.length} grupo${groups.length === 1 ? "" : "s"}`}
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
          Nuevo grupo
        </button>
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
        {groups.length === 0 ? (
          <div className="card-body">
            <EmptyState
              icon={IconUsersGroup}
              title="No hay grupos ni escuelas"
              description="Crea el primer grupo. Los coaches podrán solicitar unirse a él y tú podrás aprobar su solicitud."
              actionLabel="Nuevo grupo"
              onAction={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Coaches</th>
                  <th>Teams</th>
                  <th>Atletas</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <Link
                        href={`/admin/groups/${group.id}`}
                        className="fw-medium text-reset"
                      >
                        {group.name}
                      </Link>
                      {group.description && (
                        <div className="text-secondary small">
                          {group.description}
                        </div>
                      )}
                    </td>
                    <td>{group.coachesCount}</td>
                    <td>{group.teamsCount}</td>
                    <td>{group.athletesCount}</td>
                    <td className="text-end">
                      <div className="btn-list flex-nowrap justify-content-end">
                        <Link
                          href={`/admin/groups/${group.id}`}
                          className="btn btn-sm btn-ghost-secondary"
                          title="Ver detalle"
                        >
                          Ver
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost-secondary"
                          title="Editar"
                          onClick={() => {
                            setEditing(group);
                            setFormOpen(true);
                          }}
                        >
                          <IconEdit size={16} stroke={1.75} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost-danger"
                          title="Eliminar"
                          onClick={() => setDeleting(group)}
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
        )}
      </div>

      <GroupForm
        open={formOpen}
        group={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(savedNotice) => {
          setNotice(savedNotice);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar grupo"
        message={
          deleting
            ? `¿Eliminar el grupo "${deleting.name}"? Solo es posible si no tiene coaches miembros ni plantillas compartidas.`
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
