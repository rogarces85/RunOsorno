import { TeamsList } from "@/components/coach/TeamsList";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { getTeamsByCoach } from "@/lib/services/team.service";

export const instant = false;

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "Equipo";
}

export default async function CoachTeamsPage() {
  const { user } = await requireRole("coach");
  const teams = await getTeamsByCoach(user.id);

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Mis teams"
          description="Cada team reúne a tus atletas y se planifica por separado."
        />
        <TeamsList teams={teams} defaultNameHint={lastName(user.name)} />
      </div>
    </div>
  );
}
