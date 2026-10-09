"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transferAthleteAction } from "@/lib/actions/athlete.actions";

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
    <>
      <div
        className="modal modal-blur fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Transferir atleta</h5>
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
                Mover <strong>{athlete.name}</strong> de un team a otro. El
                cambio queda registrado en la auditoría.
              </p>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
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
              <button
                type="button"
                className="btn btn-link link-secondary"
                onClick={onClose}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!fromTeamId || !toTeamId || busy}
                onClick={submit}
              >
                {busy ? "Transfiriendo…" : "Transferir"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show d-block" />
    </>
  );
}
