import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { describeError, toList } from "@/core/api";

import { changedFields, valuesFromRecord } from "../../formValues.js";
import { RecordForm } from "../RecordForm";

import styles from "./ResourcePanel.module.css";

function formatCell(value) {
  if (value == null || value === "") return "—";
  return String(value);
}

/**
 * Panel de una sección: tabla de registros (si el endpoint lista), formulario
 * de alta y, según el recurso, edición y borrado.
 * @param {{ section: (typeof import("../../resources.js").SECTIONS)[number] }} props
 */
export function ResourcePanel({ section }) {
  const { list, create, update, remove, columns, fields, singular, label } = section;
  const [state, setState] = useState({ status: list ? "loading" : "idle", records: [], error: "" });
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(
    () =>
      list()
        .then((payload) => setState({ status: "ready", records: toList(payload), error: "" }))
        .catch((error) =>
          setState({ status: "error", records: [], error: describeError(error).message }),
        ),
    [list],
  );

  useEffect(() => {
    if (list) load();
  }, [list, load]);

  async function handleCreate(body) {
    await create(body);
    setNotice(`Se registró ${singular} correctamente.`);
    setActionError("");
    setFormKey((key) => key + 1);
    if (list) await load();
  }

  async function handleUpdate(body) {
    const changes = changedFields(body, editing);
    if (Object.keys(changes).length === 0) {
      setNotice("No hay cambios que guardar.");
    } else {
      await update(editing.id, changes);
      setNotice(`Se actualizó ${singular} correctamente.`);
    }
    setActionError("");
    setEditing(null);
    await load();
  }

  async function handleDelete(record) {
    if (!window.confirm(`¿Eliminar ${singular} #${record.id}?`)) return;
    try {
      await remove(record.id);
      setNotice(`Se eliminó ${singular} #${record.id}.`);
      setActionError("");
      await load();
    } catch (error) {
      setNotice("");
      setActionError(describeError(error).message);
    }
  }

  const hasActions = Boolean(update || remove);

  return (
    <div className={styles.panel}>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <Card>
        <CardHeader>
          <h3 className={styles.heading}>{editing ? `Editar ${singular} #${editing.id}` : `Registrar ${singular}`}</h3>
        </CardHeader>
        <CardBody>
          {editing ? (
            <RecordForm
              key={`edit-${editing.id}`}
              fields={fields}
              initial={valuesFromRecord(fields, editing)}
              submitLabel="Guardar cambios"
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <RecordForm key={formKey} fields={fields} submitLabel="Registrar" onSubmit={handleCreate} />
          )}
        </CardBody>
      </Card>

      {list ? (
        <Card>
          <CardHeader>
            <h3 className={styles.heading}>{label} registrados</h3>
          </CardHeader>
          <CardBody>
            {state.status === "loading" ? <p role="status">Cargando…</p> : null}
            {state.status === "error" ? (
              <div className={styles.errorBox}>
                <Alert tone="error">{state.error}</Alert>
                <Button variant="secondary" size="sm" onClick={load}>
                  Reintentar
                </Button>
              </div>
            ) : null}
            {state.status === "ready" && state.records.length === 0 ? <p>Aún no hay registros.</p> : null}
            {state.status === "ready" && state.records.length > 0 ? (
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column.key} scope="col">
                          {column.label}
                        </th>
                      ))}
                      {hasActions ? <th scope="col">Acciones</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {state.records.map((record) => (
                      <tr key={record.id}>
                        {columns.map((column) => (
                          <td key={column.key}>{formatCell(record[column.key])}</td>
                        ))}
                        {hasActions ? (
                          <td className={styles.actions}>
                            {update ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setNotice("");
                                  setEditing(record);
                                }}
                              >
                                Editar
                              </Button>
                            ) : null}
                            {remove ? (
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(record)}>
                                Eliminar
                              </Button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
