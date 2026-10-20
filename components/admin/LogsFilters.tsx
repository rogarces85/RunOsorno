"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";

type Props = {
  actions: string[];
  entityTypes: string[];
  users: { id: string; name: string; email: string }[];
  current: {
    from?: string;
    to?: string;
    userId?: string;
    action?: string;
    entityType?: string;
    search?: string;
  };
};

/**
 * Filtros de la tabla de logs (tarea 35.4).
 *
 * Es un formulario GET: la lista completa vive en la URL, de modo que el
 * admin puede compartir un enlace con los filtros aplicados y el
 * paginado usa los search params.
 */
export function LogsFilters({ actions, entityTypes, users, current }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(
    Boolean(current.from || current.to || current.userId || current.action),
  );

  const hasFilters =
    Boolean(current.from) ||
    Boolean(current.to) ||
    Boolean(current.userId) ||
    Boolean(current.action) ||
    Boolean(current.entityType) ||
    Boolean(current.search);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      const text = String(value).trim();
      if (text) {
        params.set(key, text);
      }
    }
    const query = params.toString();
    router.push(query ? `/admin/logs?${query}` : "/admin/logs");
  }

  return (
    <div className="card mb-3">
      <div className="card-header">
        <div className="d-flex align-items-center">
          <h2 className="card-title">
            <IconFilter size={18} stroke={1.75} className="me-1" />
            Filtros
          </h2>
          <Button
            variant="secondary"
            size="sm"
            className="ms-auto"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
      </div>

      <div className="card-body">
        <form onSubmit={submit} method="get" action="/admin/logs">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label" htmlFor="log-from">
                Desde
              </label>
              <input
                id="log-from"
                type="date"
                name="from"
                className="form-control"
                defaultValue={current.from ?? ""}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label" htmlFor="log-to">
                Hasta
              </label>
              <input
                id="log-to"
                type="date"
                name="to"
                className="form-control"
                defaultValue={current.to ?? ""}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label" htmlFor="log-user">
                Usuario
              </label>
              <select
                id="log-user"
                name="userId"
                className="form-select"
                defaultValue={current.userId ?? ""}
              >
                <option value="">Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label" htmlFor="log-action">
                Acción
              </label>
              <select
                id="log-action"
                name="action"
                className="form-select"
                defaultValue={current.action ?? ""}
              >
                <option value="">Todas</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label" htmlFor="log-entity">
                Entidad
              </label>
              <select
                id="log-entity"
                name="entityType"
                className="form-select"
                defaultValue={current.entityType ?? ""}
              >
                <option value="">Todas</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-5">
              <label className="form-label" htmlFor="log-search">
                Buscar
              </label>
              <input
                id="log-search"
                type="search"
                name="search"
                className="form-control"
                placeholder="Acción, entidad, id, IP o contenido…"
                defaultValue={current.search ?? ""}
              />
            </div>

            <div className="col-md-4 d-flex align-items-end gap-2">
              <Button type="submit">
                <IconSearch size={16} stroke={1.75} className="me-1" />
                Aplicar
              </Button>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={() => router.push("/admin/logs")}
                >
                  <IconX size={16} stroke={1.75} className="me-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
