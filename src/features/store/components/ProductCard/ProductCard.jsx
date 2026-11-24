import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/core/utils/currency";
import { cx } from "@/core/utils/cx";

import styles from "./ProductCard.module.css";

const LOW_STOCK = 5;

/**
 * Tarjeta de un producto de la tienda. Cuando el producto ya está en el
 * carrito permite sumar, restar o sacarlo directamente sin abrir el cajón.
 * @param {{
 *   product: {
 *     id: string, name: string, description: string, price: number, stock: number,
 *     imageUrl: string | null,
 *   },
 *   quantity: number,
 *   onAdd: (id: string) => void,
 *   onDecrement?: (id: string) => void,
 *   onRemove?: (id: string) => void,
 *   disabled?: boolean,
 *   disabledLabel?: string,
 * }} props
 */
export function ProductCard({
  product,
  quantity,
  onAdd,
  onDecrement,
  onRemove,
  disabled = false,
  disabledLabel,
}) {
  const { id, name, description, price, stock, imageUrl } = product;
  const soldOut = stock <= 0;
  const limitReached = quantity >= stock;
  const showCartControls = quantity > 0 && !disabledLabel;

  return (
    <article className={cx(styles.card, showCartControls && styles.inCartCard)}>
      <div className={styles.media}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" className={styles.image} />
        ) : (
          <div className={styles.placeholder} role="img" aria-label="Producto sin imagen">
            <Icon name="bag" size={36} />
          </div>
        )}
        {soldOut ? (
          <Badge tone="neutral" className={styles.flag}>
            Agotado
          </Badge>
        ) : stock <= LOW_STOCK ? (
          <Badge tone="orange" className={styles.flag}>
            Últimas {stock} unidades
          </Badge>
        ) : null}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{name}</h3>
        {description ? <p className={styles.description}>{description}</p> : null}
        <div className={styles.meta}>
          <p className={styles.price}>{formatCurrency(price)}</p>
          {!soldOut ? <p className={styles.stock}>{stock} disponibles</p> : null}
        </div>
        <div className={styles.action}>
          {showCartControls ? (
            <>
              <div className={styles.cartRow}>
                <div className={styles.stepper} role="group" aria-label={`Cantidad en carrito de ${name}`}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    disabled={disabled}
                    aria-label={quantity === 1 ? `Sacar ${name} del carrito` : `Disminuir cantidad de ${name}`}
                    onClick={() => onDecrement?.(id)}
                  >
                    −
                  </button>
                  <span className={styles.stepCount} aria-live="polite">
                    {quantity} en carrito
                  </span>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    disabled={disabled || limitReached}
                    aria-label={`Aumentar cantidad de ${name}`}
                    title={limitReached ? "Máximo disponible alcanzado" : "Agregar una unidad"}
                    onClick={() => onAdd(id)}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={disabled}
                  aria-label={`Quitar ${name} del carrito`}
                  title="Sacar del carrito"
                  onClick={() => onRemove?.(id)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
              {limitReached ? <p className={styles.limitNote}>Máximo disponible ({stock}) en tu carrito</p> : null}
            </>
          ) : (
            <Button
              block
              variant="primary"
              onClick={() => onAdd(id)}
              disabled={disabled || soldOut}
              aria-label={`Agregar al carrito: ${name}`}
            >
              <Icon name={disabledLabel ? "lock" : "cart"} size={18} />
              {disabledLabel ? disabledLabel : soldOut ? "Sin unidades" : "Agregar al carrito"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
