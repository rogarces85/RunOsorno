import Link from "next/link";
import { logout } from "@/lib/actions/auth.actions";
import { requireAuth } from "@/lib/auth/guards";
import {
  getNotifications,
  getUnreadCount,
} from "@/lib/services/notification.service";
import { notificationHref } from "@/lib/utils/notification";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell } from "@/components/ui/NotificationBell";

export async function AppHeader() {
  const { user } = await requireAuth();
  const [unreadCount, recent] = await Promise.all([
    getUnreadCount(user.id),
    getNotifications(user.id, { limit: 8 }),
  ]);
  const items = recent.map((item) => ({
    ...item,
    href: notificationHref(item, user.role),
  }));

  return (
    <header className="navbar d-print-none">
      <div className="container-fluid">
        <Link href="/" className="navbar-brand">
          RunOsorno
        </Link>
        <div className="navbar-nav flex-row ms-auto align-items-center">
          <div className="nav-item">
            <NotificationBell unreadCount={unreadCount} items={items} />
          </div>
          <div className="nav-item ms-2">
            <Link
              href="/profile"
              title="Mi perfil"
              className="d-flex align-items-center"
            >
              <Avatar
                userId={user.id}
                name={user.name}
                avatarKey={user.avatarKey}
                size="sm"
              />
            </Link>
          </div>
          <div className="nav-item ms-2">
            <form action={logout}>
              <button
                type="submit"
                className="btn btn-sm btn-ghost-secondary"
                title="Cerrar sesión"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
