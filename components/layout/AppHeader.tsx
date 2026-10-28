"use client";

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
    <header className="app-header navbar navbar-expand bg-body">
      <div className="container-fluid">
        {/*begin::Container-->
        {/* Navbar links */}
        <ul className="navbar-nav">
          <li className="nav-item">
            <a class="nav-link" data-lte-toggle="sidebar" href="#" role="button">
              <i class="bi bi-list"></i>
            </a>
          </li>
          <li className="nav-item d-none d-md-block">
            <a href="#" class="nav-link">Home</a>
          </li>
          <li className="nav-item d-none d-md-block">
            <a href="#" class="nav-link">Contact</a>
          </li>
        </ul>
        {/* End navbar links */}
        {/* Navbar search: a quiet pill, the icon is the submit button (md and up) */}
        <form className="navbar-search d-none d-md-block ms-3" role="search" action="search-results.html">
          <label for="navbar-search-input" className="visually-hidden">Search</label>
          <div className="navbar-search-field">
            <input type="search" id="navbar-search-input" name="q" className="form-control" placeholder="Search…" autocomplete="off" />
            <button className="navbar-search-submit" type="submit" aria-label="Submit search">
              <i class="bi bi-search" aria-hidden="true" />
            </button>
          </div>
        </form>
        <ul className="navbar-nav ms-auto">
          <!-- Search on small screens: link to the search page -->
          <li className="nav-item d-md-none">
            <a class="nav-link" href="search-results.html" aria-label="Search">
              <i class="bi bi-search" aria-hidden="true" />
            </a>
          </li>
          <li className="nav-item dropdown ms-auto">
            <ThemeToggle initialTheme={theme} />
          </li>
          <li className="nav-item dropdown ms-auto">
            <NotificationBell unreadCount={unreadCount} items={items} />
          </li>
          <li className="nav-item dropdown ms-auto">
            <UserMenu
              userId={user.id}
              name={user.name}
              role={user.role}
              avatarKey={user.avatarKey}
            />
          </li>
        </ul>
      </div>
      <!--end::Container-->
    </header>
  );
}
