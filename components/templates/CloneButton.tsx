"use client";

import { useState } from "react";
import { IconCopy } from "@tabler/icons-react";
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
      <button
        type="button"
        className={`btn btn-${variant}`}
        onClick={() => setOpen(true)}
      >
        <IconCopy size={18} stroke={1.75} className="me-1" />
        Clonar plantilla
      </button>
      {open && (
        <CloneDialog template={template} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
