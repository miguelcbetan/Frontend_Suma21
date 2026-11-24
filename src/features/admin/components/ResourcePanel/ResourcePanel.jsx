import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { SortMenu } from "@/components/ui/SortMenu";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { describeError, toList } from "@/core/api";
import { cx } from "@/core/utils/cx";

import { changedFields, valuesFromRecord } from "../../formValues.js";
import { DataTable } from "../DataTable";
import { FormDialog } from "../FormDialog";
import { RecordForm } from "../RecordForm";
import { StockForm } from "../StockForm";

import styles from "./ResourcePanel.module.css";

const NO_DELETE = { record: null, pending: false, error: "" };
/** Solo errores: las confirmaciones salen como notificación emergente (`useToast`). */
const NO_NOTICE = { tone: "error", text: "" };

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
    searchPlaceholder,
    getSearchText,
    primaryFilter,
    filters = [],
    sortOptions = [],
  } = section;
  const searchId = useId();
  const popoverWrapRef = useRef(null);
  const [state, setState] = useState({ status: list ? "loading" : "idle", records: [], error: "" });
  /** `null | { type: "create" } | { type: "edit", record } | { type: "stock", recordId? }` */
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(NO_NOTICE);
  const [query, setQuery] = useState("");
  const [primaryValue, setPrimaryValue] = useState("all");
  const [filterValues, setFilterValues] = useState({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sortId, setSortId] = useState(sortOptions[0]?.value ?? "");
  const [deleting, setDeleting] = useState(NO_DELETE);
  const [busyRow, setBusyRow] = useState(null);
  const [toggling, setToggling] = useState(null);
  const toast = useToast();

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

  useEffect(() => {
    if (!popoverOpen) return undefined;
    function onPointerDown(event) {
      if (popoverWrapRef.current && !popoverWrapRef.current.contains(event.target)) {
        setPopoverOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setPopoverOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [popoverOpen]);

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
    toast.success(`Se registró ${singular} correctamente.`);
    if (list) await load();
  }

  async function handleUpdate(body) {
    const { record } = dialog;
    const changes = changedFields(body, record);
    if (Object.keys(changes).length === 0) {
      toast.info("No hay cambios que guardar.");
    } else {
      await update(record.id, changes);
      toast.success(`Se actualizó ${singular} #${record.id}.`);
    }
    setDialog(null);
    await load();
  }

  async function handleStockDone(message) {
    setDialog(null);
    toast.success(message);
    await load();
  }

  async function confirmDelete() {
    const { record } = deleting;
    setDeleting((current) => ({ ...current, pending: true, error: "" }));
    try {
      await remove(record.id);
      setDeleting(NO_DELETE);
      toast.success(`Se eliminó ${singular} #${record.id} («${record.name ?? ""}»).`);
      await load();
    } catch (error) {
      setDeleting((current) => ({ ...current, pending: false, error: describeError(error).message }));
    }
  }

  async function runRowAction(action, record) {
    setBusyRow(record.id);
    try {
      await action.run(record);
      toast.success(action.notice(record));
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error).message });
    } finally {
      setBusyRow(null);
    }
  }

  /** Columna con interruptor (`type: "toggle"`): un solo envío por fila a la vez. */
  async function handleToggle(column, record) {
    if (toggling !== null) return;
    setToggling(record.id);
    setNotice(NO_NOTICE);
    try {
      await column.toggle.run(record);
      toast.success(column.toggle.notice(record));
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error).message });
    } finally {
      setToggling(null);
    }
  }

  const renderToggle = (column, record) => (
    <Switch
      checked={Boolean(record[column.key])}
      label={column.toggle.label ? column.toggle.label(record) : column.label}
      busy={toggling === record.id}
      disabled={toggling !== null}
      onChange={() => handleToggle(column, record)}
    />
  );

  const term = query.trim().toLowerCase();
  const hasSecondaryFilters = Object.values(filterValues).some(
    (value) => value !== "" && value !== undefined && value !== "all",
  );
  const hasActiveFilters =
    Boolean(term) ||
    primaryValue !== "all" ||
    hasSecondaryFilters ||
    (sortOptions.length > 0 && sortId !== (sortOptions[0]?.value ?? ""));

  function resetFilters() {
    setQuery("");
    setPrimaryValue("all");
    setFilterValues({});
    setSortId(sortOptions[0]?.value ?? "");
    setPopoverOpen(false);
  }

  let visible = state.records.filter((record) => {
    if (term && (searchKeys.length > 0 || getSearchText)) {
      const searchableValues = [
        record.id,
        ...searchKeys.map((key) => record[key]),
        ...(getSearchText ? [getSearchText(record)] : []),
      ];
      const matchesSearch = searchableValues.some((value) => String(value ?? "").toLowerCase().includes(term));
      if (!matchesSearch) return false;
    }

    if (primaryFilter && primaryValue !== "all") {
      const activePrimary = primaryFilter.options.find((option) => option.value === primaryValue);
      if (activePrimary?.match && !activePrimary.match(record)) return false;
    }

    for (const filter of filters) {
      if (filter.type === "select") {
        const selected = filterValues[filter.id] ?? "all";
        if (selected === "all") continue;
        const option = filter.options.find((item) => item.value === selected);
        if (option?.match && !option.match(record)) return false;
      } else if (filter.type === "dateRange") {
        const from = filterValues[`${filter.id}:from`] ?? "";
        const to = filterValues[`${filter.id}:to`] ?? "";
        if (!from && !to) continue;
        const dateKey = filter.getDate(record);
        if (!dateKey) return false;
        if (from && dateKey < from) return false;
        if (to && dateKey > to) return false;
      } else if (filter.type === "numberRange") {
        const minRaw = filterValues[`${filter.id}:min`] ?? "";
        const maxRaw = filterValues[`${filter.id}:max`] ?? "";
        if (minRaw === "" && maxRaw === "") continue;
        const value = Number(filter.getValue(record));
        const min = minRaw === "" ? null : Number(minRaw);
        const max = maxRaw === "" ? null : Number(maxRaw);
        if (min !== null && Number.isFinite(min) && value < min) return false;
        if (max !== null && Number.isFinite(max) && value > max) return false;
      }
    }

    return true;
  });

  if (sortOptions.length > 0) {
    const activeSort = sortOptions.find((option) => option.value === sortId) ?? sortOptions[0];
    if (activeSort?.compare) {
      visible = visible.slice().sort(activeSort.compare);
    }
  }

  const hasActions = Boolean(update || remove || rowActions.length > 0);
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
              ({hasActiveFilters ? `${visible.length} de ${state.records.length}` : state.records.length}{" "}
              {state.records.length === 1 ? "registro" : "registros"})
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
            <div className={styles.filtersTop}>
              {searchKeys.length > 0 || getSearchText ? (
                <div className={styles.search}>
                  <label htmlFor={searchId} className="sr-only">
                    Buscar {label.toLowerCase()}
                  </label>
                  <Icon name="search" size={18} className={styles.searchIcon} />
                  <input
                    id={searchId}
                    type="search"
                    className={styles.searchInput}
                    placeholder={searchPlaceholder ?? "Buscar por nombre, descripción o ID…"}
                    value={query}
                    disabled={state.records.length === 0}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              ) : (
                <span />
              )}
              <div className={styles.filterHeaderActions}>
                {sortOptions.length > 0 ? (
                  <SortMenu
                    compact
                    mobileAlign="start"
                    label={`Ordenar ${label.toLowerCase()}`}
                    options={sortOptions}
                    value={sortId}
                    disabled={state.records.length === 0}
                    onChange={setSortId}
                  />
                ) : null}

                {filters.length > 0 ? (
                  <div className={styles.popoverWrap} ref={popoverWrapRef}>
                    <button
                      type="button"
                      aria-expanded={popoverOpen}
                      disabled={state.records.length === 0}
                      className={cx(styles.controlBtn, hasSecondaryFilters && styles.controlBtnActive)}
                      onClick={() => setPopoverOpen((open) => !open)}
                    >
                      <Icon name="sliders" size={16} />
                      <span>Filtros</span>
                      {hasSecondaryFilters ? <span className={styles.activeDot} aria-hidden="true" /> : null}
                    </button>

                    {popoverOpen ? (
                      <div className={styles.popover} role="dialog" aria-label={`Más filtros de ${label}`}>
                        <div className={styles.popoverFields}>
                          {filters.map((filter) => {
                            if (filter.type === "select") {
                              return (
                                <Field
                                  key={filter.id}
                                  as="select"
                                  label={filter.label}
                                  value={filterValues[filter.id] ?? "all"}
                                  onChange={(event) =>
                                    setFilterValues((current) => ({ ...current, [filter.id]: event.target.value }))
                                  }
                                >
                                  {filter.options.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </Field>
                              );
                            }
                            if (filter.type === "dateRange") {
                              return (
                                <div key={filter.id} className={styles.popoverGrid}>
                                  <Field
                                    label={filter.fromLabel ?? "Desde"}
                                    type="date"
                                    value={filterValues[`${filter.id}:from`] ?? ""}
                                    onChange={(event) =>
                                      setFilterValues((current) => ({
                                        ...current,
                                        [`${filter.id}:from`]: event.target.value,
                                      }))
                                    }
                                  />
                                  <Field
                                    label={filter.toLabel ?? "Hasta"}
                                    type="date"
                                    value={filterValues[`${filter.id}:to`] ?? ""}
                                    onChange={(event) =>
                                      setFilterValues((current) => ({
                                        ...current,
                                        [`${filter.id}:to`]: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              );
                            }
                            if (filter.type === "numberRange") {
                              return (
                                <div key={filter.id} className={styles.popoverGrid}>
                                  <Field
                                    label={filter.minLabel ?? "Mínimo"}
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder={filter.minPlaceholder ?? "0"}
                                    value={filterValues[`${filter.id}:min`] ?? ""}
                                    onChange={(event) =>
                                      setFilterValues((current) => ({
                                        ...current,
                                        [`${filter.id}:min`]: event.target.value,
                                      }))
                                    }
                                  />
                                  <Field
                                    label={filter.maxLabel ?? "Máximo"}
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder={filter.maxPlaceholder ?? "Sin límite"}
                                    value={filterValues[`${filter.id}:max`] ?? ""}
                                    onChange={(event) =>
                                      setFilterValues((current) => ({
                                        ...current,
                                        [`${filter.id}:max`]: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                        <div className={styles.popoverActions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilterValues({})}
                          >
                            Limpiar
                          </Button>
                          <Button size="sm" onClick={() => setPopoverOpen(false)}>
                            Listo
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {hasActiveFilters ? (
                  <button type="button" className={styles.clearLink} onClick={resetFilters}>
                    Limpiar
                  </button>
                ) : null}

                <Button variant="ghost" size="sm" onClick={reload} disabled={state.status === "loading"}>
                  <Icon name="refresh" size={16} />
                  Actualizar
                </Button>
              </div>
            </div>

            {primaryFilter ? (
              <div className={styles.pills} role="group" aria-label={primaryFilter.label}>
                {primaryFilter.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={state.records.length === 0}
                    aria-pressed={primaryValue === option.value}
                    className={cx(styles.pill, primaryValue === option.value && styles.pillActive)}
                    onClick={() => setPrimaryValue(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
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
                title={term ? `Ningún registro coincide con «${query}»` : "Ningún registro coincide con los filtros"}
                actions={
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Limpiar filtros
                  </Button>
                }
              />
            ) : null}
            {state.status === "ready" && visible.length > 0 ? (
              <DataTable
                caption={label}
                columns={columns}
                records={visible}
                renderToggle={renderToggle}
                actions={
                  hasActions
                    ? (record) => (
                        <>
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
