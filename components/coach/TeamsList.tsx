"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconEdit, IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";
import { deleteTeamAction } from "@/lib/actions/team.actions";
import type { TeamListItem } from "@/lib/services/team.service";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeamForm, type TeamFormNotice } from "./TeamForm";

export function TeamsList({
  teams,
  defaultNameHint,
}: {
  teams: TeamListItem[];
  defaultNameHint: string;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<TeamFormNotice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamListItem | null>(null);
  const [deleting, setDeleting] = useState<TeamListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const runDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    const result = await deleteTeamAction(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) {
      setNotice({ type: "success", message: "Team eliminado" });
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
          {teams.length === 0
            ? "Listado de teams"
            : `${teams.length} team${teams.length === 1 ? "" : "s"}`}
        </p>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <IconPlus size={18} stroke={1.75} className="me-1" />
          Nuevo team
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

      {teams.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <EmptyState
              icon={IconUsers}
              title="No tienes teams"
              description="Un team agrupa a tus atletas. Créalo para poderles asignar planificaciones y seguir su cumplimiento."
              actionLabel="Nuevo team"
              onAction={openCreate}
            />
          </div>
        </div>
      ) : (
        <div className="row">
          {teams.map((team) => (
            <div key={team.id} className="col-md-6 col-xl-4 mb-3">
              <div className="card">
                <div className="card-body">
                  <h3 className="card-title">
                    <Link
                      href={`/coach/teams/${team.id}`}
                      className="text-reset text-decoration-none"
                    >
                      {team.name}
                    </Link>
                  </h3>
                  <p className="text-secondary mb-3">
                    {team.athletesCount} atleta
                    {team.athletesCount === 1 ? "" : "s"}
                  </p>
                  <div className="btn-list">
                    <Link
                      href={`/coach/teams/${team.id}`}
                      className="btn btn-sm btn-ghost-secondary"
                    >
                      Ver
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost-secondary"
                      title="Renombrar"
                      onClick={() => {
                        setEditing(team);
                        setFormOpen(true);
                      }}
                    >
                      <IconEdit size={16} stroke={1.75} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost-danger"
                      title="Eliminar"
                      onClick={() => setDeleting(team)}
                    >
                      <IconTrash size={16} stroke={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeamForm
        open={formOpen}
        team={editing}
        defaultNameHint={defaultNameHint}
        onClose={() => setFormOpen(false)}
        onSaved={(savedNotice) => {
          setNotice(savedNotice);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar team"
        message={
          deleting
            ? `¿Eliminar el team "${deleting.name}"? Solo es posible si no tiene atletas.`
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
