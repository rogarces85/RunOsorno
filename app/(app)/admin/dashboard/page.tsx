import Link from "next/link";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { requireRole } from "@/lib/auth/guards";
import { getAdminStats } from "@/lib/services/dashboard.service";

export const instant = false;

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const stats = await getAdminStats();

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title mb-3">Dashboard</h2>

        <StatsCards
          items={[
            {
              key: "coaches-active",
              label: "Coaches activos",
              value: stats.coachesActive,
              href: "/admin/coaches",
            },
            {
              key: "coaches-inactive",
              label: "Coaches inactivos",
              value: stats.coachesInactive,
              tone: stats.coachesInactive > 0 ? "warning" : "default",
              href: "/admin/coaches",
            },
            {
              key: "groups",
              label: "Grupos",
              value: stats.groupsCount,
              href: "/admin/groups",
            },
            {
              key: "athletes",
              label: "Atletas",
              value: stats.athletesCount,
              href: "/admin/athletes",
            },
          ]}
        />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Solicitudes pendientes</h3>
              </div>
              <div className="card-body">
                {stats.pendingRequests === 0 ? (
                  <div className="text-secondary">
                    No hay solicitudes de coaches pendientes de revisión.
                  </div>
                ) : (
                  <>
                    <div className="h1 mb-2 text-yellow">
                      {stats.pendingRequests}
                    </div>
                    <p className="text-secondary mb-2">
                      {stats.pendingRequests === 1
                        ? "Coach esperando aprobación para unirse a un grupo."
                        : "Coaches esperando aprobación para unirse a un grupo."}
                    </p>
                    <Link href="/admin/groups" className="btn btn-primary btn-sm">
                      Revisar solicitudes
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Accesos rápidos</h3>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  <Link href="/admin/coaches" className="btn btn-outline-secondary">
                    Gestionar coaches
                  </Link>
                  <Link href="/admin/groups" className="btn btn-outline-secondary">
                    Gestionar grupos
                  </Link>
                  <Link href="/admin/athletes" className="btn btn-outline-secondary">
                    Listado de atletas
                  </Link>
                  <Link href="/admin/templates" className="btn btn-outline-secondary">
                    Plantillas oficiales
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
