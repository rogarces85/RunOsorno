import Link from "next/link";
import { IconBell, IconUser } from "@tabler/icons-react";
import { logout } from "@/lib/actions/auth.actions";

export function AppHeader() {
  return (
    <header className="navbar d-print-none">
      <div className="container-fluid">
        <Link href="/" className="navbar-brand">
          RunOsorno
        </Link>
        <div className="navbar-nav flex-row ms-auto align-items-center">
          <div className="nav-item">
            <span
              className="nav-link nav-link-icon"
              title="Notificaciones"
              aria-label="Notificaciones"
            >
              <IconBell size={20} stroke={1.75} />
            </span>
          </div>
          <div className="nav-item ms-2">
            <span className="avatar avatar-sm" aria-label="Perfil">
              <IconUser size={16} stroke={1.75} />
            </span>
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
