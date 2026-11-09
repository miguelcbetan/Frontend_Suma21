import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { inventoryService, productsService, salesService, toList } from "@/core/api";

import styles from "./OverviewPanel.module.css";

const LOW_STOCK = 5;

/** Ejecuta la consulta y devuelve `{ status, data }` sin lanzar errores. */
async function settle(promise) {
  try {
    return { status: "ready", data: toList(await promise) };
  } catch {
    return { status: "error", data: [] };
  }
}

/**
 * Indicadores calculados con los listados que ya usa el panel
 * (`GET /products`, `GET /inventory`, `GET /sales`). Solo lee datos.
 * @param {{ onNavigate: (sectionId: string) => void }} props
 */
export function OverviewPanel({ onNavigate }) {
  const [data, setData] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([settle(productsService.list()), settle(inventoryService.list()), settle(salesService.list())]).then(
      ([products, inventory, sales]) => !cancelled && setData({ products, inventory, sales }),
    );
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const load = useCallback(() => {
    setData(null);
    setReloadKey((key) => key + 1);
  }, []);

  if (!data) {
    return (
      <>
        <p role="status" className="sr-only">
          Cargando resumen…
        </p>
        <div className={styles.grid} aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} height="8.5rem" radius="lg" />
          ))}
        </div>
      </>
    );
  }

  const { products, inventory, sales } = data;
  const soldOut = products.data.filter((record) => Number(record.stock_qty ?? 0) <= 0);
  const lowStock = products.data.filter((record) => {
    const stock = Number(record.stock_qty ?? 0);
    return stock > 0 && stock <= LOW_STOCK;
  });
  const needed = inventory.data.filter((record) => record.is_needed);
  const pendingSales = sales.data.filter((record) => record.status === "PENDING");
  const approvedSales = sales.data.filter((record) => record.status === "APPROVED");

  const cards = [
    {
      id: "products",
      icon: "bag",
      tone: "green",
      label: "Productos en la tienda",
      source: products,
      value: products.data.length,
      detail: `${soldOut.length} agotados · ${lowStock.length} con ${LOW_STOCK} unidades o menos`,
      alert: soldOut.length > 0,
    },
    {
      id: "inventory",
      icon: "package",
      tone: "orange",
      label: "Artículos solicitados",
      source: inventory,
      value: needed.length,
      detail: `de ${inventory.data.length} artículos de inventario`,
    },
    {
      id: "sales",
      icon: "clock",
      tone: "neutral",
      label: "Ventas pendientes de pago",
      source: sales,
      value: pendingSales.length,
      detail: `${approvedSales.length} aprobadas de ${sales.data.length} registradas`,
    },
    {
      id: "sales-report",
      icon: "coins",
      tone: "green",
      label: "Ventas aprobadas",
      source: sales,
      value: approvedSales.length,
      detail: "Consulta montos e ingresos por fecha",
    },
  ];

  return (
    <div className={styles.panel}>
      <ul className={styles.grid}>
        {cards.map(({ id, icon, tone, label, source, value, detail, alert }) => (
          <li key={label}>
            <button type="button" className={styles.card} onClick={() => onNavigate(id)}>
              <span className={`${styles.icon} ${styles[tone]}`}>
                <Icon name={icon} size={22} />
              </span>
              <span className={styles.label}>{label}</span>
              {source.status === "error" ? (
                <span className={styles.error}>No se pudo cargar</span>
              ) : (
                <span className={styles.value}>{value}</span>
              )}
              {source.status === "ready" ? (
                <span className={alert ? styles.detailAlert : styles.detail}>{detail}</span>
              ) : null}
              <span className={styles.go}>
                Ver detalle
                <Icon name="arrowRight" size={16} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
        <p className={styles.note}>Datos calculados en el momento con la información del servidor.</p>
        <Button variant="outline" size="sm" onClick={load}>
          <Icon name="refresh" size={16} />
          Actualizar
        </Button>
      </div>
    </div>
  );
}
