import { requireAuth } from "@/lib/auth/guards";
import { getNotifications } from "@/lib/services/notification.service";
import { notificationHref } from "@/lib/utils/notification";
import { NotificationCenter } from "@/components/ui/NotificationCenter";

export const instant = false;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireAuth();
  const filterParam = (await searchParams).filter;
  const filter = filterParam === "unread" ? "unread" : "all";

  const items = await getNotifications(user.id, {
    unreadOnly: filter === "unread",
    limit: 100,
  });
  const rows = items.map((item) => ({
    ...item,
    href: notificationHref(item, user.role),
  }));

  return (
    <div className="row">
      <div className="col-12 col-lg-8 col-xl-6">
        <div className="mb-3">
          <h2 className="page-title mb-0">Notificaciones</h2>
          <div className="text-secondary">Tus avisos recientes</div>
        </div>
        <NotificationCenter rows={rows} filter={filter} />
      </div>
    </div>
  );
}
