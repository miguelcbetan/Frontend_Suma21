import { Link } from "react-router-dom";

import { useCart } from "../../cart/useCart.js";

import styles from "./CartLink.module.css";

/** Acceso al carrito en la cabecera con el número de unidades. */
export function CartLink() {
  const { enabled, count } = useCart();
  if (!enabled) return null;

  return (
    <Link
      to="/apoyanos-tienda#carrito"
      className={styles.link}
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
    </Link>
  );
}
