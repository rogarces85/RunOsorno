"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconEdit,
  IconPlus,
  IconTransfer,
  IconUserSearch,
} from "@tabler/icons-react";
import { formatDateChile } from "@/lib/utils/date";
import type { AthleteListItem } from "@/lib/services/athlete.service";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { Button, buttonClassName } from "@/components/ui/Button";
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

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-secondary mb-0">
          {athletes.length === 0
            ? "Listado de atletas"
            : `${athletes.length} atleta${athletes.length === 1 ? "" : "s"}`}
        </p>
        {editable && (
          <Button
            disabled={teams.length === 0}
            title={
              teams.length === 0 ? "Crea un team antes de agregar atletas" : ""
            }
            onClick={openCreate}
          >
            <IconPlus size={18} stroke={1.75} className="me-1" />
            Nuevo atleta
          </Button>
        )}
      </div>

      {notice && (
        <Alert
          variant={notice.type}
          dismissible
          onDismiss={() => setNotice(null)}
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
        </Alert>
      )}

      <div className="card">
        {athletes.length === 0 ? (
          <div className="card-body">
            <EmptyState
              icon={IconUserSearch}
              title="No hay atletas en este listado"
              description={
                teams.length === 0 && editable
                  ? "Primero crea un team; después podrás dar de alta a tus atletas y asignarlos a ese team."
                  : "Cuando un atleta se asigne a uno de tus teams aparecerá aquí."
              }
              actionLabel={editable ? "Nuevo atleta" : undefined}
              actionVariant="outline-primary"
              onAction={editable ? openCreate : undefined}
            />
          </div>
        ) : (
          <Table label="Listado de atletas" stackOnMobile>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Teams</th>
                <th className="text-end">Cumplimiento</th>
                <th>Última actividad</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((athlete) => (
                <tr key={athlete.id}>
                  <td data-label="Atleta">
                    <div className="d-flex align-items-center gap-2">
                      <Avatar
                        userId={athlete.id}
                        name={athlete.name}
                        avatarKey={athlete.avatarKey}
                        size="sm"
                        // Es una tabla de decenas de filas: difiere la carga
                        // para no competir con el resto del listado (47.7).
                        loading="lazy"
                      />
                      <div>
                        <div className="fw-medium">{athlete.name}</div>
                        <div className="text-secondary small">
                          {athlete.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-secondary" data-label="Teams">
                    {athlete.teamNames.length > 0
                      ? athlete.teamNames.join(", ")
                      : "Sin team"}
                  </td>
                  <td
                    className="text-end app-numeric"
                    data-label="Cumplimiento"
                  >
                    {athlete.totalSessions > 0
                      ? `${Math.round((athlete.completedSessions / athlete.totalSessions) * 100)}% (${athlete.completedSessions}/${athlete.totalSessions})`
                      : "—"}
                  </td>
                  <td
                    className="text-secondary small"
                    data-label="Última actividad"
                  >
                    {athlete.lastActivity
                      ? formatDateChile(athlete.lastActivity)
                      : "Sin registros"}
                  </td>
                  <td className="text-end" data-label="Acciones">
                    <div className="btn-list flex-nowrap justify-content-end">
                      {editable && (
                        <Link
                          href={`/coach/athletes/${athlete.id}`}
                          className={buttonClassName({
                            variant: "secondary",
                            size: "sm",
                          })}
                        >
                          Ver
                        </Link>
                      )}
                      {editable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Editar ${athlete.name}`}
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
                        </Button>
                      )}
                      {canTransfer && athlete.teamNames.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Transferir a ${athlete.name}`}
                          title="Transferir a otro team"
                          onClick={() => setTransferring(athlete)}
                        >
                          <IconTransfer size={16} stroke={1.75} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
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
