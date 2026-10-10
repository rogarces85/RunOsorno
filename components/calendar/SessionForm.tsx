"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  NOT_DONE_REASON_LABELS,
  type NotDoneReason,
} from "@/lib/config/constants";
import {
  markNotDoneAction,
  recordSessionAction,
} from "@/lib/actions/session.actions";
import type { PlanRecord, PlanStatus } from "@/lib/services/plan.service";
import {
  notDoneSchema,
  recordSessionSchema,
} from "@/lib/validations/session.schemas";
import { toISODate } from "@/lib/utils/date";

type Mode = "completed" | "partial" | "not_done";

type FormValues = {
  distance: string;
  duration: string;
  rpe: string;
  comments: string;
  reason: NotDoneReason;
  customReason: string;
};

const MODE_LABELS: Record<Mode, string> = {
  completed: "Completada",
  partial: "Parcial",
  not_done: "No realizada",
};

const MODE_CLASSES: Record<Mode, string> = {
  completed: "btn-success",
  partial: "btn-warning",
  not_done: "btn-danger",
};

const FIELD_MAP: Record<string, string> = {
  distanceKm: "distance",
  durationMinutes: "duration",
  rpe: "rpe",
  comments: "comments",
  customReason: "customReason",
};

const EDIT_WINDOW_HOURS = 48;

const BOOT_AT = new Date();
const TODAY_ISO = toISODate(BOOT_AT);

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function initialMode(record: PlanRecord | null, status: PlanStatus): Mode {
  if (status === "not_done" || record?.notDoneReason) return "not_done";
  if (status === "partial") return "partial";
  if (status === "completed") return "completed";
  return "completed";
}

