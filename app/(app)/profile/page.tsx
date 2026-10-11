import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth } from "@/lib/auth/guards";

export const instant = false;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coach: "Coach",
  athlete: "Atleta",
};

export default async function ProfilePage() {
  const { user } = await requireAuth();

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title">Mi perfil</h2>
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center gap-3 mb-3">
              <Avatar
                userId={user.id}
                name={user.name}
                avatarKey={user.avatarKey}
                size="lg"
              />
              <div>
                <div className="h2 mb-1">{user.name}</div>
                <div className="text-secondary">{user.email}</div>
                <span className="badge bg-blue-lt text-blue mt-1">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>
            </div>
            <AvatarUpload avatarKey={user.avatarKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
