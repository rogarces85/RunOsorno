import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { PasswordChange, ProfileForm } from "@/components/profile/ProfileForms";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
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
          <PageHeader title="Mi perfil" />
          <Alert variant="danger">{profile.error}</Alert>
        </div>
      </div>
    );
  }

  const data = profile.data;

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Mi perfil"
          description="Tus datos, tu foto y la seguridad de la cuenta."
        />

        <div className="row">
          <div className="col-lg-4 mb-3">
            <Card>
              <div className="text-center">
                <Avatar
                  userId={user.id}
                  name={data.name}
                  avatarKey={user.avatarKey}
                  size="xl"
                />
                <div className="h3 mt-3 mb-0">{data.name}</div>
                <div className="text-secondary">{data.email}</div>
                <div className="mt-2 d-flex flex-wrap justify-content-center gap-2">
                  <Badge tone="primary" dot={false}>
                    {ROLE_LABELS[data.role] ?? data.role}
                  </Badge>
                  {data.isActive ? (
                    <Badge tone="success">Activo</Badge>
                  ) : (
                    <Badge tone="danger">Inactivo</Badge>
                  )}
                </div>
                {data.mustChangePassword && (
                  <Alert variant="warning" className="mt-3 mb-0 small">
                    Tu cuenta usa una contraseña temporal. Cámbiala abajo.
                  </Alert>
                )}
              </div>
            </Card>

            <Card title="Foto de perfil" className="mt-3">
              <AvatarUpload avatarKey={user.avatarKey} />
            </Card>

            <Card title="Cuenta" className="mt-3">
              <dl className="row mb-0">
                <dt className="col-6 text-secondary">Registrada</dt>
                <dd className="col-6">{formatDateChile(data.createdAt)}</dd>
                <dt className="col-6 text-secondary">Último acceso</dt>
                <dd className="col-6">
                  {data.lastLoginAt ? formatDateChile(data.lastLoginAt) : "—"}
                </dd>
              </dl>
            </Card>
          </div>

          <div className="col-lg-8">
            <Card title="Datos personales" className="mb-3">
              <ProfileForm
                initialName={data.name}
                email={data.email}
                isActive={data.isActive}
              />
            </Card>

            <Card title="Seguridad">
              <PasswordChange />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
