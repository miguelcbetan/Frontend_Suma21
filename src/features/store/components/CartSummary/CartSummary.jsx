import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/core/utils/currency";

import styles from "./CartSummary.module.css";

/**
 * Resumen del pedido: líneas con cantidad y subtotal, total y acción de compra.
 * @param {{
 *   lines: { product: { id: string, name: string, price: number, stock: number }, quantity: number }[],
 *   total: number,
 *   onAdd: (id: string) => void,
 *   onRemove: (id: string) => void,
 *   onDelete?: (id: string) => void,
 *   onCheckout: () => void,
 *   checkoutDisabled?: boolean,
 *   checkoutLabel?: string,
 *   controlsDisabled?: boolean,
 *   note?: import("react").ReactNode,
 * }} props
 */
export function CartSummary({
  lines,
  total,
  onAdd,
  onRemove,
  onDelete,
  onCheckout,
  checkoutDisabled = false,
  checkoutLabel = "Pagar con Wompi",
  controlsDisabled = false,
  note,
}) {
  const units = lines.reduce((sum, { quantity }) => sum + quantity, 0);

  return (
    <section id="carrito" className={styles.cart} aria-labelledby="cart-title">
      <header className={styles.header}>
        <h2 id="cart-title" className={styles.heading}>
          <Icon name="cart" size={20} />
          Tu carrito
        </h2>
        {units > 0 ? (
          <span className={styles.units}>
            {units} {units === 1 ? "unidad" : "unidades"}
          </span>
        ) : null}
      </header>

      <div className={styles.body}>
        {lines.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="cart" size={28} />
            <p>Tu carrito está vacío.</p>
            <p className={styles.emptyHint}>Agrega productos del catálogo para armar tu pedido.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className={styles.line}>
                <div className={styles.info}>
                  <p className={styles.name}>{product.name}</p>
                  <p className={styles.subtotal}>
                    {quantity} × {formatCurrency(product.price)}
                  </p>
                  {onDelete ? (
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => onDelete(product.id)}
                      disabled={controlsDisabled}
                    >
                      Quitar del carrito
                    </button>
                  ) : null}
                </div>
                <div className={styles.side}>
                  <strong className={styles.lineTotal}>{formatCurrency(product.price * quantity)}</strong>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      onClick={() => onRemove(product.id)}
                      disabled={controlsDisabled}
                      aria-label={`Quitar una unidad: ${product.name}`}
                    >
                      −
                    </button>
                    <span aria-label={`Cantidad: ${quantity}`}>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => onAdd(product.id)}
                      disabled={controlsDisabled || quantity >= product.stock}
                      aria-label={`Agregar una unidad: ${product.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.total} aria-live="polite">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </p>

        <Button size="lg" block disabled={lines.length === 0 || checkoutDisabled} onClick={onCheckout}>
          <Icon name="lock" size={18} />
          {checkoutLabel}
        </Button>
        {note ? <p className={styles.note}>{note}</p> : null}
      </div>
    </section>
  );
}
