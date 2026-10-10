"use client";

import Link from "next/link";
import {
  IconCopy,
  IconEdit,
  IconEye,
  IconShare,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { formatSessionType } from "@/lib/utils/format";
import type { TemplateListItem } from "@/lib/services/template.service";

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
    <div className="card h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h3 className="card-title mb-0">
            <Link
              href={`/coach/templates/${item.id}`}
              className="text-reset text-decoration-none"
            >
              {item.name}
            </Link>
          </h3>
          <div className="ms-2 d-flex gap-1 flex-shrink-0">
            {item.isOfficial && (
              <span className="badge bg-purple-lt">Oficial</span>
            )}
            {item.isShared && item.groupName && (
              <span className="badge bg-blue-lt">Compartida</span>
            )}
          </div>
        </div>

        <div className="mb-3">
          <span className="badge bg-secondary-lt text-secondary-emphasis">
            {formatSessionType(item.sessionType)}
          </span>
          <span className="text-secondary small ms-2">
            {item.sectionCount} seccione{item.sectionCount === 1 ? "" : "s"}
          </span>
        </div>

        {item.isShared && item.groupName && (
          <p className="text-secondary small mb-3 d-flex align-items-center">
            <IconUsers size={14} stroke={1.75} className="me-1" />
            Visible para el grupo {item.groupName}
          </p>
        )}

        <div className="btn-list mt-auto">
          <Link
            href={`/coach/templates/${item.id}`}
            className="btn btn-sm btn-ghost-secondary"
            title={item.canEdit ? "Editar" : "Ver"}
          >
            {item.canEdit ? (
              <IconEdit size={16} stroke={1.75} />
            ) : (
              <IconEye size={16} stroke={1.75} />
            )}
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-ghost-secondary"
            title="Clonar"
            onClick={onClone}
          >
            <IconCopy size={16} stroke={1.75} />
          </button>
          {item.canShare && !item.isShared && (
            <button
              type="button"
              className="btn btn-sm btn-ghost-secondary"
              title="Compartir con mi grupo"
              onClick={onShare}
            >
              <IconShare size={16} stroke={1.75} />
            </button>
          )}
          {item.canShare && item.isShared && (
            <button
              type="button"
              className="btn btn-sm btn-ghost-secondary"
              title="Dejar de compartir"
              onClick={onUnshare}
            >
              <IconUsers size={16} stroke={1.75} />
            </button>
          )}
          {item.canDelete && (
            <button
              type="button"
              className="btn btn-sm btn-ghost-danger"
              title="Eliminar"
              onClick={onDelete}
            >
              <IconTrash size={16} stroke={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
