"use client";

import { IconAlertTriangle } from "@tabler/icons-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="empty">
          <div className="empty-icon">
            <IconAlertTriangle size={48} stroke={1.5} />
          </div>
          <p className="empty-title">Algo salió mal</p>
          <p className="empty-subtitle text-secondary">
            Ocurrió un error inesperado. Vuelve a intentarlo.
          </p>
          <div className="empty-action">
            <button className="btn btn-primary" onClick={() => reset()}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
