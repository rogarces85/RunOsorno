import { CoachesList } from "@/components/admin/CoachesList";
import { requireRole } from "@/lib/auth/guards";
import { getCoaches } from "@/lib/services/user.service";

export const instant = false;

export default async function AdminCoachesPage() {
  await requireRole("admin");
  const coaches = await getCoaches({ status: "all" });

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title">Coaches</h2>
        <CoachesList coaches={coaches} />
      </div>
    </div>
  );
}
