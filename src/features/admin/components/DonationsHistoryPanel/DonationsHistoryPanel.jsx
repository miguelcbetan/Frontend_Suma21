import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ProductChips } from "@/components/ui/ProductChips";
import { Skeleton } from "@/components/ui/Skeleton";
import { SortMenu } from "@/components/ui/SortMenu";
import { useToast } from "@/components/ui/Toast";
import { describeError, donationsService } from "@/core/api";
import { formatCurrency } from "@/core/utils/currency";
import { cx } from "@/core/utils/cx";
import { formatDateTimeShort } from "@/core/utils/date";
import { downloadBlob } from "@/core/utils/downloadFile";
import { formatPlanDate, frequencyInfo, isCyclePaid } from "@/core/utils/sponsorPlan";

import { DataTable } from "../DataTable";
import { FormDialog } from "../FormDialog";
import sharedStyles from "../ResourcePanel/ResourcePanel.module.css";

import styles from "./DonationsHistoryPanel.module.css";

const TABS = [
  { value: "MONETARY", label: "Monetarias", noun: "donación monetaria", plural: "donaciones monetarias" },
  { value: "SPONSOR_PLAN", label: "Plan Padrino", noun: "plan padrino", plural: "planes padrino" },
  { value: "IN_KIND", label: "En especie", noun: "donación en especie", plural: "donaciones en especie" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Ordenar: Más recientes" },
  { value: "oldest", label: "Más antiguas" },
  { value: "amount-desc", label: "Mayor monto" },
  { value: "amount-asc", label: "Menor monto" },
];

const STATUS_META = {
  APPROVED: { label: "Aprobada", tone: "green" },
  ACTIVE: { label: "Activo", tone: "green" },
  COMPLETED: { label: "Completado", tone: "green" },
  PENDING: { label: "Pendiente", tone: "orange" },
  DECLINED: { label: "Rechazada", tone: "danger" },
  VOIDED: { label: "Anulada", tone: "danger" },
  ERROR: { label: "Error", tone: "danger" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

const STATUS_OPTIONS_BY_TAB = {
  MONETARY: [
    { value: "all", label: "Todos" },
    { value: "APPROVED", label: "Aprobadas" },
    { value: "PENDING", label: "Pendientes" },
    { value: "DECLINED", label: "Rechazadas / Anuladas" },
  ],
  SPONSOR_PLAN: [
    { value: "all", label: "Todos" },
    { value: "ACTIVE", label: "Activos" },
    { value: "COMPLETED", label: "Completados" },
    { value: "CANCELLED", label: "Cancelados" },
  ],
  IN_KIND: [],
};

const CYCLE_STATUS_META = {
  PAID: { label: "Pagada", tone: "green" },
  PENDING: { label: "Pendiente", tone: "orange" },
  OVERDUE: { label: "Vencida", tone: "danger" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
};

function toLocalDateKey(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDonorDoc(donor) {
  if (!donor) return "";
  return [donor.documentType, donor.documentNumber].filter(Boolean).join(" ");
}

function normalizeDonations(payload) {
  const monetary = (payload?.monetary ?? []).map((item) => {
    const statusInfo = STATUS_META[item.status] ?? { label: item.status, tone: "neutral" };
    return {
      id: `monetary-${item.donationId}`,
      kind: "MONETARY",
      kindId: item.donationId,
      donorName: item.donor?.fullName ?? "Donante",
      donorDoc: formatDonorDoc(item.donor),
      donorEmail: item.donor?.email ?? "",
      dateIso: item.createdAt,
      dateKey: toLocalDateKey(item.createdAt),
      timestamp: new Date(item.createdAt).getTime() || 0,
      amount: Number(item.amount ?? 0),
      paymentMethod: item.paymentMethod ?? null,
      statusKey: item.status,
      statusLabel: statusInfo.label,
      statusTone: statusInfo.tone,
      certificateIssued: Boolean(item.certificateIssued),
      certificateNumber: item.certificateNumber ?? null,
      canDownloadCertificate: Boolean(item.canDownloadCertificate),
      searchText: [
        item.donor?.fullName,
        item.donor?.documentNumber,
        item.donor?.email,
        item.paymentMethod,
        item.certificateNumber,
        statusInfo.label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });

  const sponsorPlans = (payload?.sponsorPlans ?? []).map((plan) => {
    const statusInfo = STATUS_META[plan.status] ?? { label: plan.status, tone: "neutral" };
    const cycles = Array.isArray(plan.cycles) ? plan.cycles : [];
    const paidCount = cycles.filter(isCyclePaid).length;
    const hasCert = cycles.some((c) => Boolean(c.certificateIssued || c.canDownloadCertificate));
    const certNumbers = cycles.map((c) => c.certificateNumber).filter(Boolean).join(" ");
    const freq = frequencyInfo(plan.frequency);
    return {
      id: `plan-${plan.sponsorPlanId}`,
      kind: "SPONSOR_PLAN",
      kindId: plan.sponsorPlanId,
      donorName: plan.donor?.fullName ?? "Donante",
      donorDoc: formatDonorDoc(plan.donor),
      donorEmail: plan.donor?.email ?? "",
      dateIso: plan.createdAt,
      startDate: plan.startDate,
      endDate: plan.endDate,
      dateKey: toLocalDateKey(plan.startDate || plan.createdAt),
      timestamp: new Date(plan.createdAt).getTime() || 0,
      amount: Number(plan.amount ?? 0),
      frequencyLabel: freq.label,
      cycles,
      paidCount,
      statusKey: plan.status,
      statusLabel: statusInfo.label,
      statusTone: statusInfo.tone,
      certificateIssued: hasCert,
      certificateNumber: certNumbers || null,
      canDownloadCertificate: false,
      searchText: [
        freq.label,
        plan.donor?.fullName,
        plan.donor?.documentNumber,
        plan.donor?.email,
        certNumbers,
        statusInfo.label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });

  const inkind = (payload?.inkind ?? []).map((item) => {
    const chipItems = (item.items ?? []).map((line) => ({
      productId: line.inventoryItemId,
      name: line.itemName,
      quantity: Number(line.quantity ?? 0),
    }));
    const itemNames = chipItems.map((line) => line.name).join(" ");
    return {
      id: `inkind-${item.inkindId}`,
      kind: "IN_KIND",
      kindId: item.inkindId,
      donorName: item.donor?.fullName ?? "Donante",
      donorDoc: formatDonorDoc(item.donor),
      donorEmail: item.donor?.email ?? "",
      dateIso: item.createdAt,
      donationDate: item.donationDate,
      dateKey: toLocalDateKey(item.donationDate || item.createdAt),
      timestamp: new Date(item.createdAt || item.donationDate).getTime() || 0,
      amount: Number(item.totalEstimatedAmount ?? 0),
      chipItems,
      notes: item.notes ?? null,
      statusKey: "REGISTERED",
      certificateIssued: Boolean(item.certificateIssued),
      certificateNumber: item.certificateNumber ?? null,
      canDownloadCertificate: Boolean(item.canDownloadCertificate),
      searchText: [
        item.donor?.fullName,
        item.donor?.documentNumber,
        item.donor?.email,
        itemNames,
        item.notes,
        item.certificateNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });

  return { MONETARY: monetary, SPONSOR_PLAN: sponsorPlans, IN_KIND: inkind };
}

function DonorCell({ row }) {
  return (
    <div className={styles.donorCell}>
      <strong>{row.donorName}</strong>
      {row.donorDoc ? <span className={styles.subText}>{row.donorDoc}</span> : null}
    </div>
  );
}

/**
 * Panel administrativo de donaciones (`GET /api/v1/donations`):
 * separa por tipo en pestañas limpias (`Monetarias`, `Plan Padrino`, `En especie`)
 * para dar amplitud a cada tabla y mostrar solo columnas relevantes en cada caso.
 */
export function DonationsHistoryPanel() {
  const searchId = useId();
  const popoverWrapRef = useRef(null);
  const toast = useToast();

  const [state, setState] = useState({
    status: "loading",
    byTab: { MONETARY: [], SPONSOR_PLAN: [], IN_KIND: [] },
    error: "",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState("MONETARY");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [certFilter, setCertFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    donationsService
      .listAllAdmin()
      .then((payload) => !cancelled && setState({ status: "ready", byTab: normalizeDonations(payload), error: "" }))
      .catch(
        (error) =>
          !cancelled &&
          setState({ status: "error", byTab: { MONETARY: [], SPONSOR_PLAN: [], IN_KIND: [] }, error: describeError(error).message }),
      );
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [popoverOpen]);

  const tabRecords = useMemo(() => state.byTab[activeTab] ?? [], [state.byTab, activeTab]);
  const totalCount =
    state.byTab.MONETARY.length + state.byTab.SPONSOR_PLAN.length + state.byTab.IN_KIND.length;
  const tabMeta = TABS.find((t) => t.value === activeTab) ?? TABS[0];
  const statusOptions = STATUS_OPTIONS_BY_TAB[activeTab] ?? [];

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, status: totalCount > 0 ? "ready" : "loading", error: "" }));
    setReloadKey((key) => key + 1);
  }, [totalCount]);

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    setStatusFilter("all");
    setPopoverOpen(false);
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setCertFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  async function handleDownloadCertificate(key, fetcher, filename) {
    setDownloadingKey(key);
    try {
      const blob = await fetcher();
      downloadBlob(blob, filename);
      toast.success("Certificado descargado.");
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setDownloadingKey(null);
    }
  }

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const filtered = tabRecords.filter((row) => {
      if (statusFilter !== "all") {
        if (statusFilter === "DECLINED") {
          if (!["DECLINED", "VOIDED", "ERROR"].includes(row.statusKey)) return false;
        } else if (row.statusKey !== statusFilter) {
          return false;
        }
      }
      if (certFilter === "issued" && !row.certificateIssued) return false;
      if (certFilter === "none" && row.certificateIssued) return false;
      if (dateFrom && row.dateKey && row.dateKey < dateFrom) return false;
      if (dateTo && row.dateKey && row.dateKey > dateTo) return false;
      if (text && !row.searchText.includes(text)) return false;
      return true;
    });

    return filtered.slice().sort((a, b) => {
      if (sortBy === "oldest") return a.timestamp - b.timestamp;
      if (sortBy === "amount-desc") return b.amount - a.amount || b.timestamp - a.timestamp;
      if (sortBy === "amount-asc") return a.amount - b.amount || b.timestamp - a.timestamp;
      return b.timestamp - a.timestamp;
    });
  }, [tabRecords, statusFilter, certFilter, dateFrom, dateTo, query, sortBy]);

  const hasSecondaryFilters =
    (statusOptions.length > 0 && statusFilter !== "all") ||
    certFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);
  const hasActiveFilters = Boolean(query.trim()) || hasSecondaryFilters;

  const columns = useMemo(() => {
    if (activeTab === "SPONSOR_PLAN") {
      return [
        {
          key: "startDate",
          label: "Vigencia",
          render: (row) => (
            <div className={styles.detailCell}>
              <span>{formatPlanDate(row.startDate)}</span>
              <span className={styles.subText}>Hasta {formatPlanDate(row.endDate)}</span>
            </div>
          ),
        },
        {
          key: "donorName",
          label: "Donante",
          render: (row) => <DonorCell row={row} />,
        },
        {
          key: "detail",
          label: "Frecuencia y cuotas",
          render: (row) => (
            <div className={styles.detailCell}>
              <strong>{row.frequencyLabel}</strong>
              <span className={styles.subText}>
                {row.paidCount}/{row.cycles.length} {row.cycles.length === 1 ? "cuota pagada" : "cuotas pagadas"}
              </span>
            </div>
          ),
        },
        {
          key: "amount",
          label: "Cuota",
          render: (row) => <span className={styles.amountStrong}>{formatCurrency(row.amount)}</span>,
        },
        {
          key: "statusLabel",
          label: "Estado",
          render: (row) => <Badge tone={row.statusTone}>{row.statusLabel}</Badge>,
        },
      ];
    }

    if (activeTab === "IN_KIND") {
      return [
        {
          key: "donationDate",
          label: "Fecha",
          format: (row) => formatPlanDate(row.donationDate),
        },
        {
          key: "donorName",
          label: "Donante",
          render: (row) => <DonorCell row={row} />,
        },
        {
          key: "detail",
          label: "Artículos recibidos",
          render: (row) => (
            <div className={styles.detailCell}>
              <ProductChips items={row.chipItems} />
              {row.notes ? <span className={styles.subText}>Nota: {row.notes}</span> : null}
              {row.certificateNumber ? <span className={styles.certCode}>{row.certificateNumber}</span> : null}
            </div>
          ),
        },
        {
          key: "amount",
          label: "Avalúo estimado",
          render: (row) =>
            row.amount > 0 ? (
              <span className={styles.amountStrong}>{formatCurrency(row.amount)}</span>
            ) : (
              <span className={styles.subText}>Sin avalúo</span>
            ),
        },
      ];
    }

    return [
      {
        key: "dateIso",
        label: "Fecha",
        format: (row) => formatDateTimeShort(row.dateIso),
      },
      {
        key: "donorName",
        label: "Donante",
        render: (row) => <DonorCell row={row} />,
      },
      {
        key: "detail",
        label: "Pago y certificado",
        render: (row) => (
          <div className={styles.detailCell}>
            <span>{row.paymentMethod ? `En línea · ${row.paymentMethod}` : "En línea"}</span>
            {row.certificateNumber ? <span className={styles.certCode}>{row.certificateNumber}</span> : null}
          </div>
        ),
      },
      {
        key: "amount",
        label: "Monto",
        render: (row) => <span className={styles.amountStrong}>{formatCurrency(row.amount)}</span>,
      },
      {
        key: "statusLabel",
        label: "Estado",
        render: (row) => <Badge tone={row.statusTone}>{row.statusLabel}</Badge>,
      },
    ];
  }, [activeTab]);

  return (
    <div className={sharedStyles.panel}>
      <div className={sharedStyles.toolbar}>
        <h3 className={sharedStyles.heading}>
          {tabMeta.label}{" "}
          {state.status === "ready" ? (
            <span className={sharedStyles.count}>
              ({hasActiveFilters ? `${visible.length} de ${tabRecords.length}` : tabRecords.length}{" "}
              {tabRecords.length === 1 ? "registro" : "registros"})
            </span>
          ) : null}
        </h3>
        {activeTab === "IN_KIND" ? (
          <Link to="/admin/donacion-en-especie" className={buttonClassName({ size: "sm" })}>
            <Icon name="plus" size={16} />
            Registrar donación
          </Link>
        ) : null}
      </div>

      <Card>
        <div className={sharedStyles.filters}>
          <div className={sharedStyles.filtersTop}>
            <div className={sharedStyles.search}>
              <label htmlFor={searchId} className="sr-only">
                Buscar en {tabMeta.label.toLowerCase()}
              </label>
              <Icon name="search" size={16} className={sharedStyles.searchIcon} />
              <input
                id={searchId}
                type="search"
                className={sharedStyles.searchInput}
                placeholder={
                  activeTab === "IN_KIND"
                    ? "Buscar por donante, documento o artículo…"
                    : "Buscar por donante, documento o certificado…"
                }
                value={query}
                disabled={tabRecords.length === 0}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className={sharedStyles.filterHeaderActions}>
              <SortMenu
                compact
                mobileAlign="start"
                label="Ordenar donaciones"
                options={SORT_OPTIONS}
                value={sortBy}
                disabled={tabRecords.length === 0}
                onChange={setSortBy}
              />

              <div className={sharedStyles.popoverWrap} ref={popoverWrapRef}>
                <button
                  type="button"
                  aria-expanded={popoverOpen}
                  disabled={tabRecords.length === 0}
                  className={cx(sharedStyles.controlBtn, hasSecondaryFilters && sharedStyles.controlBtnActive)}
                  onClick={() => setPopoverOpen((open) => !open)}
                >
                  <Icon name="sliders" size={16} />
                  <span>Filtros</span>
                  {hasSecondaryFilters ? <span className={sharedStyles.activeDot} aria-hidden="true" /> : null}
                </button>

                {popoverOpen ? (
                  <div className={sharedStyles.popover} role="dialog" aria-label={`Filtros de ${tabMeta.label}`}>
                    <div className={sharedStyles.popoverFields}>
                      {statusOptions.length > 0 ? (
                        <Field
                          as="select"
                          label="Estado"
                          value={statusFilter}
                          onChange={(event) => setStatusFilter(event.target.value)}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Field>
                      ) : null}

                      <Field
                        as="select"
                        label="Certificado"
                        value={certFilter}
                        onChange={(event) => setCertFilter(event.target.value)}
                      >
                        <option value="all">Todos</option>
                        <option value="issued">Con certificado emitido</option>
                        <option value="none">Sin certificado emitido</option>
                      </Field>

                      <div className={sharedStyles.popoverGrid}>
                        <Field
                          label="Desde"
                          type="date"
                          value={dateFrom}
                          onChange={(event) => setDateFrom(event.target.value)}
                        />
                        <Field
                          label="Hasta"
                          type="date"
                          value={dateTo}
                          onChange={(event) => setDateTo(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className={sharedStyles.popoverActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("all");
                          setCertFilter("all");
                          setDateFrom("");
                          setDateTo("");
                        }}
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

              <Button variant="ghost" size="sm" onClick={load} disabled={state.status === "loading"}>
                <Icon name="refresh" size={16} />
                Actualizar
              </Button>

              {hasActiveFilters ? (
                <button type="button" className={sharedStyles.clearLink} onClick={clearFilters}>
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>

          <div className={sharedStyles.pills} role="tablist" aria-label="Categoría de donaciones">
            {TABS.map((tab) => {
              const selected = activeTab === tab.value;
              const count = (state.byTab[tab.value] ?? []).length;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  disabled={state.status === "loading"}
                  className={cx(sharedStyles.pill, selected && sharedStyles.pillActive)}
                  onClick={() => handleTabChange(tab.value)}
                >
                  {tab.label}
                  {state.status === "ready" ? <span className={styles.tabCount}>({count})</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <CardBody className={sharedStyles.listBody}>
          {state.status === "loading" ? (
            <div className={sharedStyles.skeleton} aria-busy="true">
              <Skeleton height="2.75rem" />
              <Skeleton height="2.75rem" />
              <Skeleton height="2.75rem" />
            </div>
          ) : null}

          {state.status === "error" ? (
            <Alert tone="error">
              No se pudieron cargar las donaciones: {state.error}{" "}
              <Button variant="outline" size="sm" onClick={load}>
                Reintentar
              </Button>
            </Alert>
          ) : null}

          {state.status === "ready" && tabRecords.length === 0 ? (
            <EmptyState
              icon="heart"
              title={`Aún no hay ${tabMeta.plural}`}
              description={`Cuando exista alguna ${tabMeta.noun}, aparecerá en esta pestaña.`}
            />
          ) : null}

          {state.status === "ready" && tabRecords.length > 0 && visible.length === 0 ? (
            <EmptyState
              icon="search"
              title="Sin resultados para esos filtros"
              description="Prueba con otro término o limpia los filtros aplicados."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : null}

          {state.status === "ready" && visible.length > 0 ? (
            <DataTable
              caption={`Historial de ${tabMeta.label.toLowerCase()}`}
              columns={columns}
              records={visible}
              actions={(row) => {
                if (row.kind === "MONETARY") {
                  return row.canDownloadCertificate ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingKey === row.id}
                      onClick={() =>
                        handleDownloadCertificate(
                          row.id,
                          () => donationsService.monetaryCertificate(row.kindId),
                          `certificado-${row.certificateNumber ?? `donacion-${row.kindId}`}.pdf`,
                        )
                      }
                    >
                      <Icon name="receipt" size={16} />
                      {downloadingKey === row.id ? "Descargando…" : "Certificado"}
                    </Button>
                  ) : (
                    <span className={styles.subText}>Sin certificado</span>
                  );
                }
                if (row.kind === "IN_KIND") {
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingKey === row.id}
                      onClick={() =>
                        handleDownloadCertificate(
                          row.id,
                          () => donationsService.inKindCertificate(row.kindId),
                          `certificado-${row.certificateNumber ?? `especie-${row.kindId}`}.pdf`,
                        )
                      }
                    >
                      <Icon name="receipt" size={16} />
                      {downloadingKey === row.id ? "Descargando…" : "Certificado"}
                    </Button>
                  );
                }
                return (
                  <Button variant="outline" size="sm" onClick={() => setSelectedPlan(row)}>
                    <Icon name="heart" size={16} />
                    Ver cuotas ({row.cycles.length})
                  </Button>
                );
              }}
            />
          ) : null}
        </CardBody>
      </Card>

      {selectedPlan ? (
        <FormDialog
          title={`Plan Padrino · ${selectedPlan.donorName}`}
          description={`${selectedPlan.frequencyLabel} de ${formatCurrency(selectedPlan.amount)} · Vigencia hasta ${formatPlanDate(selectedPlan.endDate)}`}
          onClose={() => setSelectedPlan(null)}
        >
          <ul className={styles.cyclesList}>
            {selectedPlan.cycles.map((cycle) => {
              const cMeta = CYCLE_STATUS_META[cycle.status] ?? { label: cycle.status, tone: "neutral" };
              const certKey = `cycle-${cycle.cycleId}`;
              return (
                <li key={cycle.cycleId} className={styles.cycleItem}>
                  <div className={styles.cycleInfo}>
                    <strong>Cuota {cycle.cycleNumber}</strong>
                    <span className={styles.subText}>
                      Vencimiento: {formatPlanDate(cycle.dueDate)} · {formatCurrency(cycle.amount)}
                      {cycle.certificateNumber ? ` · ${cycle.certificateNumber}` : ""}
                    </span>
                  </div>
                  <div className={styles.cycleActions}>
                    <Badge tone={cMeta.tone}>{cMeta.label}</Badge>
                    {cycle.canDownloadCertificate && cycle.donationId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingKey === certKey}
                        onClick={() =>
                          handleDownloadCertificate(
                            certKey,
                            () => donationsService.monetaryCertificate(cycle.donationId),
                            `certificado-${cycle.certificateNumber ?? `cuota-${cycle.donationId}`}.pdf`,
                          )
                        }
                      >
                        <Icon name="receipt" size={15} />
                        {downloadingKey === certKey ? "…" : "PDF"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </FormDialog>
      ) : null}
    </div>
  );
}
