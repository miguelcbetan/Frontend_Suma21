import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/core/utils/currency";

import styles from "./ProductCard.module.css";

const LOW_STOCK = 5;

/**
 * Tarjeta de un producto de la tienda.
 * @param {{
 *   product: {
 *     id: string, name: string, description: string, price: number, stock: number,
 *     imageUrl: string | null,
 *   },
 *   quantity: number,
 *   onAdd: (id: string) => void,
 * }} props
 */
export function ProductCard({ product, quantity, onAdd }) {
  const { id, name, description, price, stock, imageUrl } = product;
  const soldOut = stock <= 0;
  const limitReached = quantity >= stock;

  return (
    <article className={styles.card}>
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
          <Button
            block
            variant={quantity > 0 ? "secondary" : "primary"}
            onClick={() => onAdd(id)}
            disabled={soldOut || limitReached}
            aria-label={`Agregar al carrito: ${name}`}
          >
            <Icon name={quantity > 0 ? "plus" : "cart"} size={18} />
            {soldOut ? "Sin unidades" : limitReached ? "Máximo disponible" : quantity > 0 ? "Agregar otra" : "Agregar al carrito"}
          </Button>
          {quantity > 0 ? (
            <p className={styles.inCart}>
              <Icon name="check" size={16} />
              En tu carrito: {quantity}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
