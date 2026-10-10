"use client";

import type { FeedbackMessage } from "@/lib/services/feedback.service";
import { formatDateChile } from "@/lib/utils/date";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  athlete: "Atleta",
};

export function FeedbackThread({ messages }: { messages: FeedbackMessage[] }) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <div className="mt-3 pt-3 border-top" data-testid="feedback-thread">
      <h6 className="mb-2">Comentarios</h6>
      <ul className="list-unstyled mb-0">
        {messages.map((msg) => (
          <li key={msg.id} className="mb-2">
            <div className="d-flex align-items-baseline gap-2">
              <span className="fw-medium">{msg.authorName}</span>
              <span className="badge bg-secondary-lt">
                {ROLE_LABEL[msg.authorRole] ?? msg.authorRole}
              </span>
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
