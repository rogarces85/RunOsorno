"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BIcon } from "@/components/ui/BIcon";
import { deleteTeamAction } from "@/lib/actions/team.actions";
import type { TeamListItem } from "@/lib/services/team.service";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, buttonClassName } from "@/components/ui/Button";
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
        <Button onClick={openCreate}>
          <BIcon name="plus" size={18} className="me-1" aria-hidden />
          Nuevo team
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

      {teams.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <EmptyState
              icon="people"
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
                  <h2 className="card-title">
                    <Link
                      href={`/coach/teams/${team.id}`}
                      className="text-reset text-decoration-none"
                    >
                      {team.name}
                    </Link>
                  </h2>
                  <p className="text-secondary mb-3">
                    {team.athletesCount} atleta
                    {team.athletesCount === 1 ? "" : "s"}
                  </p>
                  <div className="btn-list">
                    <Link
                      href={`/coach/teams/${team.id}`}
                      className={buttonClassName({
                        variant: "secondary",
                        size: "sm",
                      })}
                    >
                      Ver
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Renombrar ${team.name}`}
                      title="Renombrar"
                      onClick={() => {
                        setEditing(team);
                        setFormOpen(true);
                      }}
                    >
                      <BIcon name="pencil" size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Eliminar ${team.name}`}
                      title="Eliminar"
                      onClick={() => setDeleting(team)}
                    >
                      <BIcon name="trash" size={16} aria-hidden />
                    </Button>
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
