"use client";

import { useState } from "react";
import { BIcon } from "@/components/ui/BIcon";
import { cleanupOrphanAvatarsAction } from "@/lib/actions/avatar.actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/**
 * Mantenimiento del admin: borra del bucket los avatares que ya no pertenecen a
 * ningún usuario (cuentas eliminadas o subidas que no se confirmaron). No toca
 * las fotos en uso.
 */
export function MaintenanceCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    found: number;
    deleted: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    const response = await cleanupOrphanAvatarsAction({});
    if (response.ok) {
      setResult(response.data);
    } else {
      setError(response.error);
    }
    setBusy(false);
  }

  return (
    <div className="card mt-3">
      <div className="card-header">
        <h2 className="card-title">Mantenimiento</h2>
      </div>
      <div className="card-body">
        <p className="text-secondary">
          Elimina del almacenamiento las fotos que ya no pertenecen a ningún
          usuario, por ejemplo las de cuentas eliminadas. No toca las fotos en
          uso.
        </p>
        <Button variant="danger" onClick={() => void run()} loading={busy}>
          <BIcon name="trash" size={18} className="me-1" aria-hidden />
          {busy ? "Revisando…" : "Limpiar avatares huérfanos"}
        </Button>

        {result ? (
          <Alert variant="success" className="mt-3 mb-0" role="status">
            Revisados: se encontraron {result.found} y se eliminaron{" "}
            {result.deleted}.
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="danger" className="mt-3 mb-0">
            {error}
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
