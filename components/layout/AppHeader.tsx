import Link from "next/link";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth/guards";
import {
  getNotifications,
  getUnreadCount,
} from "@/lib/services/notification.service";
import { notificationHref } from "@/lib/utils/notification";
import { THEME_COOKIE, themeFromCookie } from "@/lib/ui/theme";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Logo } from "./Logo";
import { NavToggle } from "./NavToggle";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

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
    <header className="app-header navbar navbar-expand bg-body d-print-none">
      <div className="container-fluid">
        <NavToggle />
        <Link href="/" className="navbar-brand d-lg-none" aria-label="RunOsorno Training">
          <Logo variant="mark" />
        </Link>
        <div className="navbar-nav flex-row ms-auto align-items-center">
          <ThemeToggle initialTheme={theme} />
          <NotificationBell unreadCount={unreadCount} items={items} />
          <UserMenu
            userId={user.id}
            name={user.name}
            role={user.role}
            avatarKey={user.avatarKey}
          />
        </div>
      </div>
    </header>
  );
}
