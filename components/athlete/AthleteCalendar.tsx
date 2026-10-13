"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackMessage } from "@/lib/services/feedback.service";
import type { PlanItem } from "@/lib/services/plan.service";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { SessionDetailPanel } from "@/components/calendar/SessionDetailPanel";
import { SessionForm } from "@/components/calendar/SessionForm";
import type { ReasonOption } from "@/components/calendar/SessionForm";

export function AthleteCalendar({
  items,
  month,
  messages,
  reasons,
}: {
  items: PlanItem[];
  month: string;
  messages?: Record<string, FeedbackMessage[]>;
  /** Motivos configurables por el admin (Fase 34). */
  reasons: ReasonOption[];
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedItem: PlanItem | null = selectedDate
    ? (items.find((item) => item.sessionDate === selectedDate) ?? null)
    : null;

  return (
    <>
      <MonthCalendar
        items={items}
        month={month}
        selectedDate={selectedDate}
        onMonthChange={(next) => {
          setSelectedDate(null);
          router.replace(`/athlete/calendar?month=${next}`);
        }}
        onDayClick={(dateISO) => setSelectedDate(dateISO)}
      />
      <SessionDetailPanel
        open={selectedDate !== null}
        dateISO={selectedDate}
        item={selectedItem}
        messages={selectedItem ? (messages?.[selectedItem.id] ?? []) : []}
        recordForm={
          selectedItem && selectedDate ? (
            <SessionForm
              key={selectedItem.id}
              assignmentId={selectedItem.id}
              dateISO={selectedDate}
              record={selectedItem.record}
              status={selectedItem.status}
              reasons={reasons}
            />
          ) : null
        }
        onClose={() => setSelectedDate(null)}
      />
    </>
  );
}
