import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";

/**
 * Página raíz `/`.
 *
 * Siempre requiere sesión (el layout padre ya aplica `requireAuth()`, pero esta
 * acción de servidor revalida por claridad). Redirige al dashboard del rol del
 * usuario autenticado.
 */
export default async function RootPage() {
  const { user } = await requireAuth();

  switch (user.role) {
    case "admin":
      redirect("/admin/dashboard");
    case "coach":
      redirect("/coach/dashboard");
    case "athlete":
      redirect("/athlete/dashboard");
    default:
      redirect("/login");
  }
}
