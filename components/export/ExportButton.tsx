"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BIcon } from "@/components/ui/BIcon";
import { exportDataAction } from "@/lib/actions/export.actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type {
  ExportEntity,
  ExportFormat,
} from "@/lib/validations/export.schemas";
import type { MetricsPeriod } from "@/lib/validations/metric.schemas";

/**
 * Botón de exportación de datos (Fase 33).
 *
 * Permite elegir formato (PDF / Excel / CSV) y periodo (temporada, año o
 * rango personalizado) antes de generar el archivo. La descarga se hace en el
 * navegador a partir de los bytes devueltos por la Server Action.
 */

type ExportTarget =
  | { kind: "athlete"; athleteId: string; formats: ExportFormat[] }
  | { kind: "team"; teamId: string }
  | { kind: "group"; groupId: string }
  | { kind: "global"; entity: ExportEntity; formats: ExportFormat[] };

type Props = {
  target: ExportTarget;
  /** Periodo inicial, por defecto la temporada actual. */
  period?: MetricsPeriod;
  label?: string;
  size?: "sm" | "md";
};

const FORMAT_LABEL: Record<ExportFormat, string> = {
  pdf: "PDF",
  xlsx: "Excel",
  csv: "CSV",
};

function currentYear(): number {
  return new Date().getFullYear();
}

/** Dispara la descarga en el navegador a partir de los bytes recibidos. */
function downloadFile(filename: string, contentType: string, bytes: number[]) {
  const buffer = new Uint8Array(bytes);
  const blob = new Blob([buffer], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Libera el object URL en el siguiente tick para no cancelar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportButton({
  target,
  period: initialPeriod,
  label = "Exportar",
  size = "md",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [periodKind, setPeriodKind] = useState<"season" | "year" | "custom">(
    initialPeriod?.kind ?? "season",
  );
  const [year, setYear] = useState<number>(
    initialPeriod?.kind === "year" && initialPeriod.year !== undefined
      ? initialPeriod.year
      : currentYear(),
  );
  const [from, setFrom] = useState<string>(
    initialPeriod?.kind === "custom" ? initialPeriod.from : "",
  );
  const [to, setTo] = useState<string>(
    initialPeriod?.kind === "custom" ? initialPeriod.to : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableFormats: ExportFormat[] =
    target.kind === "global"
      ? ["csv"]
      : target.kind === "team" || target.kind === "group"
        ? ["xlsx"]
        : (target.formats ?? ["pdf", "xlsx"]);

  function buildPeriod(): MetricsPeriod | null {
    if (periodKind === "season") {
      return { kind: "season" };
    }
    if (periodKind === "year") {
      return { kind: "year", year };
    }
    if (!from || !to) {
      setError("Selecciona las fechas del rango personalizado");
      return null;
    }
    if (from > to) {
      setError("La fecha inicial debe ser anterior a la final");
      return null;
    }
    return { kind: "custom", from, to };
  }

  async function runExport(format: ExportFormat) {
    setError(null);

    setBusy(true);
    try {
      // El discriminante es la combinación kind:format (el formato por sí
      // solo no es único: "xlsx" existe para atleta, team y grupo).
      let request: Record<string, unknown>;
      if (target.kind === "global") {
        request = {
          target: "global:csv",
          kind: "global",
          format: "csv",
          entity: target.entity,
        };
      } else {
        const period = buildPeriod();
        if (!period) {
          return;
        }
        if (target.kind === "athlete") {
          request = {
            target: `athlete:${format}`,
            kind: "athlete",
            format,
            athleteId: target.athleteId,
            period,
          };
        } else if (target.kind === "team") {
          request = {
            target: "team:xlsx",
            kind: "team",
            format: "xlsx",
            teamId: target.teamId,
            period,
          };
        } else {
          request = {
            target: "group:xlsx",
            kind: "group",
            format: "xlsx",
            groupId: target.groupId,
            period,
          };
        }
      }

      const result = await exportDataAction(request);
      if (!result.ok || !result.data || !result.filename) {
        setError(result.error ?? "No se pudo generar el archivo");
        return;
      }
      downloadFile(result.filename, result.contentType ?? "", result.data);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error al generar el archivo");
    } finally {
      setBusy(false);
    }
  }

  // Exportación global: un solo formato, sin selector de periodo.
  if (target.kind === "global") {
    return (
      <div className="d-flex flex-column">
        <Button
          variant="secondary"
          size={size}
          loading={busy}
          onClick={() => runExport("csv")}
        >
          <BIcon name="download" size={16} className="me-1" aria-hidden />
          {busy ? "Generando…" : `${label} CSV`}
        </Button>
        {error && (
          <Alert variant="danger" className="mt-2 py-1 px-2 small mb-0">
            {error}
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="position-relative">
      <Button
        variant="secondary"
        size={size}
        loading={busy}
        onClick={() => {
          setError(null);
          setOpen((value) => !value);
        }}
        aria-expanded={open}
      >
        <BIcon name="download" size={16} className="me-1" aria-hidden />
        {busy ? "Generando…" : label}
      </Button>

      {open && (
        <div
          className="card position-absolute end-0 mt-2 shadow"
          style={{ zIndex: 1050, width: "20rem" }}
        >
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label" htmlFor="export-period">
                Periodo
              </label>
              <select
                id="export-period"
                className="form-select form-select-sm"
                value={periodKind}
                onChange={(e) => {
                  setPeriodKind(e.target.value as typeof periodKind);
                  setError(null);
                }}
              >
                <option value="season">Temporada actual</option>
                <option value="year">Año</option>
                <option value="custom">Rango personalizado</option>
              </select>
            </div>

            {periodKind === "year" && (
              <div className="mb-3">
                <label className="form-label" htmlFor="export-year">
                  Año
                </label>
                <input
                  id="export-year"
                  type="number"
                  className="form-control form-control-sm"
                  value={year}
                  min={2000}
                  max={2100}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </div>
            )}

            {periodKind === "custom" && (
              <div className="mb-3">
                <label className="form-label" htmlFor="export-from">
                  Desde
                </label>
                <input
                  id="export-from"
                  type="date"
                  className="form-control form-control-sm mb-2"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <label className="form-label" htmlFor="export-to">
                  Hasta
                </label>
                <input
                  id="export-to"
                  type="date"
                  className="form-control form-control-sm"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            )}

            <div className="d-flex gap-2">
              {availableFormats.map((format) => (
                <Button
                  key={format}
                  size="sm"
                  className="flex-fill"
                  loading={busy}
                  onClick={() => runExport(format)}
                >
                  <BIcon name="download" size={14} className="me-1" aria-hidden />
                  {FORMAT_LABEL[format]}
                </Button>
              ))}
            </div>

            {error && (
              <Alert variant="danger" className="mt-2 mb-0 py-1 px-2 small">
                <BIcon name="exclamation-circle" size={14} className="me-1" aria-hidden />
                {error}
              </Alert>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
