import { requireRole } from "@/lib/auth/guards";

export const instant = false;

export default async function AdminDashboardPage() {
  const { user } = await requireRole("admin");
  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title">Dashboard Admin</h2>
        <p className="text-secondary">
          Bienvenido, {user.name}. El contenido completo llega en la Fase 30.
        </p>
      </div>
    </div>
  );
}
