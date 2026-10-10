"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import {
  deleteTemplateAction,
  unshareTemplateAction,
} from "@/lib/actions/template.actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { GroupBasic } from "@/lib/services/group.service";
import type { TemplateListItem } from "@/lib/services/template.service";
import { CloneDialog } from "./CloneDialog";
import { ShareDialog } from "./ShareDialog";
import { TemplateCard } from "./TemplateCard";

export type TemplateNotice = {
  type: "success" | "danger";
  message: string;
};

type TabKey = "own" | "official" | "group";

const TABS: { key: TabKey; label: string }[] = [
  { key: "own", label: "Mías" },
  { key: "official", label: "Oficiales" },
  { key: "group", label: "Grupo" },
];

const EMPTY_MESSAGES: Record<TabKey, string> = {
  own: "Aún no tienes plantillas. Crea la primera con “Nueva plantilla”.",
  official: "No hay plantillas oficiales disponibles todavía.",
  group: "Tu grupo aún no tiene plantillas compartidas por otros coaches.",
};

export function TemplateList({
  templates,
  groups,
}: {
  templates: TemplateListItem[];
  groups: GroupBasic[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("own");
  const [notice, setNotice] = useState<TemplateNotice | null>(null);
  const [cloning, setCloning] = useState<TemplateListItem | null>(null);
  const [sharing, setSharing] = useState<TemplateListItem | null>(null);
  const [unsharing, setUnsharing] = useState<TemplateListItem | null>(null);
  const [deleting, setDeleting] = useState<TemplateListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const counts: Record<TabKey, number> = {
    own: templates.filter((item) => item.ownership === "own").length,
    official: templates.filter((item) => item.ownership === "official").length,
    group: templates.filter((item) => item.ownership === "group").length,
  };
  const visible = templates.filter((item) => item.ownership === tab);

  const showNotice = (next: TemplateNotice) => setNotice(next);

  const runUnshare = async () => {
    if (!unsharing) {
      return;
    }
    setBusy(true);
    const result = await unshareTemplateAction(unsharing.id);
    setBusy(false);
    setUnsharing(null);
    if (result.ok) {
      showNotice({
        type: "success",
        message: "Plantilla dejada de compartir",
      });
      router.refresh();
    } else {
      showNotice({ type: "danger", message: result.error });
    }
  };

  const runDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusy(true);
    const result = await deleteTemplateAction(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) {
      showNotice({ type: "success", message: "Plantilla eliminada" });
      router.refresh();
    } else {
      showNotice({ type: "danger", message: result.error });
    }
  };

  return (
    <>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-secondary mb-0">
          {templates.length === 0
            ? "Tu biblioteca está vacía."
            : `${templates.length} plantilla${templates.length === 1 ? "" : "s"} en total`}
        </p>
        <Link href="/coach/templates/new" className="btn btn-primary">
          <IconPlus size={18} stroke={1.75} className="me-1" />
          Nueva plantilla
        </Link>
      </div>

      {notice && (
        <div
          className={`alert alert-${notice.type} alert-dismissible`}
          role="alert"
        >
          {notice.message}
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setNotice(null)}
          />
        </div>
      )}

      <ul className="nav nav-tabs mb-3" role="tablist">
        {TABS.map((item) => (
          <li className="nav-item" key={item.key}>
            <button
              type="button"
              className={`nav-link ${tab === item.key ? "active" : ""}`}
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
              <span className="badge bg-secondary-lt text-secondary-emphasis ms-1">
                {counts[item.key]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="row">
        {visible.length === 0 && (
          <div className="col-12">
            <div className="card">
              <div className="card-body text-secondary text-center py-4">
                {EMPTY_MESSAGES[tab]}
              </div>
            </div>
          </div>
        )}
        {visible.map((item) => (
          <div key={item.id} className="col-md-6 col-xl-4 mb-3">
            <TemplateCard
              item={item}
              onClone={() => setCloning(item)}
              onShare={() => setSharing(item)}
              onUnshare={() => setUnsharing(item)}
              onDelete={() => setDeleting(item)}
            />
          </div>
        ))}
      </div>

      {cloning && (
        <CloneDialog template={cloning} onClose={() => setCloning(null)} />
      )}

      {sharing && (
        <ShareDialog
          template={sharing}
          groups={groups}
          onClose={() => setSharing(null)}
          onShared={(message) => showNotice({ type: "success", message })}
        />
      )}

      <ConfirmDialog
        open={unsharing !== null}
        title="Dejar de compartir"
        message={
          unsharing
            ? `¿Dejar de compartir "${unsharing.name}" con el grupo? Los demás coaches dejarán de verla.`
            : ""
        }
        confirmLabel="Dejar de compartir"
        danger={false}
        busy={busy}
        onConfirm={runUnshare}
        onCancel={() => setUnsharing(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar plantilla"
        message={
          deleting
            ? `¿Eliminar la plantilla "${deleting.name}"? Solo es posible si no tiene sesiones planificadas.`
            : ""
        }
        confirmLabel="Eliminar"
        danger
        busy={busy}
        onConfirm={runDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
