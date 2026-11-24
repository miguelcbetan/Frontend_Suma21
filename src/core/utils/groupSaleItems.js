/**
 * Agrupa líneas repetidas de una venta sumando sus cantidades por producto.
 * @template {{ productId?: string | number | null, name?: string | null, quantity?: number | null }} T
 * @param {T[] | null | undefined} items
 * @returns {(T & { quantity: number })[]}
 */
export function groupSaleItems(items) {
  const byKey = new Map();
  for (const item of items ?? []) {
    const key = String(item.productId ?? item.name ?? byKey.size);
    const prev = byKey.get(key);
    const qty = Number(item.quantity ?? 0);
    if (prev) {
      prev.quantity += qty;
    } else {
      byKey.set(key, { ...item, quantity: qty });
    }
  }
  return Array.from(byKey.values());
}
