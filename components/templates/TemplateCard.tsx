"use client";

import Link from "next/link";
import { BIcon } from "@/components/ui/BIcon";
import { formatSessionType } from "@/lib/utils/format";
import type { TemplateListItem } from "@/lib/services/template.service";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function TemplateCard({
  item,
  onClone,
  onShare,
  onUnshare,
  onDelete,
}: {
  item: TemplateListItem;
  onClone: () => void;
  onShare: () => void;
  onUnshare: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className="h-100"
      title={
        <Link
          href={`/coach/templates/${item.id}`}
          className="text-reset text-decoration-none"
        >
          {item.name}
        </Link>
      }
      actions={
        <>
          {item.isOfficial && <Badge tone="info">Oficial</Badge>}
          {item.isShared && item.groupName && (
            <Badge tone="primary">Compartida</Badge>
          )}
        </>
      }
    >
      {item.isShared && item.groupName && (
        <p className="app-card-note">
          <BIcon name="people" size={14} aria-hidden />
          Visible para el grupo {item.groupName}
        </p>
      )}

      <div className="app-card-meta">
        <div className="app-card-meta-main">
          <Badge tone="neutral" dot={false}>
            {formatSessionType(item.sessionType)}
          </Badge>
          <span className="app-card-meta-text">
            {item.sectionCount} seccione{item.sectionCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="btn-list app-card-meta-actions">
          <Link
            href={`/coach/templates/${item.id}`}
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              iconOnly: true,
            })}
            title={item.canEdit ? "Editar" : "Ver"}
          >
            {item.canEdit ? (
              <BIcon name="pencil" size={16} aria-hidden />
            ) : (
              <BIcon name="eye" size={16} aria-hidden />
            )}
            <span className="visually-hidden">
              {item.canEdit ? "Editar plantilla" : "Ver plantilla"}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Clonar plantilla"
            title="Clonar"
            onClick={onClone}
          >
            <BIcon name="copy" size={16} aria-hidden />
          </Button>
          {item.canShare && !item.isShared && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Compartir con mi grupo"
              title="Compartir con mi grupo"
              onClick={onShare}
            >
              <BIcon name="share" size={16} aria-hidden />
            </Button>
          )}
          {item.canShare && item.isShared && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Dejar de compartir"
              title="Dejar de compartir"
              onClick={onUnshare}
            >
              <BIcon name="people" size={16} aria-hidden />
            </Button>
          )}
          {item.canDelete && (
            <Button
              variant="danger-ghost"
              size="sm"
              iconOnly
              aria-label="Eliminar plantilla"
              title="Eliminar"
              onClick={onDelete}
            >
              <BIcon name="trash" size={16} aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
