import { AthletesList } from "@/components/coach/AthletesList";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { getAthletesByCoach } from "@/lib/services/athlete.service";
import { getTeamsByCoach } from "@/lib/services/team.service";

export const instant = false;

export default async function CoachAthletesPage() {
  const { user } = await requireRole("coach");
  const [athletes, teams] = await Promise.all([
    getAthletesByCoach(user.id),
    getTeamsByCoach(user.id),
  ]);

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Mis atletas"
          description="Atletas de todos tus teams, con su cumplimiento y estado."
        />
        <AthletesList
          athletes={athletes}
          teams={teams.map((team) => ({ id: team.id, name: team.name }))}
          editable
        />
      </div>
    </div>
  );
}
