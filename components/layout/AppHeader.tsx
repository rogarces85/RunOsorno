import Link from "next/link";
import { cookies } from "next/headers";
import { IconLogout } from "@tabler/icons-react";
import { logout } from "@/lib/actions/auth.actions";
import { requireAuth } from "@/lib/auth/guards";
import {
  getNotifications,
  getUnreadCount,
} from "@/lib/services/notification.service";
import { notificationHref } from "@/lib/utils/notification";
import { THEME_COOKIE, themeFromCookie } from "@/lib/ui/theme";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Logo } from "./Logo";
import { NavToggle } from "./NavToggle";
import { ThemeToggle } from "./ThemeToggle";

export async function AppHeader() {
  const { user } = await requireAuth();
  const cookieStore = await cookies();
  const theme = themeFromCookie(cookieStore.get(THEME_COOKIE)?.value);
  const [unreadCount, recent] = await Promise.all([
    getUnreadCount(user.id),
    getNotifications(user.id, { limit: 8 }),
  ]);
  const items = recent.map((item) => ({
    ...item,
    href: notificationHref(item, user.role),
  }));

  return (
    <header className="navbar navbar-expand-lg d-print-none app-header">
      <div className="container-fluid">
        <NavToggle />
        <Link href="/" className="navbar-brand d-lg-none" aria-label="RunOsorno Training">
          <Logo variant="mark" />
        </Link>
        <div className="navbar-nav flex-row ms-auto align-items-center">
          <ThemeToggle initialTheme={theme} />
          <NotificationBell unreadCount={unreadCount} items={items} />
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
                className="btn btn-sm btn-ghost-secondary app-logout"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <IconLogout
                  size={18}
                  stroke={1.75}
                  className="app-logout-icon d-sm-none me-0"
                  aria-hidden
                />
                <span className="app-logout-label d-none d-sm-inline">
                  Cerrar sesión
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
