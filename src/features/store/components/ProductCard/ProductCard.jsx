import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { formatCurrency } from "@/core/utils/currency";

import styles from "./ProductCard.module.css";

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
    <Card className={styles.card}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} loading="lazy" className={styles.image} />
      ) : (
        <MediaPlaceholder ratio="standard" label="Producto sin imagen" />
      )}
      <CardBody className={styles.body}>
        {soldOut ? <Badge tone="neutral">Agotado</Badge> : null}
        <h3 className={styles.title}>{name}</h3>
        {description ? <p className={styles.description}>{description}</p> : null}
        <p className={styles.price}>{formatCurrency(price)}</p>
        {!soldOut ? <p className={styles.stock}>Disponibles: {stock}</p> : null}
        <div className={styles.action}>
          <Button
            onClick={() => onAdd(id)}
            disabled={soldOut || limitReached}
            aria-label={`Agregar al carrito: ${name}`}
          >
            Agregar al carrito
          </Button>
          {quantity > 0 ? <Badge tone="green">En tu pedido: {quantity}</Badge> : null}
        </div>
      </CardBody>
    </Card>
  );
}
