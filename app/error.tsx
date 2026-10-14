"use client";

import { useRouter } from "next/navigation";
import { IconAlertTriangle } from "@tabler/icons-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

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
            {/* El botón principal sí lleva al inicio: antes llamaba a `reset()`
                y, pese al texto, volvía a intentar la misma ruta que falló. */}
            <button
              className="btn btn-primary"
              onClick={() => router.push("/")}
            >
              Volver al inicio
            </button>
            <button
              className="btn btn-ghost-secondary ms-2"
              onClick={() => reset()}
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
