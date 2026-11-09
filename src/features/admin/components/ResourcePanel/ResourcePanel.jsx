import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError, toList } from "@/core/api";
import { cx } from "@/core/utils/cx";

import { changedFields, valuesFromRecord } from "../../formValues.js";
import { ConfirmDialog } from "../ConfirmDialog";
import { DataTable } from "../DataTable";
import { RecordForm } from "../RecordForm";
import { StockForm } from "../StockForm";

import styles from "./ResourcePanel.module.css";

const NO_DELETE = { record: null, pending: false, error: "" };

/**
 * Panel de una sección: alta (o ajuste de stock de un registro existente),
 * tabla con búsqueda y, según el recurso, edición, acciones por fila y
 * eliminación con confirmación.
 * @param {{ section: (typeof import("../../resources.js").SECTIONS)[number] }} props
 */
export function ResourcePanel({ section }) {
  const {
    list,
    create,
    update,
    remove,
    removeHint,
    columns,
    fields,
    editFields = fields,
    singular,
    label,
    stockFlow,
    rowActions = [],
    searchKeys = [],
  } = section;
  const [state, setState] = useState({ status: list ? "loading" : "idle", records: [], error: "" });
  const [mode, setMode] = useState("create");
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState({ tone: "success", text: "" });
  const [formKey, setFormKey] = useState(0);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(NO_DELETE);
  const [busyRow, setBusyRow] = useState(null);

  const load = useCallback(
    () =>
      list()
        .then((payload) => setState({ status: "ready", records: toList(payload), error: "" }))
        .catch((error) => setState({ status: "error", records: [], error: describeError(error).message })),
    [list],
  );

  useEffect(() => {
    if (list) load();
  }, [list, load]);

  function reload() {
    setState((current) => ({ ...current, status: "loading" }));
    return load();
  }

  async function handleCreate(body) {
    await create(body);
    setNotice({ tone: "success", text: `Se registró ${singular} correctamente.` });
    setFormKey((key) => key + 1);
    if (list) await load();
  }

  async function handleUpdate(body) {
    const changes = changedFields(body, editing);
    if (Object.keys(changes).length === 0) {
      setNotice({ tone: "info", text: "No hay cambios que guardar." });
    } else {
      await update(editing.id, changes);
      setNotice({ tone: "success", text: `Se actualizó ${singular} #${editing.id}.` });
    }
    setEditing(null);
    await load();
  }

  async function confirmDelete() {
    const { record } = deleting;
    setDeleting((current) => ({ ...current, pending: true, error: "" }));
    try {
      await remove(record.id);
      setDeleting(NO_DELETE);
      setNotice({ tone: "success", text: `Se eliminó ${singular} #${record.id} («${record.name ?? ""}»).` });
      await load();
    } catch (error) {
      setDeleting((current) => ({ ...current, pending: false, error: describeError(error).message }));
    }
  }

  async function runRowAction(action, record) {
    setBusyRow(record.id);
    try {
      await action.run(record);
      setNotice({ tone: "success", text: action.notice(record) });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error).message });
    } finally {
      setBusyRow(null);
    }
  }

  async function handleStockDone(message) {
    setNotice({ tone: "success", text: message });
    await load();
  }

  const term = query.trim().toLowerCase();
  const visible =
    term && searchKeys.length > 0
      ? state.records.filter((record) =>
          [record.id, ...searchKeys.map((key) => record[key])].some((value) =>
            String(value ?? "").toLowerCase().includes(term),
          ),
        )
      : state.records;
  const hasActions = Boolean(update || remove || rowActions.length > 0);

  function startEdit(record) {
    setNotice({ tone: "success", text: "" });
    setEditing(record);
    document.getElementById(`admin-form-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={styles.panel}>
      {notice.text ? (
        <Alert tone={notice.tone} className={styles.notice}>
          <span>{notice.text}</span>
          <button type="button" className={styles.dismiss} onClick={() => setNotice({ tone: "success", text: "" })}>
            Cerrar aviso
          </button>
        </Alert>
      ) : null}

      {create || editing ? (
        <Card id={`admin-form-${section.id}`}>
          <CardHeader className={styles.formHeader}>
            <h3 className={styles.heading}>
              {editing
                ? `Editar ${singular} #${editing.id}`
                : mode === "stock"
                  ? `${stockFlow?.allowDecrease ? "Ajustar" : "Aumentar"} stock de un ${singular} existente`
                  : `Registrar ${singular} nuevo`}
            </h3>
            {stockFlow && !editing ? (
              <div className={styles.modes} role="radiogroup" aria-label="¿Qué quieres hacer?">
                {[
                  { value: "create", text: "Registrar nuevo" },
                  { value: "stock", text: stockFlow.allowDecrease ? "Ajustar stock existente" : "Aumentar stock existente" },
                ].map((option) => (
                  <label key={option.value} className={cx(styles.mode, mode === option.value && styles.modeSelected)}>
                    <input
                      type="radio"
                      name={`mode-${section.id}`}
                      className="sr-only"
                      value={option.value}
                      checked={mode === option.value}
                      onChange={() => setMode(option.value)}
                    />
                    {option.text}
                  </label>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardBody>
            {editing ? (
              <RecordForm
                key={`edit-${editing.id}`}
                fields={editFields}
                record={editing}
                initial={valuesFromRecord(editFields, editing)}
                submitLabel="Guardar cambios"
                onSubmit={handleUpdate}
                onCancel={() => setEditing(null)}
              />
            ) : mode === "stock" && stockFlow ? (
              state.status === "ready" ? (
                <StockForm records={state.records} singular={singular} flow={stockFlow} onDone={handleStockDone} />
              ) : state.status === "error" ? (
                <Alert tone="error">No se pudieron cargar los registros existentes: {state.error}</Alert>
              ) : (
                <p role="status">Cargando registros…</p>
              )
            ) : (
              <RecordForm key={formKey} fields={fields} submitLabel={`Registrar ${singular}`} onSubmit={handleCreate} />
            )}
          </CardBody>
        </Card>
      ) : null}

      {list ? (
        <Card>
          <CardHeader className={styles.listHeader}>
            <h3 className={styles.heading}>
              {label} <span className={styles.count}>({state.records.length})</span>
            </h3>
            <div className={styles.listTools}>
              {searchKeys.length > 0 && state.records.length > 0 ? (
                <Field
                  label="Buscar"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={styles.search}
                />
              ) : null}
              <Button variant="outline" size="sm" onClick={reload} disabled={state.status === "loading"}>
                <Icon name="refresh" size={16} />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardBody className={styles.listBody}>
            {state.status === "loading" ? (
              <>
                <p role="status" className="sr-only">
                  Cargando…
                </p>
                <div className={styles.skeleton} aria-hidden="true">
                  {[1, 2, 3, 4].map((n) => (
                    <Skeleton key={n} height="2.75rem" />
                  ))}
                </div>
              </>
            ) : null}
            {state.status === "error" ? (
              <EmptyState
                compact
                icon="alert"
                tone="danger"
                title="No se pudieron cargar los registros"
                description={state.error}
                actions={
                  <Button variant="outline" size="sm" onClick={reload}>
                    Reintentar
                  </Button>
                }
              />
            ) : null}
            {state.status === "ready" && state.records.length === 0 ? (
              <EmptyState
                compact
                icon={section.icon ?? "info"}
                title="Aún no hay registros"
                description={create ? `Usa el formulario de arriba para registrar el primer ${singular}.` : undefined}
              />
            ) : null}
            {state.status === "ready" && state.records.length > 0 && visible.length === 0 ? (
              <EmptyState
                compact
                icon="search"
                title={`Ningún registro coincide con «${query}»`}
                actions={
                  <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                    Limpiar búsqueda
                  </Button>
                }
              />
            ) : null}
            {state.status === "ready" && visible.length > 0 ? (
              <DataTable
                caption={label}
                columns={columns}
                records={visible}
                actions={
                  hasActions
                    ? (record) => (
                        <>
                          {update ? (
                            <Button variant="outline" size="sm" onClick={() => startEdit(record)}>
                              <Icon name="pencil" size={16} />
                              Editar
                            </Button>
                          ) : null}
                          {rowActions.map((action) => (
                            <Button
                              key={action.label(record)}
                              variant="outline"
                              size="sm"
                              disabled={busyRow === record.id}
                              onClick={() => runRowAction(action, record)}
                            >
                              {action.label(record)}
                            </Button>
                          ))}
                          {remove ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleting({ record, pending: false, error: "" })}
                            >
                              <Icon name="trash" size={16} />
                              Eliminar
                            </Button>
                          ) : null}
                        </>
                      )
                    : undefined
                }
              />
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {remove ? (
        <ConfirmDialog
          open={Boolean(deleting.record)}
          title={`¿Eliminar ${singular}?`}
          pending={deleting.pending}
          error={deleting.error}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(NO_DELETE)}
        >
          {deleting.record ? (
            <p>
              Vas a eliminar {singular} <strong>#{deleting.record.id}</strong>
              {deleting.record.name ? (
                <>
                  {" "}
                  («{deleting.record.name}»)
                </>
              ) : null}
              . Dejará de mostrarse en el sistema. {removeHint ?? ""}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
