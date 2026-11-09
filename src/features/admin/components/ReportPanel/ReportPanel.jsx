import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError } from "@/core/api";
import { formatCurrency } from "@/core/utils/currency";

import { DataTable } from "../DataTable";

import styles from "./ReportPanel.module.css";

const LIMITS = [10, 25, 50, 100];

/**
 * Reporte paginado en el servidor (`?from&to&page&limit`), p. ej.
 * `GET /transactions/sales`.
 * @param {{ section: (typeof import("../../resources.js").SECTIONS)[number] }} props
 */
export function ReportPanel({ section }) {
  const { report, columns, label, amountKey } = section;
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [query, setQuery] = useState({ from: "", to: "", page: 1, limit: 25 });
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ status: "loading", data: [], pagination: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    report(query)
      .then((payload) => {
        if (cancelled) return;
        setState({ status: "ready", data: payload?.data ?? [], pagination: payload?.pagination ?? null, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", data: [], pagination: null, error: describeError(error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [report, query, reload]);

  function applyFilters(event) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setState((current) => ({ ...current, status: "error", error: "La fecha «desde» no puede ser posterior a «hasta»." }));
      return;
    }
    setState((current) => ({ ...current, status: "loading" }));
    setQuery((current) => ({ ...current, ...filters, page: 1 }));
  }

  function goTo(page) {
    setState((current) => ({ ...current, status: "loading" }));
    setQuery((current) => ({ ...current, page }));
  }

  const { pagination } = state;
  const pageTotal = amountKey ? state.data.reduce((sum, record) => sum + Number(record[amountKey] ?? 0), 0) / 100 : null;

  return (
    <div className={styles.panel}>
      <Card>
        <CardHeader>
          <h3 className={styles.heading}>Filtros</h3>
        </CardHeader>
        <CardBody>
          <form className={styles.filters} onSubmit={applyFilters}>
            <Field
              label="Desde"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            />
            <Field
              label="Hasta"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            />
            <Field
              as="select"
              label="Por página"
              value={String(query.limit)}
              onChange={(event) => {
                setState((current) => ({ ...current, status: "loading" }));
                setQuery((current) => ({ ...current, limit: Number(event.target.value), page: 1 }));
              }}
            >
              {LIMITS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </Field>
            <div className={styles.filterActions}>
              <Button type="submit" variant="secondary">Aplicar</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setFilters({ from: "", to: "" });
                  setState((current) => ({ ...current, status: "loading" }));
                  setQuery((current) => ({ ...current, from: "", to: "", page: 1 }));
                }}
              >
                Limpiar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className={styles.resultsHeader}>
          <h3 className={styles.heading}>{label}</h3>
          {pagination ? (
            <p className={styles.summary}>
              {pagination.total} registro(s)
              {pageTotal != null && state.data.length > 0 ? ` · total en esta página: ${formatCurrency(pageTotal)}` : ""}
            </p>
          ) : null}
        </CardHeader>
        <CardBody className={styles.results}>
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
            <div className={styles.errorBox}>
              <Alert tone="error">{state.error}</Alert>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setState((current) => ({ ...current, status: "loading" }));
                  setReload((value) => value + 1);
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : null}
          {state.status === "ready" && state.data.length === 0 ? (
            <EmptyState
              compact
              icon={section.icon ?? "chart"}
              title="No hay registros para los filtros elegidos"
              description="Prueba con otro rango de fechas o limpia los filtros."
            />
          ) : null}
          {state.status === "ready" && state.data.length > 0 ? (
            <DataTable
              caption={label}
              columns={columns}
              records={state.data}
              rowKey={(record) => String(record.transaction_id)}
            />
          ) : null}
          {pagination && pagination.total_pages > 1 ? (
            <nav className={styles.pager} aria-label={`Paginación de ${label}`}>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1 || state.status === "loading"}
                onClick={() => goTo(pagination.page - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {pagination.page} de {pagination.total_pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.total_pages || state.status === "loading"}
                onClick={() => goTo(pagination.page + 1)}
              >
                Siguiente
              </Button>
            </nav>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
