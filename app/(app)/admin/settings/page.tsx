import Link from "next/link";
import { EditableListForm } from "@/components/settings/EditableListForm";
import {
  EmailForm,
  LimitsForm,
} from "@/components/settings/SettingsForms";
import { requireRole } from "@/lib/auth/guards";
import { getAllSettings } from "@/lib/services/settings.service";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export const instant = false;

/**
 * Configuración global (Fase 34). Solo accesible para el administrador:
 * `requireRole("admin")` redirige o corta el acceso para el resto de roles.
 */
export default async function AdminSettingsPage() {
  await requireRole("admin");
  const { limits, reasons, types, email } = await getAllSettings();

  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <Link href="/admin/dashboard" className="link-secondary">
            ← Volver al dashboard
          </Link>
        </div>

        <h1 className="page-title mb-1">Configuración</h1>
        <p className="text-secondary">
          Estos valores se aplican a toda la plataforma: límites de equipos y
          atletas, ventana de edición, motivos y tipos de sesión, y el
          remitente de los correos.
        </p>

        <SettingsTabs
          limits={<LimitsForm initial={limits} />}
          reasons={<EditableListForm kind="reasons" initial={reasons} />}
          types={<EditableListForm kind="types" initial={types} />}
          email={<EmailForm initial={email} />}
        />
      </div>
    </div>
  );
}
