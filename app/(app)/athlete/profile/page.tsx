import Link from "next/link";
import { BIcon } from "@/components/ui/BIcon";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForms";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";
import { todayISO, parseISO } from "@/lib/metrics/utils";
import { SESSION_STATUS_META } from "@/lib/config/constants";

export const instant = false;

export default async function AthleteProfilePage() {
  const { user } = await requireRole("athlete");
  const router = useRouter();

  // State for notice messages
  const [notice, setNotice] = useState<{ type: "success" | "danger"; message: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<{ type: "success" | "danger"; message: string } | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Name state for the form initial value
  const [formName, setFormName] = useState(user.name || "");

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader title="Perfil" description="Configuración de tu cuenta." />

        {/* Card 1: Información personal */}
        <Card title="Información personal">
          <div className="mb-3">
            <AvatarUpload avatarKey={user.avatarKey} />
            {avatarNotice && (
              <Alert variant={avatarNotice.type} className="mt-2">
                {avatarNotice.message}
              </Alert>
            )}
          </div>

          <ProfileForm
            initialName={formName}
            email={user.email ?? ""}
            isActive={user.isActive ?? true}
          />
        </Card>

        {/* Card 2: Seguridad */}
        <Card title="Seguridad" className="mt-3">
          <Link
            href="/athlete/change-password"
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Cambiar contraseña
          </Link>
        </Card>

        {/* Account status */}
        {user.isActive === false && (
          <Alert variant="warning">
            Tu cuenta está inactiva. Contacta con el administrador para reactivarla.
          </Alert>
        )}
      </div>
    </div>
  );
}