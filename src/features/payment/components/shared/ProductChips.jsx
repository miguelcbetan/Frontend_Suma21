import { useState } from "react";

import { cx } from "@/core/utils/cx";

import styles from "./ProductChips.module.css";

const DEFAULT_LIMIT = 3;

/**
 * Lista compacta de productos en píldoras: muestra hasta `limit` elementos
 * y permite desplegar el resto en una caja con desplazamiento.
 */
export function ProductChips({ items, limit = DEFAULT_LIMIT, className }) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  const hiddenCount = Math.max(0, items.length - limit);
  const visible = expanded || hiddenCount === 0 ? items : items.slice(0, limit);

  return (
    <div className={cx(styles.wrap, className)}>
      <ul className={cx(styles.list, expanded && styles.expanded)} aria-label="Productos">
        {visible.map((item, idx) => {
          const label = item.name ?? item.label ?? `Producto #${item.productId ?? idx + 1}`;
          return (
            <li key={`${item.productId ?? label}-${idx}`} className={styles.chip} title={`${item.quantity} × ${label}`}>
              <span className={styles.qty}>{item.quantity} ×</span>
              <span className={styles.name}>{label}</span>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Ver menos" : `+${hiddenCount} ${hiddenCount === 1 ? "producto más" : "productos más"}`}
        </button>
      ) : null}
    </div>
  );
}
