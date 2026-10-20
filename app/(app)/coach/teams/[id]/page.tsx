import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamAthletesManager } from "@/components/coach/TeamAthletesManager";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import {
  getAssignableAthletes,
  getTeamAthletes,
  getTeamsByCoach,
} from "@/lib/services/team.service";

export const instant = false;

export default async function CoachTeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole("coach");
  const { id } = await params;

  const teams = await getTeamsByCoach(user.id);
  const team = teams.find((t) => t.id === id);
  if (!team) {
    notFound();
  }

  const athletesResult = await getTeamAthletes(id, user.id);
  if (!athletesResult.ok) {
    notFound();
  }
  const assignable = await getAssignableAthletes(user.id, id);

  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <Link href="/coach/teams" className="link-secondary">
            ← Volver a teams
          </Link>
        </div>
        <PageHeader
          title={team.name}
          description="Atletas del team y quienes puedes asignar."
        />
        <TeamAthletesManager
          teamId={id}
          athletes={athletesResult.data}
          assignable={assignable}
        />
      </div>
    </div>
  );
}
