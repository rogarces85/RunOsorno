"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { SessionDetailPanel } from "@/components/calendar/SessionDetailPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  assignSessionAction,
  copyPreviousWeekAction,
} from "@/lib/actions/plan.actions";
import type { FeedbackMessage } from "@/lib/services/feedback.service";
import type { PlanItem } from "@/lib/services/plan.service";
import { formatDateChile, getWeekStart, toISODate } from "@/lib/utils/date";
import {
  AssignTemplateForm,
  type TemplateOption,
} from "./AssignTemplateForm";
import { MultiAssignDialog } from "./MultiAssignDialog";
import { TemplateSidebar } from "./TemplateSidebar";
import { WeekGenerator } from "./WeekGenerator";

export function CoachCalendar({
  teamId,
  athleteId,
  items,
  month,
  compliance,
  templates,
  messages,
  athletes,
}: {
  teamId: string;
  athleteId: string;
  items: PlanItem[];
  month: string;
  compliance: Record<string, { done: number; total: number }>;
  templates: TemplateOption[];
  messages: Record<string, FeedbackMessage[]>;
  athletes: { athleteId: string; name: string }[];
}) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [selected, setSelected] = useState<{
    dateISO: string;
    item: PlanItem | null;
  } | null>(null);
  const [dragTemplate, setDragTemplate] = useState<TemplateOption | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{
    templateId: string;
    dateISO: string;
  } | null>(null);
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const [tool, setTool] = useState<null | "generate" | "multi">(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const templateId = String(event.active.id);
    setDragTemplate(
      templates.find((template) => template.id === templateId) ?? null,
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragTemplate(null);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId || !/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
      return;
    }
    const templateId = String(event.active.id);
    const result = await assignSessionAction({
      athleteId,
      templateId,
      date: overId,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data.needsConfirm) {
      setPendingDrop({ templateId, dateISO: overId });
      return;
    }
    setError(null);
    router.refresh();
  };

  const confirmReplace = async () => {
    if (!pendingDrop) return;
    setReplaceBusy(true);
    const result = await assignSessionAction({
      athleteId,
      templateId: pendingDrop.templateId,
      date: pendingDrop.dateISO,
      replace: true,
    });
    setReplaceBusy(false);
    setPendingDrop(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  };

  const copyPreviousWeek = async () => {
    setCopyBusy(true);
    const weekStart = toISODate(getWeekStart(new Date()));
    const result = await copyPreviousWeekAction({ athleteId, weekStart });
    setCopyBusy(false);
    setConfirmCopy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragTemplate(null)}
    >
      <div className="row g-3">
        <div className="col-12 col-lg-3">
          <TemplateSidebar templates={templates} />
        </div>
        <div className="col-12 col-lg-9">
          <div className="calendar-toolbar">
            <button
              type="button"
              className="btn btn-primary"
              data-testid="btn-generate-week"
              onClick={() => setTool("generate")}
            >
              Generar semana
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="btn-copy-week"
              onClick={() => setConfirmCopy(true)}
            >
              Copiar semana anterior
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              data-testid="btn-multi-assign"
              onClick={() => setTool("multi")}
            >
              Multi-asignar
            </button>
          </div>
          {error && (
            <div className="alert alert-danger" role="alert" data-testid="coach-error">
              {error}
            </div>
          )}
          <MonthCalendar
            items={items}
            month={month}
            mode="coach"
            compliance={compliance}
            selectedDate={selected?.dateISO ?? null}
            onMonthChange={(next) => {
              setSelected(null);
              router.replace(
                `/coach/calendar/${teamId}/${athleteId}?month=${next}`,
              );
            }}
            onDayClick={(dateISO, item) => setSelected({ dateISO, item })}
          />
        </div>
      </div>
      <DragOverlay>
        {dragTemplate ? (
          <div className="drag-overlay-chip">{dragTemplate.name}</div>
        ) : null}
      </DragOverlay>
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
      <ConfirmDialog
        open={pendingDrop !== null}
        title="Reemplazar plantilla"
        message="¿Reemplazar la plantilla existente?"
        confirmLabel="Reemplazar"
        busy={replaceBusy}
        onConfirm={confirmReplace}
        onCancel={() => setPendingDrop(null)}
      />
      <ConfirmDialog
        open={confirmCopy}
        title="Copiar semana anterior"
        message={`Se copiará la planificación de la semana anterior a la semana del ${formatDateChile(getWeekStart(new Date()))}. Las sesiones de días ya ocupados se conservarán.`}
        confirmLabel="Copiar"
        danger={false}
        busy={copyBusy}
        onConfirm={copyPreviousWeek}
        onCancel={() => setConfirmCopy(false)}
      />
      <WeekGenerator
        open={tool === "generate"}
        athleteId={athleteId}
        month={month}
        templates={templates}
        onClose={() => setTool(null)}
      />
      <MultiAssignDialog
        open={tool === "multi"}
        athletes={athletes}
        templates={templates}
        onClose={() => setTool(null)}
      />
    </DndContext>
  );
}
