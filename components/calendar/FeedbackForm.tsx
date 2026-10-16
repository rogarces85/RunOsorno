"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addFeedbackAction } from "@/lib/actions/feedback.actions";

export function FeedbackForm({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const send = async () => {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      setError("Escribe un mensaje");
      return;
    }
    setPending(true);
    setError(null);
    const result = await addFeedbackAction({ assignmentId, message: trimmed });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("");
    router.refresh();
  };

  return (
    <div className="mt-3" data-testid="feedback-form">
      <label className="form-label small text-secondary" htmlFor="feedback-msg">
        Dejar comentario
      </label>
      <textarea
        id="feedback-msg"
        className={`form-control${error ? " is-invalid" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? "feedback-msg-error" : undefined}
        rows={2}
        value={message}
        placeholder="Escribe un comentario…"
        onChange={(event) => {
          setMessage(event.target.value);
          if (error) setError(null);
        }}
      />
      {error && (
        <div id="feedback-msg-error" className="invalid-feedback d-block">
          {error}
        </div>
      )}
      <button
        type="button"
        className="btn btn-sm btn-primary mt-2"
        disabled={pending}
        onClick={send}
      >
        {pending ? "Enviando…" : "Enviar"}
      </button>
    </div>
  );
}
