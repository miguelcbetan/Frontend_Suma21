import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/core/utils/currency";

import styles from "./CartSummary.module.css";

/**
 * Resumen del pedido: líneas con su cantidad, total y acción de compra.
 * @param {{
 *   lines: { product: { id: string, name: string, price: number, stock: number }, quantity: number }[],
 *   total: number,
 *   onAdd: (id: string) => void,
 *   onRemove: (id: string) => void,
 *   onCheckout: () => void,
 *   checkoutDisabled?: boolean,
 *   checkoutLabel?: string,
 * }} props
 */
export function CartSummary({
  lines,
  total,
  onAdd,
  onRemove,
  onCheckout,
  checkoutDisabled = false,
  checkoutLabel = "Finalizar compra",
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className={styles.heading}>Tu pedido</h3>
      </CardHeader>
      <CardBody className={styles.body}>
        {lines.length === 0 ? (
          <p className={styles.empty}>Aún no has agregado productos.</p>
        ) : (
          <ul className={styles.list}>
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className={styles.line}>
                <div className={styles.info}>
                  <p className={styles.name}>{product.name}</p>
                  <p className={styles.subtotal}>{formatCurrency(product.price * quantity)}</p>
                </div>
                <div className={styles.quantity}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(product.id)}
                    aria-label={`Quitar una unidad: ${product.name}`}
                  >
                    −
                  </Button>
                  <span aria-label={`Cantidad: ${quantity}`}>{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAdd(product.id)}
                    disabled={quantity >= product.stock}
                    aria-label={`Agregar una unidad: ${product.name}`}
                  >
                    +
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.total} aria-live="polite">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </p>

        <Button
          className={styles.checkout}
          disabled={lines.length === 0 || checkoutDisabled}
          onClick={onCheckout}
        >
          {checkoutLabel}
        </Button>
      </CardBody>
    </Card>
  );
}
