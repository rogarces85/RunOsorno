"use client";

import { useState, useTransition } from "react";
import {
  IconCheck,
  IconDeviceFloppy,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import {
  updateBaseSessionTypesAction,
  updateNotDoneReasonsAction,
} from "@/lib/actions/settings.actions";

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

  const singular =
    kind === "reasons" ? "el motivo" : "el tipo de sesión";
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
    setItems(items.map((item, i) => (i === editingIndex ? { id, label } : item)));
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
            <IconCheck size={16} className="me-1" />
          ) : (
            <IconX size={16} className="me-1" />
          )}
          {notice.message}
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-vcenter card-table">
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
                <td>
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
                <td>
                  {editingIndex === index ? (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={draft.id}
                      aria-label={`${idLabel} del elemento`}
                      onChange={(e) =>
                        setDraft({ ...draft, id: e.target.value })
                      }
                    />
                  ) : (
                    <code>{item.id}</code>
                  )}
                </td>
                <td className="text-end">
                  {editingIndex === index ? (
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        aria-label="Guardar cambios"
                        onClick={saveEdit}
                      >
                        <IconCheck size={16} stroke={1.75} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-label="Cancelar edición"
                        onClick={() => {
                          setEditingIndex(null);
                          setDraft({ id: "", label: "" });
                        }}
                      >
                        <IconX size={16} stroke={1.75} />
                      </button>
                    </div>
                  ) : (
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-label={`Editar ${item.label}`}
                        onClick={() => startEdit(index)}
                      >
                        <IconPencil size={16} stroke={1.75} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        aria-label={`Eliminar ${item.label}`}
                        disabled={items.length <= 1}
                        onClick={() => removeItem(index)}
                      >
                        <IconTrash size={16} stroke={1.75} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {adding && (
              <tr>
                <td>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Ej: Baja médica"
                    aria-label="Nueva etiqueta"
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={toId(draft.label) || "baja_medica"}
                    aria-label="Nuevo identificador"
                    value={draft.id}
                    onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  />
                </td>
                <td className="text-end">
                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      aria-label="Agregar elemento"
                      onClick={addItem}
                    >
                      <IconCheck size={16} stroke={1.75} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label="Cancelar"
                      onClick={() => {
                        setAdding(false);
                        setDraft({ id: "", label: "" });
                      }}
                    >
                      <IconX size={16} stroke={1.75} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex gap-2">
        {!adding && (
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => {
              setAdding(true);
              setEditingIndex(null);
              setDraft({ id: "", label: "" });
            }}
          >
            <IconPlus size={16} stroke={1.75} className="me-1" />
            Agregar
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={isPending}
          onClick={onSave}
        >
          <IconDeviceFloppy size={16} stroke={1.75} className="me-1" />
          {isPending ? "Guardando…" : "Guardar lista"}
        </button>
      </div>

      <p className="form-hint mt-2">
        El identificador se guarda en los registros ya existentes, así que al
        editar un elemento se conserva la clave interna.
      </p>
    </div>
  );
}
