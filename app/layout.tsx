import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { THEME_COOKIE, themeFromCookie } from "@/lib/ui/theme";
import "./globals.css";

/**
 * Archivo variable, subset latin, servida por la propia aplicación (Fase A).
 *
 * Se autohospeda a propósito: sin peticiones a terceros en runtime —lo que también
 * ayuda al límite de CPU de Workers— y con un solo archivo de ~35 KB para los cuatro
 * pesos. `display: swap` evita bloquear el texto mientras carga.
 */
const archivo = localFont({
  src: "./fonts/archivo-latin-variable.woff2",
  variable: "--font-archivo",
  weight: "400 700",
  style: "normal",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "RunOsorno Training",
    template: "%s · RunOsorno Training",
  },
  description:
    "Plataforma de gestión de entrenamiento de running y trail running: planificación, registro de sesiones y seguimiento del cumplimiento.",
  applicationName: "RunOsorno Training",
};

/**
 * El tema se resuelve por cookie en cada petición, así que el árbol no puede
 * prerenderizarse estático: se declara dinámico en la raíz. Es el mismo opt-out que
 * ya usan las páginas que leen la sesión (`export const instant = false`).
 */
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = themeFromCookie(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="es-CL"
      data-bs-theme={theme}
      data-scroll-behavior="smooth"
      className={archivo.variable}
    >
      <body>{children}</body>
    </html>
  );
}
