"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJoinAction } from "@/lib/actions/group.actions";
import type { GroupBasic } from "@/lib/services/group.service";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
    <Card title={group.name} className="h-100">
      {group.description && (
        <p className="text-secondary mb-3">{group.description}</p>
      )}
      {error && (
        <Alert variant="danger" className="py-2">
          {error}
        </Alert>
      )}
      {state === "sent" ? (
        <Badge tone="success">Solicitud enviada</Badge>
      ) : (
        <Button loading={state === "sending"} onClick={request}>
          {state === "sending" ? "Enviando…" : "Solicitar unirse"}
        </Button>
      )}
    </Card>
  );
}
