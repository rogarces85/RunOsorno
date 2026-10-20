"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconUserMinus,
  IconUserPlus,
  IconUserSearch,
} from "@tabler/icons-react";
import {
  assignAthleteAction,
  removeAthleteAction,
} from "@/lib/actions/team.actions";
import { formatDistance, formatDuration, formatRpe } from "@/lib/utils/format";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import type {
  AssignableAthlete,
  TeamAthleteItem,
} from "@/lib/services/team.service";

export function TeamAthletesManager({
  teamId,
  athletes,
  assignable,
}: {
  teamId: string;
  athletes: TeamAthleteItem[];
  assignable: AssignableAthlete[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);

  const assign = async () => {
    if (!selected) {
      return;
    }
    setBusy(true);
    setNotice(null);
    const result = await assignAthleteAction({
      teamId,
      athleteId: selected,
    });
    setBusy(false);
    if (result.ok) {
      setNotice({ type: "success", message: "Atleta asignado al team" });
      setSelected("");
      router.refresh();
    } else {
      setNotice({ type: "danger", message: result.error });
    }
  };

  const remove = async (athleteId: string) => {
    setBusy(true);
    setNotice(null);
    const result = await removeAthleteAction({ teamId, athleteId });
    setBusy(false);
    if (result.ok) {
      setNotice({ type: "success", message: "Atleta quitado del team" });
      router.refresh();
    } else {
      setNotice({ type: "danger", message: result.error });
    }
  };

  return (
    <>
      {notice && (
        <Alert
          variant={notice.type}
          dismissible
          onDismiss={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      <div className="card mb-3">
        <div className="card-header">
          <h2 className="card-title">Asignar atleta</h2>
        </div>
        <div className="card-body">
          {assignable.length === 0 ? (
            <EmptyState
              compact
              icon={IconUserSearch}
              title="No hay atletas disponibles para asignar"
              description="Crea atletas en “Atletas” y luego asígnalos a este team."
              actionLabel="Ir a Atletas"
              actionHref="/coach/athletes"
              actionVariant="outline-primary"
            />
          ) : (
            <div className="row g-2 align-items-end">
              <div className="col">
                <label className="form-label" htmlFor="assign-athlete">
                  Atleta
                </label>
                <select
                  id="assign-athlete"
                  className="form-select"
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  <option value="">Selecciona un atleta…</option>
                  {assignable.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name} ({athlete.email})
                      {athlete.currentTeamNames.length > 0
                        ? ` — ${athlete.currentTeamNames.join(", ")}`
                        : " — sin team"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-auto">
                <Button
                  disabled={!selected || busy}
                  loading={busy}
                  onClick={assign}
                >
                  <IconUserPlus size={16} stroke={1.75} className="me-1" />
                  Asignar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Atletas del team ({athletes.length})</h2>
        </div>
        {athletes.length === 0 ? (
          <div className="card-body">
            <EmptyState
              compact
              icon={IconUserSearch}
              title="No hay atletas en este team"
              description="Asigna atletas desde el selector de arriba para empezar a planificarles entrenamientos."
            />
          </div>
        ) : (
          <Table label="Atletas del team" stackOnMobile>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Última sesión</th>
                <th className="text-end">Cumplimiento</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((athlete) => (
                <tr key={athlete.athleteId}>
                  <td data-label="Atleta">
                    <div className="fw-medium">{athlete.name}</div>
                    <div className="text-secondary small">{athlete.email}</div>
                  </td>
                  <td
                    className="text-secondary small"
                    data-label="Última sesión"
                  >
                    {athlete.lastRecord
                      ? `${formatDistance(athlete.lastRecord.distanceKm)} · ${formatDuration(athlete.lastRecord.durationMinutes)} · RPE ${formatRpe(athlete.lastRecord.rpe)}`
                      : "Sin registros"}
                  </td>
                  <td
                    className="text-end app-numeric"
                    data-label="Cumplimiento"
                  >
                    {athlete.totalSessions > 0
                      ? `${Math.round((athlete.completedSessions / athlete.totalSessions) * 100)}% (${athlete.completedSessions}/${athlete.totalSessions})`
                      : "—"}
                  </td>
                  <td className="text-end" data-label="Acciones">
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Quitar a ${athlete.name} del team`}
                      title="Quitar del team"
                      disabled={busy}
                      onClick={() => remove(athlete.athleteId)}
                    >
                      <IconUserMinus size={16} stroke={1.75} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
