import { useCallback, useEffect, useId, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError, toList } from "@/core/api";

import { changedFields, valuesFromRecord } from "../../formValues.js";
import { ConfirmDialog } from "../ConfirmDialog";
import { DataTable } from "../DataTable";
import { FormDialog } from "../FormDialog";
import { RecordForm } from "../RecordForm";
import { StockForm } from "../StockForm";

import styles from "./ResourcePanel.module.css";

const NO_DELETE = { record: null, pending: false, error: "" };
const NO_NOTICE = { tone: "success", text: "" };

/**
 * Panel de una sección. La pantalla principal es el listado (tabla con
 * búsqueda y acciones por fila); crear, editar y ajustar stock se hacen en
 * una ventana emergente (`FormDialog`). Eliminar pide confirmación.
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
  const searchId = useId();
  const [state, setState] = useState({ status: list ? "loading" : "idle", records: [], error: "" });
  /** `null | { type: "create" } | { type: "edit", record } | { type: "stock", recordId? }` */
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(NO_NOTICE);
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

  function openDialog(next) {
    setNotice(NO_NOTICE);
    setDialog(next);
  }

  const closeDialog = useCallback(() => setDialog(null), []);

  async function handleCreate(body) {
    await create(body);
    setDialog(null);
    setNotice({ tone: "success", text: `Se registró ${singular} correctamente.` });
    if (list) await load();
  }

  async function handleUpdate(body) {
    const { record } = dialog;
    const changes = changedFields(body, record);
    if (Object.keys(changes).length === 0) {
      setNotice({ tone: "info", text: "No hay cambios que guardar." });
    } else {
      await update(record.id, changes);
      setNotice({ tone: "success", text: `Se actualizó ${singular} #${record.id}.` });
    }
    setDialog(null);
    await load();
  }

  async function handleStockDone(message) {
    setDialog(null);
    setNotice({ tone: "success", text: message });
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

  const term = query.trim().toLowerCase();
  const visible =
    term && searchKeys.length > 0
      ? state.records.filter((record) =>
          [record.id, ...searchKeys.map((key) => record[key])].some((value) =>
            String(value ?? "").toLowerCase().includes(term),
          ),
        )
      : state.records;
  const hasActions = Boolean(update || remove || stockFlow || rowActions.length > 0);
  const stockLabel = stockFlow?.allowDecrease ? "Ajustar stock" : "Aumentar stock";
  const canAdjustStock = Boolean(stockFlow) && state.status === "ready" && state.records.length > 0;

  let dialogContent = null;
  if (dialog?.type === "create") {
    dialogContent = (
      <FormDialog title={`Nuevo ${singular}`} description="Completa los datos y registra." onClose={closeDialog}>
        <RecordForm fields={fields} submitLabel={`Registrar ${singular}`} onSubmit={handleCreate} onCancel={closeDialog} />
      </FormDialog>
    );
  } else if (dialog?.type === "edit") {
    dialogContent = (
      <FormDialog title={`Editar ${singular} #${dialog.record.id}`} description={dialog.record.name} onClose={closeDialog}>
        <RecordForm
          fields={editFields}
          record={dialog.record}
          initial={valuesFromRecord(editFields, dialog.record)}
          submitLabel="Guardar cambios"
          onSubmit={handleUpdate}
          onCancel={closeDialog}
        />
      </FormDialog>
    );
  } else if (dialog?.type === "stock" && stockFlow) {
    dialogContent = (
      <FormDialog
        title={stockLabel}
        description={`Suma${stockFlow.allowDecrease ? " o descuenta" : ""} unidades de un ${singular} existente sin crear uno nuevo.`}
        onClose={closeDialog}
      >
        <StockForm
          records={state.records}
          singular={singular}
          flow={stockFlow}
          initialId={dialog.recordId}
          onDone={handleStockDone}
        />
      </FormDialog>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <h3 className={styles.heading}>
          Listado{" "}
          {list && state.status === "ready" ? (
            <span className={styles.count}>
              ({state.records.length} {state.records.length === 1 ? "registro" : "registros"})
            </span>
          ) : null}
        </h3>
        <div className={styles.toolbarActions}>
          {stockFlow ? (
            <Button variant="outline" onClick={() => openDialog({ type: "stock" })} disabled={!canAdjustStock}>
              <Icon name="package" size={18} />
              {stockLabel}
            </Button>
          ) : null}
          {create ? (
            <Button onClick={() => openDialog({ type: "create" })}>
              <Icon name="plus" size={18} />
              Nuevo {singular}
            </Button>
          ) : null}
        </div>
      </div>

      {notice.text ? (
        <Alert tone={notice.tone} className={styles.notice}>
          <span>{notice.text}</span>
          <button type="button" className={styles.dismiss} onClick={() => setNotice(NO_NOTICE)}>
            Cerrar aviso
          </button>
        </Alert>
      ) : null}

      {list ? (
        <Card>
          <div className={styles.filters}>
            {searchKeys.length > 0 ? (
              <div className={styles.search}>
                <label htmlFor={searchId} className="sr-only">
                  Buscar {label.toLowerCase()}
                </label>
                <Icon name="search" size={18} className={styles.searchIcon} />
                <input
                  id={searchId}
                  type="search"
                  className={styles.searchInput}
                  placeholder="Buscar por nombre, descripción o ID…"
                  value={query}
                  disabled={state.records.length === 0}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            ) : (
              <span />
            )}
            <Button variant="ghost" size="sm" onClick={reload} disabled={state.status === "loading"}>
              <Icon name="refresh" size={16} />
              Actualizar
            </Button>
          </div>

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
                description={create ? `Registra el primer ${singular} para verlo en este listado.` : undefined}
                actions={
                  create ? (
                    <Button size="sm" onClick={() => openDialog({ type: "create" })}>
                      <Icon name="plus" size={16} />
                      Nuevo {singular}
                    </Button>
                  ) : null
                }
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
                          {stockFlow ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog({ type: "stock", recordId: String(record.id) })}
                              aria-label={`${stockLabel}: ${record.name ?? `#${record.id}`}`}
                            >
                              <Icon name="package" size={16} />
                              Stock
                            </Button>
                          ) : null}
                          {update ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog({ type: "edit", record })}
                              aria-label={`Editar: ${record.name ?? `#${record.id}`}`}
                            >
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
                              aria-label={`Eliminar: ${record.name ?? `#${record.id}`}`}
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

      {dialogContent}

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
