"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconEdit, IconPlus, IconTransfer } from "@tabler/icons-react";
import { formatDateChile } from "@/lib/utils/date";
import type { AthleteListItem } from "@/lib/services/athlete.service";
import { Avatar } from "@/components/ui/Avatar";
import {
  AthleteForm,
  type AthleteFormNotice,
  type EditableAthlete,
} from "./AthleteForm";
import { TransferDialog } from "@/components/admin/TransferDialog";

export function AthletesList({
  athletes,
  teams,
  canTransfer = false,
  teamOptions = [],
  editable = false,
}: {
  athletes: AthleteListItem[];
  teams: { id: string; name: string }[];
  canTransfer?: boolean;
  teamOptions?: { id: string; name: string; coachName: string }[];
  editable?: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<AthleteFormNotice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableAthlete | null>(null);
  const [transferring, setTransferring] = useState<AthleteListItem | null>(
    null,
  );

  return (
    <>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-secondary mb-0">
          {athletes.length === 0
            ? "Aún no hay atletas."
            : `${athletes.length} atleta${athletes.length === 1 ? "" : "s"}`}
        </p>
        {editable && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={teams.length === 0}
            title={
              teams.length === 0 ? "Crea un team antes de agregar atletas" : ""
            }
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <IconPlus size={18} stroke={1.75} className="me-1" />
            Nuevo atleta
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`alert alert-${notice.type} alert-dismissible`}
          role="alert"
        >
          <div>{notice.message}</div>
          {notice.tempPassword && (
            <div className="mt-1">
              <strong>Contraseña temporal:</strong>{" "}
              <code className="user-select-all">{notice.tempPassword}</code>{" "}
              <span className="text-secondary">
                (envíala al atleta; la usará en su primer inicio de sesión)
              </span>
            </div>
          )}
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
                <th>Atleta</th>
                <th>Teams</th>
                <th>Cumplimiento</th>
                <th>Última actividad</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {athletes.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-secondary text-center py-4">
                    Sin atletas todavía.
                  </td>
                </tr>
              )}
              {athletes.map((athlete) => (
                <tr key={athlete.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Avatar
                        userId={athlete.id}
                        name={athlete.name}
                        avatarKey={athlete.avatarKey}
                        size="sm"
                      />
                      <div>
                        <div className="fw-medium">{athlete.name}</div>
                        <div className="text-secondary small">
                          {athlete.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-secondary">
                    {athlete.teamNames.length > 0
                      ? athlete.teamNames.join(", ")
                      : "Sin team"}
                  </td>
                  <td>
                    {athlete.totalSessions > 0
                      ? `${Math.round((athlete.completedSessions / athlete.totalSessions) * 100)}% (${athlete.completedSessions}/${athlete.totalSessions})`
                      : "—"}
                  </td>
                  <td className="text-secondary small">
                    {athlete.lastActivity
                      ? formatDateChile(athlete.lastActivity)
                      : "Sin registros"}
                  </td>
                  <td className="text-end">
                    <div className="btn-list flex-nowrap justify-content-end">
                      {editable && (
                        <Link
                          href={`/coach/athletes/${athlete.id}`}
                          className="btn btn-sm btn-ghost-secondary"
                        >
                          Ver
                        </Link>
                      )}
                      {editable && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost-secondary"
                          title="Editar"
                          onClick={() => {
                            setEditing({
                              id: athlete.id,
                              name: athlete.name,
                              email: athlete.email,
                              profile: athlete.profile,
                            });
                            setFormOpen(true);
                          }}
                        >
                          <IconEdit size={16} stroke={1.75} />
                        </button>
                      )}
                      {canTransfer && athlete.teamNames.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost-secondary"
                          title="Transferir a otro team"
                          onClick={() => setTransferring(athlete)}
                        >
                          <IconTransfer size={16} stroke={1.75} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AthleteForm
        open={formOpen}
        athlete={editing}
        teams={teams}
        onClose={() => setFormOpen(false)}
        onSaved={(savedNotice) => {
          setNotice(savedNotice);
          router.refresh();
        }}
      />

      <TransferDialog
        key={transferring?.id ?? "transfer-closed"}
        open={transferring !== null}
        athlete={
          transferring
            ? {
                id: transferring.id,
                name: transferring.name,
                teamRefs: transferring.teamRefs,
              }
            : null
        }
        teamOptions={teamOptions}
        onClose={() => setTransferring(null)}
        onSaved={(savedNotice) => {
          setNotice(savedNotice);
          router.refresh();
        }}
      />
    </>
  );
}
