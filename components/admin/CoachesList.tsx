"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BIcon } from "@/components/ui/BIcon";
import {
  deactivateCoachAction,
  deleteCoachAction,
  reactivateCoachAction,
  resendInvitationAction,
  resetPasswordAction,
} from "@/lib/actions/user.actions";
import type { CoachListItem } from "@/lib/services/user.service";
import { CoachForm, type CoachFormNotice } from "./CoachForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";

type Notice = CoachFormNotice | null;

type ConfirmState = {
  kind: "deactivate" | "activate" | "delete" | "reset" | "resend";
  coach: CoachListItem;
} | null;

const CONFIRM_META: Record<
  NonNullable<ConfirmState>["kind"],
  {
    title: string;
    message: (name: string) => string;
    confirmLabel: string;
    danger: boolean;
  }
> = {
  deactivate: {
    title: "Desactivar coach",
    message: (name) =>
      `¿Desactivar a ${name}? No podrá iniciar sesión hasta que lo reactives.`,
    confirmLabel: "Desactivar",
    danger: true,
  },
  activate: {
    title: "Activar coach",
    message: (name) => `¿Reactivar el acceso de ${name}?`,
    confirmLabel: "Activar",
    danger: false,
  },
  delete: {
    title: "Eliminar coach",
    message: (name) =>
      `¿Eliminar a ${name}? Esta acción es definitiva (solo aplica si no tiene teams ni sesiones).`,
    confirmLabel: "Eliminar",
    danger: true,
  },
  reset: {
    title: "Restablecer contraseña",
    message: (name) =>
      `¿Generar una nueva contraseña temporal para ${name}? Se cerrarán sus sesiones activas.`,
    confirmLabel: "Restablecer",
    danger: false,
  },
  resend: {
    title: "Reenviar invitación",
    message: (name) =>
      `¿Reenviar la invitación a ${name}? Se generará una nueva contraseña temporal.`,
    confirmLabel: "Reenviar",
    danger: false,
  },
};

export function CoachesList({ coaches }: { coaches: CoachListItem[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CoachListItem | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (coach: CoachListItem) => {
    setEditing(coach);
    setFormOpen(true);
  };

  const runConfirm = async () => {
    if (!confirm) {
      return;
    }
    setBusy(true);
    const { kind, coach } = confirm;
    let result;
    let successMessage = "";
    switch (kind) {
      case "deactivate":
        result = await deactivateCoachAction(coach.id);
        successMessage = "Coach desactivado";
        break;
      case "activate":
        result = await reactivateCoachAction(coach.id);
        successMessage = "Coach activado";
        break;
      case "delete":
        result = await deleteCoachAction(coach.id);
        successMessage = "Coach eliminado";
        break;
      case "reset":
        result = await resetPasswordAction(coach.id);
        successMessage = "Contraseña restablecida";
        break;
      case "resend":
        result = await resendInvitationAction(coach.id);
        successMessage = "Invitación reenviada";
        break;
    }
    setBusy(false);
    setConfirm(null);
    if (result.ok) {
      const tempPassword =
        result.data &&
        typeof result.data === "object" &&
        "tempPassword" in result.data
          ? (result.data as { tempPassword: string }).tempPassword
          : undefined;
      setNotice({ type: "success", message: successMessage, tempPassword });
      router.refresh();
    } else {
      setNotice({ type: "danger", message: result.error });
    }
  };

  return (
    <>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-secondary mb-0">
          {coaches.length === 0
            ? "Listado de coaches"
            : `${coaches.length} coach${coaches.length === 1 ? "" : "es"} en el sistema`}
        </p>
        <Button onClick={openCreate}>
          <BIcon name="plus" size={18} className="me-1" aria-hidden />
          Nuevo coach
        </Button>
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
                (envíala al coach; la usará en su primer inicio de sesión)
              </span>
            </div>
          )}
        </Alert>
      )}

      <div className="card">
        {coaches.length === 0 ? (
          <div className="card-body">
            <EmptyState
              icon="person-search"
              title="No hay coaches registrados"
              description="Crea el primer coach para que pueda gestionar sus equipos y atletas. Le llegará un email con su contraseña temporal."
              actionLabel="Nuevo coach"
              onAction={openCreate}
            />
          </div>
        ) : (
          <Table label="Listado de coaches" stackOnMobile>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Grupos</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => (
                <tr key={coach.id}>
                  <td data-label="Nombre">
                    <span className="fw-medium">{coach.name}</span>
                  </td>
                  <td className="text-secondary" data-label="Email">
                    {coach.email}
                  </td>
                  <td data-label="Estado">
                    {coach.isActive ? (
                      <Badge tone="success">Activo</Badge>
                    ) : (
                      <Badge tone="danger">Inactivo</Badge>
                    )}
                  </td>
                  <td className="text-secondary" data-label="Grupos">
                    {coach.groups.length > 0
                      ? coach.groups.join(", ")
                      : "Sin grupo"}
                  </td>
                  <td className="text-end" data-label="Acciones">
                    <div className="btn-list flex-nowrap justify-content-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Editar ${coach.name}`}
                        title="Editar"
                        onClick={() => openEdit(coach)}
                      >
                        <BIcon name="pencil" size={16} aria-hidden />
                      </Button>
                      {coach.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Desactivar ${coach.name}`}
                          title="Desactivar"
                          onClick={() =>
                            setConfirm({ kind: "deactivate", coach })
                          }
                        >
                          <BIcon name="power" size={16} aria-hidden />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Activar ${coach.name}`}
                          title="Activar"
                          onClick={() =>
                            setConfirm({ kind: "activate", coach })
                          }
                        >
                          <BIcon name="power" size={16} aria-hidden />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Restablecer contraseña de ${coach.name}`}
                        title="Restablecer contraseña"
                        onClick={() => setConfirm({ kind: "reset", coach })}
                      >
                        <BIcon name="key" size={16} aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Reenviar invitación a ${coach.name}`}
                        title="Reenviar invitación"
                        onClick={() => setConfirm({ kind: "resend", coach })}
                      >
                        <BIcon name="arrow-repeat" size={16} aria-hidden />
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Eliminar ${coach.name}`}
                        title="Eliminar"
                        onClick={() => setConfirm({ kind: "delete", coach })}
                      >
                        <BIcon name="trash" size={16} aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <CoachForm
        open={formOpen}
        coach={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(savedNotice) => {
          setNotice(savedNotice);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? CONFIRM_META[confirm.kind].title : ""}
        message={
          confirm ? CONFIRM_META[confirm.kind].message(confirm.coach.name) : ""
        }
        confirmLabel={
          confirm ? CONFIRM_META[confirm.kind].confirmLabel : "Confirmar"
        }
        danger={confirm ? CONFIRM_META[confirm.kind].danger : true}
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
