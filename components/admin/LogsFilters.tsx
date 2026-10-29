"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BIcon } from "@/components/ui/BIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
    <Card
      className="mb-3"
      title={
        <>
          <BIcon name="filter" size={18} className="me-2" aria-hidden />
          Filtros
        </>
      }
      actions={
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Ocultar" : "Mostrar"}
        </Button>
      }
      /* El cuerpo se oculta con `d-none` en vez de no renderizarse: la tarjeta
         siempre pinta su `card-body`, y sin esto quedaba un hueco en blanco
         debajo de la cabecera al plegar los filtros. */
      bodyClassName={open ? "" : "d-none"}
    >
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
                <BIcon name="search" size={16} className="me-1" aria-hidden />
                Aplicar
              </Button>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={() => router.push("/admin/logs")}
                >
                  <BIcon name="x" size={16} className="me-1" aria-hidden />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </form>
    </Card>
  );
}
