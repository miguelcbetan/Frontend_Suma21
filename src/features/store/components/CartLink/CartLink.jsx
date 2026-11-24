import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/core/utils/currency";

import { useCart } from "../../cart/useCart.js";

import styles from "./CartLink.module.css";

/**
 * Botón del carrito en la cabecera:
 * - Al hacer hover muestra una vista rápida con los productos y el total.
 * - Al hacer clic abre el cajón lateral del carrito.
 */
export function CartLink() {
  const { count, lines, total, openDrawer, drawerOpen } = useCart();
  const [hovered, setHovered] = useState(false);
  const closeTimerRef = useRef(null);

  function showPreview() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!drawerOpen) setHovered(true);
  }

  function scheduleHidePreview() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setHovered(false);
    }, 140);
  }

  function handleOpenDrawer() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setHovered(false);
    openDrawer();
  }

  return (
    <div className={styles.wrap} onMouseEnter={showPreview} onMouseLeave={scheduleHidePreview}>
      <button
        type="button"
        className={styles.link}
        onClick={handleOpenDrawer}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        aria-label={count > 0 ? `Carrito: ${count} unidades` : "Carrito vacío"}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path
            d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.label}>Carrito</span>
        {count > 0 ? <span className={styles.count}>{count}</span> : null}
      </button>

      {hovered && !drawerOpen ? (
        <div className={styles.preview} role="region" aria-label="Resumen rápido del carrito">
          <div className={styles.previewHeader}>
            <strong>Tu carrito</strong>
            {count > 0 ? (
              <span className={styles.previewBadge}>
                {count} {count === 1 ? "ud" : "uds"}
              </span>
            ) : null}
          </div>

          {lines.length === 0 ? (
            <div className={styles.previewEmpty}>
              <p>Aún no has agregado productos.</p>
              <Link to="/apoyanos-tienda" className={styles.previewLink} onClick={() => setHovered(false)}>
                Explorar tienda
              </Link>
            </div>
          ) : (
            <>
              <ul className={styles.previewList}>
                {lines.map(({ product, quantity }) => (
                  <li key={product.id} className={styles.previewRow}>
                    <span className={styles.previewName}>
                      {quantity} × {product.name}
                    </span>
                    <span className={styles.previewPrice}>{formatCurrency(product.price * quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.previewTotal}>
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <Button size="sm" block onClick={handleOpenDrawer}>
                Abrir carrito
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
