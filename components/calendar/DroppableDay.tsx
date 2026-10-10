"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";

export function DroppableDay({
  dateISO,
  children,
}: {
  dateISO: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateISO });
  return (
    <div
      ref={setNodeRef}
      className={`calendar-droppable${isOver ? " is-over" : ""}`}
      data-droppable={dateISO}
    >
      {children}
    </div>
  );
}
