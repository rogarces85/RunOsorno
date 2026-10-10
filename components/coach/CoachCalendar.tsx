"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { SessionDetailPanel } from "@/components/calendar/SessionDetailPanel";
import type { FeedbackMessage } from "@/lib/services/feedback.service";
import type { PlanItem } from "@/lib/services/plan.service";
import {
  AssignTemplateForm,
  type TemplateOption,
} from "./AssignTemplateForm";

export function CoachCalendar({
  teamId,
  athleteId,
  items,
  month,
  compliance,
  templates,
  messages,
}: {
  teamId: string;
  athleteId: string;
  items: PlanItem[];
  month: string;
  compliance: Record<string, { done: number; total: number }>;
  templates: TemplateOption[];
  messages: Record<string, FeedbackMessage[]>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<{
    dateISO: string;
    item: PlanItem | null;
  } | null>(null);

  return (
    <>
      <MonthCalendar
        items={items}
        month={month}
        mode="coach"
        compliance={compliance}
        selectedDate={selected?.dateISO ?? null}
        onMonthChange={(next) => {
          setSelected(null);
          router.replace(`/coach/calendar/${teamId}/${athleteId}?month=${next}`);
        }}
        onDayClick={(dateISO, item) => setSelected({ dateISO, item })}
      />
      <SessionDetailPanel
        open={selected !== null}
        dateISO={selected?.dateISO ?? null}
        item={selected?.item ?? null}
        messages={selected?.item ? (messages[selected.item.id] ?? []) : []}
        extra={
          selected ? (
            <AssignTemplateForm
              athleteId={athleteId}
              dateISO={selected.dateISO}
              occupied={selected.item !== null}
              templates={templates}
              onDone={() => setSelected(null)}
            />
          ) : null
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}
