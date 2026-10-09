"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveRequestAction,
  rejectRequestAction,
} from "@/lib/actions/group.actions";
import type { PendingRequestItem } from "@/lib/services/group.service";

export function RequestsPending({
  requests,
}: {
  requests: PendingRequestItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (requestId: string, kind: "approve" | "reject") => {
    setBusyId(requestId);
    setError(null);
    const result =
      kind === "approve"
        ? await approveRequestAction(requestId)
        : await rejectRequestAction(requestId);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  if (requests.length === 0) {
    return <p className="text-secondary">No hay solicitudes pendientes.</p>;
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="list-group list-group-flush">
        {requests.map((request) => (
          <div
            key={request.id}
            className="list-group-item d-flex align-items-center justify-content-between gap-2 py-5"
          >
            <div>
              <div className="fw-medium">{request.coachName}</div>
              <div className="text-secondary small">{request.coachEmail}</div>
              <div className="text-secondary small">
                Solicitó unirse el{" "}
                {request.requestedAt.toLocaleDateString("es-CL", {
                  timeZone: "America/Santiago",
                })}
              </div>
            </div>
            <div className="btn-list flex-nowrap">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={busyId !== null}
                onClick={() => resolve(request.id, "approve")}
              >
                {busyId === request.id ? "Procesando…" : "Aprobar"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                disabled={busyId !== null}
                onClick={() => resolve(request.id, "reject")}
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
