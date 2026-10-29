"use client";

import { useState, useTransition } from "react";
import { BIcon } from "@/components/ui/BIcon";
import {
  updateBaseSessionTypesAction,
  updateNotDoneReasonsAction,
} from "@/lib/actions/settings.actions";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";

type Item = { id: string; label: string };

type Props = {
  kind: "reasons" | "types";
  initial: Item[];
};

type Notice = { type: "success" | "danger"; message: string } | null;

/** Normaliza el texto a un identificador utilizable como valor interno. */
function toId(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/**
 * Lista editable de motivos "no realizada" o de tipos de sesión base
 * (tareas 34.6 y 34.7). Agregar, editar y eliminar en línea.
 */
export function EditableListForm({ kind, initial }: Props) {
  const [items, setItems] = useState<Item[]>(initial);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ id: string; label: string }>({
    id: "",
    label: "",
  });
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  const singular = kind === "reasons" ? "el motivo" : "el tipo de sesión";
  const idLabel = kind === "reasons" ? "Identificador" : "ID";

  function addItem() {
    const label = draft.label.trim();
    const id = toId(draft.id.trim() || label);
    if (!label || !id) {
      setNotice({
        type: "danger",
        message: `Completa ${singular} antes de agregarlo`,
      });
      return;
    }
    if (items.some((item) => item.id === id)) {
      setNotice({
        type: "danger",
        message: `Ya existe un elemento con el identificador "${id}"`,
      });
      return;
    }
    setItems([...items, { id, label }]);
    setDraft({ id: "", label: "" });
    setAdding(false);
    setNotice(null);
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setDraft(items[index]);
    setAdding(false);
  }

  function saveEdit() {
    if (editingIndex === null) {
      return;
    }
    const label = draft.label.trim();
    const id = toId(draft.id.trim() || label);
    if (!label || !id) {
      setNotice({
        type: "danger",
        message: `Completa ${singular} antes de guardar`,
      });
      return;
    }
    if (items.some((item, i) => i !== editingIndex && item.id === id)) {
      setNotice({
        type: "danger",
        message: `Ya existe un elemento con el identificador "${id}"`,
      });
      return;
    }
    setItems(
      items.map((item, i) => (i === editingIndex ? { id, label } : item)),
    );
    setEditingIndex(null);
    setDraft({ id: "", label: "" });
    setNotice(null);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
    setNotice(null);
  }

  function onSave() {
    setNotice(null);
    startTransition(async () => {
      const result =
        kind === "reasons"
          ? await updateNotDoneReasonsAction({ reasons: items })
          : await updateBaseSessionTypesAction({ types: items });

      if (result.ok) {
        setNotice({
          type: "success",
          message:
            kind === "reasons"
              ? "Motivos actualizados"
              : "Tipos de sesión actualizados",
        });
      } else {
        setNotice({
          type: "danger",
          message: result.error ?? "No se pudo guardar la lista",
        });
      }
      // Sin router.refresh(): el estado local ya refleja el cambio y refrescar
      // devolvería al usuario al primer tab de la página.
    });
  }

  return (
    <div>
      {notice && (
        <div className={`alert alert-${notice.type}`} role="alert">
          {notice.type === "success" ? (
            <BIcon name="check" size={16} className="me-1" aria-hidden />
          ) : (
            <BIcon name="x" size={16} className="me-1" aria-hidden />
          )}
          {notice.message}
        </div>
      )}

      <Table
        label={
          kind === "reasons"
            ? "Motivos de sesión no realizada"
            : "Tipos de sesión"
        }
        stackOnMobile
      >
        <thead>
          <tr>
            <th style={{ width: "35%" }}>Etiqueta visible</th>
            <th>Identificador</th>
            <th style={{ width: "20%" }} className="text-end">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.id}-${index}`}>
              <td data-label="Etiqueta visible">
                {editingIndex === index ? (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={draft.label}
                    aria-label={`Etiqueta de ${item.id}`}
                    onChange={(e) =>
                      setDraft({ ...draft, label: e.target.value })
                    }
                  />
                ) : (
                  item.label
                )}
              </td>
              <td data-label="Identificador">
                {editingIndex === index ? (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={draft.id}
                    aria-label={`${idLabel} del elemento`}
                    onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  />
                ) : (
                  <code>{item.id}</code>
                )}
              </td>
              <td className="text-end" data-label="Acciones">
                {editingIndex === index ? (
                  <div className="btn-group">
                    <Button
                      size="sm"
                      iconOnly
                      aria-label="Guardar cambios"
                      onClick={saveEdit}
                    >
                      <BIcon name="check" size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      iconOnly
                      aria-label="Cancelar edición"
                      onClick={() => {
                        setEditingIndex(null);
                        setDraft({ id: "", label: "" });
                      }}
                    >
                      <BIcon name="x" size={16} aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <div className="btn-group">
                    <Button
                      variant="secondary"
                      size="sm"
                      iconOnly
                      aria-label={`Editar ${item.label}`}
                      onClick={() => startEdit(index)}
                    >
                      <BIcon name="pencil" size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Eliminar ${item.label}`}
                      disabled={items.length <= 1}
                      onClick={() => removeItem(index)}
                    >
                      <BIcon name="trash" size={16} aria-hidden />
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}

          {adding && (
            <tr>
              <td data-label="Etiqueta visible">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Ej: Baja médica"
                  aria-label="Nueva etiqueta"
                  value={draft.label}
                  onChange={(e) =>
                    setDraft({ ...draft, label: e.target.value })
                  }
                />
              </td>
              <td data-label="Identificador">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={toId(draft.label) || "baja_medica"}
                  aria-label="Nuevo identificador"
                  value={draft.id}
                  onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                />
              </td>
              <td className="text-end" data-label="Acciones">
                <div className="btn-group">
                  <Button
                    size="sm"
                    iconOnly
                    aria-label="Agregar elemento"
                    onClick={addItem}
                  >
                    <BIcon name="check" size={16} aria-hidden />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconOnly
                    aria-label="Cancelar"
                    onClick={() => {
                      setAdding(false);
                      setDraft({ id: "", label: "" });
                    }}
                  >
                    <BIcon name="x" size={16} aria-hidden />
                  </Button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <div className="d-flex gap-2">
        {!adding && (
          <Button
            variant="secondary"
            onClick={() => {
              setAdding(true);
              setEditingIndex(null);
              setDraft({ id: "", label: "" });
            }}
          >
            <BIcon name="plus" size={16} className="me-1" aria-hidden />
            Agregar
          </Button>
        )}
        <Button loading={isPending} onClick={onSave}>
          <BIcon name="save" size={16} className="me-1" aria-hidden />
          {isPending ? "Guardando…" : "Guardar lista"}
        </Button>
      </div>

      <p className="form-hint mt-2">
        El identificador se guarda en los registros ya existentes, así que al
        editar un elemento se conserva la clave interna.
      </p>
    </div>
  );
}
