"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { useRouter } from "next/navigation";
import { generateWeekAction } from "@/lib/actions/plan.actions";
import type { TemplateOption } from "./AssignTemplateForm";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function weeksOfMonth(monthISO: string): { value: string; label: string }[] {
  const [year, month] = monthISO.split("-").map(Number);
  const first = new Date(year, month - 1, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - offset, 12);
  const last = new Date(year, month, 0, 12);
  const weeks: { value: string; label: string }[] = [];
  for (
    const cursor = new Date(start);
    cursor <= last;
    cursor.setDate(cursor.getDate() + 7)
  ) {
    weeks.push({
      value: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`,
      label: `Semana del ${pad(cursor.getDate())}-${pad(cursor.getMonth() + 1)}`,
    });
  }
  return weeks;
}

function currentWeekStart(): string {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - offset,
    12,
  );
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

export function WeekGenerator({
  open,
  athleteId,
  month,
  templates,
  onClose,
}: {
  open: boolean;
  athleteId: string;
  month: string;
  templates: TemplateOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const weeks = weeksOfMonth(month);
  const defaultWeek =
    weeks.find((week) => week.value === currentWeekStart())?.value ??
    weeks[0]?.value ??
    month + "-01";
  const [week, setWeek] = useState(defaultWeek);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return null;
  }

  const sessionTypes: string[] = [];
  for (const template of templates) {
    const key = template.sessionType.trim();
    if (key && !sessionTypes.includes(key)) {
      sessionTypes.push(key);
    }
  }

  const total = sessionTypes.reduce(
    (sum, type) => sum + (counts[type] ?? 0),
    0,
  );
  const rest = Math.max(0, 7 - total);

  const submit = async () => {
    if (total === 0) {
      setError("Indica al menos una sesión");
      return;
    }
    if (total > 7) {
      setError("El patrón supera los 7 días de la semana");
      return;
    }
    const pattern = sessionTypes
      .filter((type) => (counts[type] ?? 0) > 0)
      .map((type) => ({ type, count: counts[type] }));
    setBusy(true);
    setError(null);
    const result = await generateWeekAction({
      athleteId,
      weekStart: week,
      pattern,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  };

  return (
    <ModalShell
      onClose={onClose}
      busy={busy}
      titleId="week-generator-title"
      dialogTestId="week-generator"
    >
      <div className="modal-header">
        <h2 className="modal-title h5" id="week-generator-title">
          Generar semana
        </h2>
        <button
          type="button"
          className="btn-close"
          aria-label="Cerrar"
          onClick={onClose}
          disabled={busy}
        />
      </div>
      <div className="modal-body">
        <label className="form-label" htmlFor="wg-week">
          Semana
        </label>
        <select
          id="wg-week"
          className="form-select mb-3"
          data-testid="wg-week"
          value={week}
          onChange={(event) => setWeek(event.target.value)}
        >
          {weeks.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
        <div className="row g-2">
          {sessionTypes.map((type) => (
            <div className="col-6 col-md-4" key={type}>
              <label
                className="form-label text-secondary small"
                htmlFor={`wg-${type}`}
              >
                {type}
              </label>
              <input
                id={`wg-${type}`}
                type="number"
                min={0}
                max={7}
                className="form-control"
                data-testid={`wg-count-${type}`}
                value={counts[type] ?? 0}
                onChange={(event) => {
                  const value = Math.max(
                    0,
                    Math.min(7, Number(event.target.value) || 0),
                  );
                  setCounts((current) => ({ ...current, [type]: value }));
                  if (error) setError(null);
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 text-secondary small" data-testid="wg-summary">
          Total: {total} · Descanso: {rest} día{rest === 1 ? "" : "s"}
        </div>
        {error && (
          <div className="text-danger small mt-1" data-testid="wg-error">
            {error}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-link link-secondary"
          onClick={onClose}
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={busy}
          data-testid="wg-submit"
        >
          {busy ? "Generando…" : "Generar semana"}
        </button>
      </div>
    </ModalShell>
  );
}
