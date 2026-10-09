"use client";

import { useRouter } from "next/navigation";
import { toggleDirectorAction } from "@/lib/actions/group.actions";

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

  return (
    <label className="form-check form-switch mb-0">
      <input
        className="form-check-input"
        type="checkbox"
        role="switch"
        checked={isDirector}
        onChange={() => onChange()}
        aria-label="Director Técnico"
      />
      <span className="form-check-label small text-secondary">
        {isDirector ? "Director Técnico" : "Coach"}
      </span>
    </label>
  );
}
