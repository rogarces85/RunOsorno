"use client";

import { useRouter } from "next/navigation";
import { toggleDirectorAction } from "@/lib/actions/group.actions";
import { Field } from "@/components/ui/Field";

export function DirectorToggle({
  groupId,
  userId,
  isDirector,
}: {
  groupId: string;
  userId: string;
  isDirector: boolean;
}) {
  const router = useRouter();

  const onChange = async () => {
    const result = await toggleDirectorAction({ groupId, userId });
    if (result.ok) {
      router.refresh();
    }
  };

  const id = `director-${userId}`;

  return (
    <Field
      id={id}
      label={isDirector ? "Director Técnico" : "Coach"}
      layout="choice"
      toggle
      className="mb-0"
    >
      <input
        id={id}
        className="form-check-input"
        type="checkbox"
        role="switch"
        checked={isDirector}
        onChange={() => onChange()}
      />
    </Field>
  );
}
