"use client";

import { useState } from "react";
import { IconTrash } from "@tabler/icons-react";
import { cleanupOrphanAvatarsAction } from "@/lib/actions/avatar.actions";

/**
 * Mantenimiento del admin: borra del bucket los avatares que ya no pertenecen a
 * ningún usuario (cuentas eliminadas o subidas que no se confirmaron). No toca
 * las fotos en uso.
 */
export function MaintenanceCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ found: number; deleted: number } | null>(
    null,
  );
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
        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={() => void run()}
          disabled={busy}
        >
          <IconTrash size={18} stroke={1.75} className="me-1" />
          {busy ? "Revisando…" : "Limpiar avatares huérfanos"}
        </button>

        {result ? (
          <div className="alert alert-success mt-3 mb-0" role="status">
            Revisados: se encontraron {result.found} y se eliminaron{" "}
            {result.deleted}.
          </div>
        ) : null}
        {error ? (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
