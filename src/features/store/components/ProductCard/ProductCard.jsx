import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { formatCurrency } from "@/core/utils/currency";

import styles from "./ProductCard.module.css";

/**
 * Tarjeta de un producto de la tienda.
 * @param {{
 *   product: { id: string, name: string, description: string, price: number, stock: number },
 *   quantity: number,
 *   onAdd: (id: string) => void,
 * }} props
 */
export function ProductCard({ product, quantity, onAdd }) {
  const { id, name, description, price, stock } = product;
  const soldOut = stock <= 0;
  const limitReached = quantity >= stock;

  return (
    <Card className={styles.card}>
      <MediaPlaceholder ratio="standard" label="[Imagen del producto]" />
      <CardBody className={styles.body}>
        {soldOut ? <Badge tone="neutral">Agotado</Badge> : null}
        <h3 className={styles.title}>{name}</h3>
        {description ? <p className={styles.description}>{description}</p> : null}
        <p className={styles.price}>{formatCurrency(price)}</p>
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