export function SessionForm({
  assignmentId,
  dateISO,
  record,
  status,
}: {
  assignmentId: string;
  dateISO: string;
  record: PlanRecord | null;
  status: PlanStatus;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(() => initialMode(record, status));
  const [reason, setReason] = useState<NotDoneReason>(
    () => (record?.notDoneReason as NotDoneReason | null) ?? "lesion",
  );
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      distance: record?.distanceKm ?? "",
      duration:
        record?.durationMinutes !== null && record?.durationMinutes !== undefined
          ? String(record.durationMinutes)
          : "",
      rpe:
        record?.rpe !== null && record?.rpe !== undefined ? String(record.rpe) : "",
      comments: record?.comments ?? "",
      reason: (record?.notDoneReason as NotDoneReason | null) ?? "lesion",
      customReason: record?.customReason ?? "",
    },
  });

  const isFuture = dateISO > TODAY_ISO;
  const expired =
    record !== null &&
    BOOT_AT.getTime() >
      new Date(record.recordedAt).getTime() +
        EDIT_WINDOW_HOURS * 60 * 60 * 1000;
  const readonlyMessage = isFuture
    ? "No puedes registrar sesiones de días futuros"
    : expired
      ? "La ventana de edición ha expirado"
      : "";

  const applyIssues = (
    issues: { path: PropertyKey[]; message: string }[],
  ) => {
    for (const issue of issues) {
      const key = issue.path[0] ? String(issue.path[0]) : "root";
      const field = FIELD_MAP[key] ?? "root";
      setError(field as keyof FormValues | "root", { message: issue.message });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    clearErrors();
    setSaved(false);
    if (mode === "not_done") {
      const parsed = notDoneSchema.safeParse({
        assignmentId,
        reason,
        customReason: values.customReason.trim() || undefined,
      });
      if (!parsed.success) {
        applyIssues(parsed.error.issues);
        return;
      }
      const result = await markNotDoneAction(parsed.data);
      if (!result.ok) {
        setError("root", { message: result.error });
        return;
      }
      setSaved(true);
      router.refresh();
      return;
    }

    const parsed = recordSessionSchema.safeParse({
      assignmentId,
      distanceKm: parseNumber(values.distance),
      durationMinutes: parseNumber(values.duration),
      rpe: parseNumber(values.rpe),
      comments: values.comments.trim() || undefined,
      status: mode,
    });
    if (!parsed.success) {
      applyIssues(parsed.error.issues);
      return;
    }
    const result = await recordSessionAction(parsed.data);
    if (!result.ok) {
      setError("root", { message: result.error });
      return;
    }
    setSaved(true);
    router.refresh();
  });

  if (readonlyMessage) {
    return (
      <div
        className="alert alert-info py-2 mt-3 pt-3 border-top mb-0"
        data-testid="session-form-readonly"
      >
        <span className="small">{readonlyMessage}</span>
      </div>
    );
  }

  const modeBtn = (value: Mode) => (
    <button
      type="button"
      key={value}
      className={`btn btn-sm ${mode === value ? MODE_CLASSES[value] : "btn-outline-secondary"}`}
      data-testid={`session-mode-${value}`}
      aria-pressed={mode === value}
      onClick={() => {
        setMode(value);
        setSaved(false);
        clearErrors();
      }}
    >
      {MODE_LABELS[value]}
    </button>
  );

  const rpeRegister = register("rpe");

  return (
    <form
      className="mt-3 pt-3 border-top"
      data-testid="session-form"
      onSubmit={onSubmit}
      noValidate
    >
      <h6 className="mb-2">Registrar sesión</h6>
      <div className="btn-group w-100 mb-3" role="group" aria-label="Estado de la sesión">
        {modeBtn("completed")}
        {modeBtn("partial")}
        {modeBtn("not_done")}
      </div>

      {mode !== "not_done" ? (
        <>
          <div className="row g-2 mb-2">
            <div className="col-6">
              <label className="form-label small" htmlFor="sf-distance">
                Distancia (km)
              </label>
              <input
                id="sf-distance"
                type="number"
                step="0.01"
                min="0"
                className={`form-control form-control-sm ${errors.distance ? "is-invalid" : ""}`}
                data-testid="session-distance"
                {...register("distance")}
                onChangeCapture={() => {
                  setSaved(false);
                  if (errors.distance) clearErrors("distance");
                }}
              />
              {errors.distance && (
                <div className="invalid-feedback d-block" data-testid="session-error-distance">
                  {errors.distance.message}
                </div>
              )}
            </div>
            <div className="col-6">
              <label className="form-label small" htmlFor="sf-duration">
                Tiempo (min)
              </label>
              <input
                id="sf-duration"
                type="number"
                step="1"
                min="0"
                className={`form-control form-control-sm ${errors.duration ? "is-invalid" : ""}`}
                data-testid="session-duration"
                {...register("duration")}
                onChangeCapture={() => {
                  setSaved(false);
                  if (errors.duration) clearErrors("duration");
                }}
              />
              {errors.duration && (
                <div className="invalid-feedback d-block" data-testid="session-error-duration">
                  {errors.duration.message}
                </div>
              )}
            </div>
          </div>
          <div className="mb-2">
            <label className="form-label small" htmlFor="sf-rpe">
              RPE (1-10)
            </label>
            <select
              id="sf-rpe"
              className={`form-select form-select-sm ${errors.rpe ? "is-invalid" : ""}`}
              data-testid="session-rpe"
              {...rpeRegister}
              onChange={(event) => {
                setSaved(false);
                if (errors.rpe) clearErrors("rpe");
                rpeRegister.onChange(event);
              }}
            >
              <option value="">—</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
            {errors.rpe && (
              <div className="invalid-feedback d-block" data-testid="session-error-rpe">
                {errors.rpe.message}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mb-2">
          <label className="form-label small" htmlFor="sf-reason">
            Motivo
          </label>
          <select
            id="sf-reason"
            className="form-select form-select-sm"
            data-testid="session-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value as NotDoneReason);
              setSaved(false);
              clearErrors("customReason");
            }}
          >
            {Object.entries(NOT_DONE_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {reason === "otro" && (
            <div className="mt-2">
              <label className="form-label small" htmlFor="sf-custom-reason">
                Describe el motivo
              </label>
              <textarea
                id="sf-custom-reason"
                className={`form-control form-control-sm ${errors.customReason ? "is-invalid" : ""}`}
                rows={2}
                data-testid="session-custom-reason"
                {...register("customReason")}
                onChangeCapture={() => {
                  setSaved(false);
                  if (errors.customReason) clearErrors("customReason");
                }}
              />
              {errors.customReason && (
                <div className="invalid-feedback d-block" data-testid="session-error-custom-reason">
                  {errors.customReason.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode !== "not_done" && (
        <div className="mb-2">
          <label className="form-label small" htmlFor="sf-comments">
            Comentarios
          </label>
          <textarea
            id="sf-comments"
            className={`form-control form-control-sm ${errors.comments ? "is-invalid" : ""}`}
            rows={2}
            data-testid="session-comments"
            {...register("comments")}
            onChangeCapture={() => {
              setSaved(false);
              if (errors.comments) clearErrors("comments");
            }}
          />
          {errors.comments && (
            <div className="invalid-feedback d-block" data-testid="session-error-comments">
              {errors.comments.message}
            </div>
          )}
        </div>
      )}

      {errors.root && (
        <div className="text-danger small mb-2" data-testid="session-form-error">
          {errors.root.message}
        </div>
      )}
      {saved && (
        <div className="alert alert-success py-2 mb-2" data-testid="session-form-success">
          Sesión registrada correctamente
        </div>
      )}
      <button
        type="submit"
        className="btn btn-sm btn-primary"
        disabled={isSubmitting}
        data-testid="session-form-submit"
      >
        {isSubmitting ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
