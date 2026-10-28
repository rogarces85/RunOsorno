"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveRequestAction,
  rejectRequestAction,
} from "@/lib/actions/group.actions";
import type { PendingRequestItem } from "@/lib/services/group.service";
import { formatDate } from "@/lib/i18n/format";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

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
    return (
      <div className="card">
        <div className="card-body">
          <EmptyState
            compact
            icon="person-check"
            title="No hay solicitudes pendientes"
            description="Cuando un coach solicite unirse a este grupo, aparecerá aquí para que lo apruebes o rechaces."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
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
                Solicitó unirse el {formatDate(request.requestedAt)}
              </div>
            </div>
            <div className="btn-list flex-nowrap">
              <Button
                size="sm"
                disabled={busyId !== null}
                loading={busyId === request.id}
                onClick={() => resolve(request.id, "approve")}
              >
                {busyId === request.id ? "Procesando…" : "Aprobar"}
              </Button>
              <Button
                variant="danger-ghost"
                size="sm"
                disabled={busyId !== null}
                onClick={() => resolve(request.id, "reject")}
              >
                Rechazar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
