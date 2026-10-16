"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJoinAction } from "@/lib/actions/group.actions";
import type { GroupBasic } from "@/lib/services/group.service";

export function GroupRequestCard({ group }: { group: GroupBasic }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setState("sending");
    setError(null);
    const result = await requestJoinAction(group.id);
    if (result.ok) {
      setState("sent");
      router.refresh();
    } else {
      setError(result.error);
      setState("idle");
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title">{group.name}</h2>
        {group.description && (
          <p className="text-secondary mb-3">{group.description}</p>
        )}
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {state === "sent" ? (
          <span className="badge bg-green-lt text-green-ink">Solicitud enviada</span>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={state === "sending"}
            onClick={request}
          >
            {state === "sending" ? "Enviando…" : "Solicitar unirse"}
          </button>
        )}
      </div>
    </div>
  );
}
