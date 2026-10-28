"use client";

import { useState } from "react";
import { BIcon } from "@/components/ui/BIcon";
import { Button } from "@/components/ui/Button";
import { CloneDialog } from "./CloneDialog";

export function CloneButton({
  template,
  variant = "primary",
}: {
  template: { id: string; name: string };
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <BIcon name="copy" size={18} className="me-1" aria-hidden />
        Clonar plantilla
      </Button>
      {open && (
        <CloneDialog template={template} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
