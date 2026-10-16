import { AvatarUpload } from "@/components/profile/AvatarUpload";
import {
  PasswordChange,
  ProfileForm,
} from "@/components/profile/ProfileForms";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth } from "@/lib/auth/guards";
import { getProfile } from "@/lib/services/profile.service";
import { formatDateChile } from "@/lib/utils/date";

export const instant = false;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coach: "Coach",
  athlete: "Atleta",
};

/**
 * Perfil del usuario (Fase 37). Disponible para los tres roles: el
 * sidebar ya incluye "Perfil" en el menú del atleta y las rutas del
 * grupo `(app)` cubren a todos.
 */
export default async function ProfilePage() {
  const { user } = await requireAuth();
  const profile = await getProfile(user.id);

  if (!profile.ok) {
    return (
      <div className="row">
        <div className="col-12">
          <h1 className="page-title">Mi perfil</h1>
          <div className="alert alert-danger" role="alert">
            {profile.error}
          </div>
        </div>
      </div>
    );
  }

  const data = profile.data;

  return (
    <div className="row">
      <div className="col-12">
        <h1 className="page-title mb-3">Mi perfil</h1>

        <div className="row">
          <div className="col-lg-4 mb-3">
            <div className="card">
              <div className="card-body text-center">
                <Avatar
                  userId={user.id}
                  name={data.name}
                  avatarKey={user.avatarKey}
                  size="xl"
                />
                <div className="h3 mt-3 mb-0">{data.name}</div>
                <div className="text-secondary">{data.email}</div>
                <span className="badge bg-blue-lt text-blue-ink mt-2">
                  {ROLE_LABELS[data.role] ?? data.role}
                </span>
                {data.isActive ? (
                  <span className="badge bg-green-lt text-green-ink mt-2 ms-2">
                    Activo
                  </span>
                ) : (
                  <span className="badge bg-red-lt text-red-ink mt-2 ms-2">
                    Inactivo
                  </span>
                )}
                {data.mustChangePassword && (
                  <div className="alert alert-warning mt-3 mb-0 small">
                    Tu cuenta usa una contraseña temporal. Cámbiala abajo.
                  </div>
                )}
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h2 className="card-title">Foto de perfil</h2>
              </div>
              <div className="card-body">
                <AvatarUpload avatarKey={user.avatarKey} />
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h2 className="card-title">Cuenta</h2>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-6 text-secondary">Registrada</dt>
                  <dd className="col-6">{formatDateChile(data.createdAt)}</dd>
                  <dt className="col-6 text-secondary">Último acceso</dt>
                  <dd className="col-6">
                    {data.lastLoginAt
                      ? formatDateChile(data.lastLoginAt)
                      : "—"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card mb-3">
              <div className="card-header">
                <h2 className="card-title">Datos personales</h2>
              </div>
              <div className="card-body">
                <ProfileForm
                  initialName={data.name}
                  email={data.email}
                  isActive={data.isActive}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Seguridad</h2>
              </div>
              <div className="card-body">
                <PasswordChange />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
