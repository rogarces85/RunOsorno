"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanItem } from "@/lib/services/plan.service";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { SessionDetailPanel } from "@/components/calendar/SessionDetailPanel";

export function AthleteCalendar({
  items,
  month,
}: {
  items: PlanItem[];
  month: string;
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
        selectedDate={selected?.dateISO ?? null}
        onMonthChange={(next) => {
          setSelected(null);
          router.replace(`/athlete/calendar?month=${next}`);
        }}
        onDayClick={(dateISO, item) => setSelected({ dateISO, item })}
      />
      <SessionDetailPanel
        open={selected !== null}
        dateISO={selected?.dateISO ?? null}
        item={selected?.item ?? null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
