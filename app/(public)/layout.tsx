import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { dashboardPath } from "@/lib/auth/role";
import { usuarioSiHaySesion } from "@/lib/auth/session";
import { SITE, mailtoContacto } from "@/lib/site";
import { THEME_COOKIE, themeFromCookie } from "@/lib/ui/theme";
import "../styles/marketing.css";

/**
 * Layout del sitio público (landing).
 *
 * No lleva sidebar ni campanita: solo marca, control de tema y entrada al sistema.
 * El tema sale de la cookie en el servidor, igual que en la app, así que la landing
 * tampoco destella al cargar.
 *
 * Con sesión abierta, la portada y el login llevan al tablero del rol. Esa
 * comprobación vive aquí (y no en el middleware) porque el middleware ya no
 * toca la base de datos: ahorra una conexión MySQL por petición.
 */
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = themeFromCookie(cookieStore.get(THEME_COOKIE)?.value);

  const user = await usuarioSiHaySesion();
  if (user) {
    redirect(dashboardPath(user.role));
  }

  return (
    <>
      <header className="app-public-header">
        <div className="app-public-header-inner">
          <Link href="/" className="app-brand" aria-label={SITE.nombre}>
            <Logo />
          </Link>
          <div className="app-public-header-actions">
            <ThemeToggle initialTheme={theme} />
            <Link href="/login" className="btn app-btn app-btn-primary app-btn-sm">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="app-public-main">
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </main>

      <footer className="app-public-footer">
        <div className="app-public-footer-inner">
          <div className="app-public-footer-brand">
            <Logo />
            <p className="app-muted mb-0">{SITE.claim}</p>
          </div>
          <div className="app-public-footer-links">
            <a href={mailtoContacto()}>{SITE.email}</a>
            <Link href="/login">Entrar al sistema</Link>
          </div>
          <p className="app-caption mb-0 app-public-footer-legal">
            © {SITE.nombre}. Los datos de entrenamiento se
            usan solo para gestionar el plan y el seguimiento de cada atleta.
          </p>
        </div>
      </footer>
    </>
  );
}
