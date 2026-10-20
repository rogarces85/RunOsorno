"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconPlus, IconTemplate } from "@tabler/icons-react";
import {
  deleteTemplateAction,
  unshareTemplateAction,
} from "@/lib/actions/template.actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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

const EMPTY: Record<
  TabKey,
  {
    title: string;
    description: string;
    action?: { label: string; href: string };
  }
> = {
  own: {
    title: "No hay plantillas",
    description:
      "Crea tu primera plantilla con la estructura del sesión (calentamiento, entrenamiento específico y enfriamiento) para reutilizarla cada semana.",
    action: { label: "Nueva plantilla", href: "/coach/templates/new" },
  },
  official: {
    title: "No hay plantillas oficiales",
    description:
      "El administrador todavía no ha cargado plantillas oficiales. Cuando lo haga, podrás clonarlas y adaptarlas a tus atletas.",
  },
  group: {
    title: "No hay plantillas compartidas",
    description:
      "Ningún coach de tu grupo ha compartido plantillas todavía. Las que compartan aparecerán aquí para clonarlas.",
  },
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
            ? "Tu biblioteca de plantillas"
            : `${templates.length} plantilla${templates.length === 1 ? "" : "s"} en total`}
        </p>
        <Link
          href="/coach/templates/new"
          className={buttonClassName({ variant: "primary" })}
        >
          <IconPlus size={18} stroke={1.75} className="me-1" />
          Nueva plantilla
        </Link>
      </div>

      {notice && (
        <Alert
          variant={notice.type}
          dismissible
          onDismiss={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      {/*
        Filtros, no pestañas reales (Fase 48).

        Llevaban `role="tablist"` / `role="tab"` sin nada detrás: no hay
        `tabpanel`, ni `aria-controls`, ni navegación con flechas, que es lo que
        ese patrón exige. Peor: `tablist` solo admite hijos `tab`, y aquí los
        hijos son `<li>`, así que axe marcaba tres reglas distintas
        (`aria-required-children`, `aria-required-parent` y `listitem`).

        Lo que sí es cierto es que son botones que activan y desactivan un
        filtro, y eso es exactamente lo que dice `aria-pressed`.
      */}
      <ul className="nav nav-tabs mb-3">
        {TABS.map((item) => (
          <li className="nav-item" key={item.key}>
            <button
              type="button"
              className={`nav-link ${tab === item.key ? "active" : ""}`}
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
              <Badge tone="neutral" dot={false} className="ms-1">
                {counts[item.key]}
              </Badge>
            </button>
          </li>
        ))}
      </ul>

      <div className="row">
        {visible.length === 0 && (
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <EmptyState
                  icon={IconTemplate}
                  title={EMPTY[tab].title}
                  description={EMPTY[tab].description}
                  actionLabel={EMPTY[tab].action?.label}
                  actionHref={EMPTY[tab].action?.href}
                  actionVariant="outline-primary"
                />
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
