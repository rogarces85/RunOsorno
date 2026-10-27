import Link from "next/link";
import { IconSchool, IconRun, IconUserX, IconUsers } from "@tabler/icons-react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";
import { getAdminStats } from "@/lib/services/dashboard.service";

export const instant = false;

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const stats = await getAdminStats();

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Dashboard"
          description="Estado general de la plataforma y accesos directos."
        />

        <StatsCards
          items={[
            {
              key: "coaches-active",
              label: "Coaches activos",
              value: stats.coachesActive,
              href: "/admin/coaches",
              stamp: { icon: <IconUsers />, variant: "primary" },
            },
            {
              key: "coaches-inactive",
              label: "Coaches inactivos",
              value: stats.coachesInactive,
              tone: stats.coachesInactive > 0 ? "warning" : "default",
              href: "/admin/coaches",
              stamp: { icon: <IconUserX />, variant: "warning" },
            },
            {
              key: "groups",
              label: "Grupos",
              value: stats.groupsCount,
              href: "/admin/groups",
              stamp: { icon: <IconSchool />, variant: "info" },
            },
            {
              key: "athletes",
              label: "Atletas",
              value: stats.athletesCount,
              href: "/admin/athletes",
              stamp: { icon: <IconRun />, variant: "success" },
            },
          ]}
        />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <Card title="Solicitudes pendientes" className="h-100">
              {stats.pendingRequests === 0 ? (
                <EmptyState
                  title="Sin solicitudes pendientes"
                  description="No hay solicitudes de coaches pendientes de revisión."
                  compact
                />
              ) : (
                <>
                  <div className="h1 mb-2 app-numeric text-warning-ink">
                    {stats.pendingRequests}
                  </div>
                  <p className="text-secondary mb-2">
                    {stats.pendingRequests === 1
                      ? "Coach esperando aprobación para unirse a un grupo."
                      : "Coaches esperando aprobación para unirse a un grupo."}
                  </p>
                  <Link
                    href="/admin/groups"
                    className={buttonClassName({ size: "sm" })}
                  >
                    Revisar solicitudes
                  </Link>
                </>
              )}
            </Card>
          </div>
          <div className="col-lg-6 mb-3">
            <Card title="Accesos rápidos" className="h-100">
              <div className="d-flex flex-wrap gap-2">
                <Link
                  href="/admin/coaches"
                  className={buttonClassName({ variant: "secondary" })}
                >
                  Gestionar coaches
                </Link>
                <Link
                  href="/admin/groups"
                  className={buttonClassName({ variant: "secondary" })}
                >
                  Gestionar grupos
                </Link>
                <Link
                  href="/admin/athletes"
                  className={buttonClassName({ variant: "secondary" })}
                >
                  Listado de atletas
                </Link>
                <Link
                  href="/admin/templates"
                  className={buttonClassName({ variant: "secondary" })}
                >
                  Plantillas oficiales
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
