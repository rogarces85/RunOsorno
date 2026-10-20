import type { FeedbackMessage } from "@/lib/services/feedback.service";
import { formatDateChile } from "@/lib/utils/date";
import { Badge } from "@/components/ui/Badge";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  athlete: "Atleta",
};

/**
 * Lista de comentarios de una sesión (Fase 22).
 *
 * **No** es un Client Component, aunque lo fuera hasta la Fase 47. No tiene
 * estado, ni manejadores de eventos, ni importa nada que requiera navegador: es
 * markup. Al importarlo desde `SessionDetailPanel`, que sí es cliente, el
 * módulo se incluye igualmente en el bundle del cliente, así que aquí la
 * ganancia es declarativa; lo que se evita es que un componente de
 * presentación arrastre la etiqueta `use client` y se vuelva a olvidar al
 * copiarlo a otro sitio.
 *
 * Pasa a ser componente de servidor: si mañana se usa desde una página RSC,
 * se pinta en el HTML sin enviar JavaScript.
 */
export function FeedbackThread({ messages }: { messages: FeedbackMessage[] }) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <div className="mt-3 pt-3 border-top" data-testid="feedback-thread">
      <h4 className="h6 mb-2">Comentarios</h4>
      <ul className="list-unstyled mb-0">
        {messages.map((msg) => (
          <li key={msg.id} className="mb-2">
            <div className="d-flex align-items-baseline gap-2">
              <span className="fw-medium">{msg.authorName}</span>
              <Badge tone="neutral" dot={false}>
                {ROLE_LABEL[msg.authorRole] ?? msg.authorRole}
              </Badge>
              <span className="text-secondary small">
                {formatDateChile(new Date(msg.createdAt))}
              </span>
            </div>
            <div className="small">{msg.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
