import Link from "next/link";
import type { MetricsPeriod } from "@/lib/validations/metric.schemas";
import { Button } from "@/components/ui/Button";

type PeriodSelectorProps = {
  basePath: string;
  current: MetricsPeriod;
  extra?: Record<string, string>;
};

function currentYear(): number {
  return new Date().getFullYear();
}

export function PeriodSelector({
  basePath,
  current,
  extra = {},
}: PeriodSelectorProps) {
  const linkFor = (kind: "season" | "year", year?: number): string => {
    const params = new URLSearchParams();
    params.set("period", kind);
    params.set("year", String(year ?? currentYear()));
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
    return `${basePath}?${params.toString()}`;
  };

  const year =
    current.kind === "year" && current.year !== undefined
      ? current.year
      : currentYear();
  const customFrom = current.kind === "custom" ? current.from : "";
  const customTo = current.kind === "custom" ? current.to : "";

  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      {/* Control segmentado (.app-segments): la pestaña activa toma el color
          de marca. `aria-current` marca el estado para lectores de pantalla. */}
      <div className="app-segments" role="group" aria-label="Periodo">
        <Link
          href={linkFor("season", year)}
          className={`app-seg${current.kind === "season" ? " app-seg-active" : ""}`}
          aria-current={current.kind === "season" ? "true" : undefined}
        >
          Temporada
        </Link>
        <Link
          href={linkFor("year", year)}
          className={`app-seg${current.kind === "year" ? " app-seg-active" : ""}`}
          aria-current={current.kind === "year" ? "true" : undefined}
        >
          Año {year}
        </Link>
      </div>
      <form
        action={basePath}
        method="get"
        className="d-flex align-items-center gap-2"
      >
        <input type="hidden" name="period" value="custom" />
        {Object.entries(extra).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <input
          type="date"
          className="form-control form-control-sm"
          name="from"
          defaultValue={customFrom}
          aria-label="Desde"
          required
        />
        <input
          type="date"
          className="form-control form-control-sm"
          name="to"
          defaultValue={customTo}
          aria-label="Hasta"
          required
        />
        <Button type="submit" variant="secondary" size="sm">
          Ir
        </Button>
      </form>
    </div>
  );
}
