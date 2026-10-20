"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { useRouter } from "next/navigation";
import { IconAlertTriangle } from "@tabler/icons-react";
import { transferAthleteAction } from "@/lib/actions/athlete.actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function TransferDialog({
  open,
  athlete,
  teamOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  athlete: {
    id: string;
    name: string;
    teamRefs?: { id: string; name: string }[];
  } | null;
  teamOptions: { id: string; name: string; coachName: string }[];
  onClose: () => void;
  onSaved: (notice: { type: "success" | "danger"; message: string }) => void;
}) {
  const router = useRouter();
  const [fromTeamId, setFromTeamId] = useState(
    athlete?.teamRefs?.[0]?.id ?? "",
  );
  const [toTeamId, setToTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const athleteTeamIds = new Set(athlete?.teamRefs?.map((t) => t.id) ?? []);
  const destinationOptions = teamOptions.filter(
    (team) => !athleteTeamIds.has(team.id),
  );

  const submit = async () => {
    if (!athlete || !fromTeamId || !toTeamId) {
      return;
    }
    setBusy(true);
    setError("");
    const result = await transferAthleteAction({
      athleteId: athlete.id,
      fromTeamId,
      toTeamId,
    });
    setBusy(false);
    if (result.ok) {
      onSaved({
        type: "success",
        message: `Atleta transferido a "${destinationOptions.find((t) => t.id === toTeamId)?.name ?? ""}"`,
      });
      onClose();
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  if (!open || !athlete) {
    return null;
  }

  return (
    <ModalShell
      onClose={onClose}
      busy={busy}
      titleId="transfer-dialog-title"
      dialogTestId="transfer-dialog"
    >
      <div className="modal-header">
        <h2 className="modal-title h5" id="transfer-dialog-title">
          Transferir atleta
        </h2>
        <button
          type="button"
          className="btn-close"
          aria-label="Cerrar"
          onClick={onClose}
          disabled={busy}
        />
      </div>
      <div className="modal-body">
        <p className="text-secondary">
          Mover <strong>{athlete.name}</strong> de un team a otro. El cambio
          queda registrado en la auditoría.
        </p>
        {error && (
          <Alert
            variant="danger"
            testId="transfer-error"
            icon={<IconAlertTriangle size={16} />}
          >
            {error}
          </Alert>
        )}
        <div className="mb-3">
          <label className="form-label" htmlFor="transfer-from">
            Team de origen
          </label>
          <select
            id="transfer-from"
            className="form-select"
            value={fromTeamId}
            onChange={(event) => setFromTeamId(event.target.value)}
          >
            {(athlete.teamRefs ?? []).map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-0">
          <label className="form-label" htmlFor="transfer-to">
            Team de destino
          </label>
          <select
            id="transfer-to"
            className={`form-select ${error && !toTeamId ? "is-invalid" : ""}`}
            value={toTeamId}
            onChange={(event) => setToTeamId(event.target.value)}
          >
            <option value="">Selecciona un team…</option>
            {destinationOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} — {team.coachName}
              </option>
            ))}
          </select>
          {destinationOptions.length === 0 && (
            <div className="form-hint">
              No hay otros teams disponibles para la transferencia.
            </div>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button
          disabled={!fromTeamId || !toTeamId || busy}
          loading={busy}
          onClick={submit}
        >
          {busy ? "Transfiriendo…" : "Transferir"}
        </Button>
      </div>
    </ModalShell>
  );
}
