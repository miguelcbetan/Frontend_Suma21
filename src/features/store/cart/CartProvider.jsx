import { useCallback, useEffect, useMemo, useState } from "react";

import { CartContext } from "./cartContext.js";
import { isPersistedRemotely, loadCart, saveCart } from "./cartStorage.js";

const clamp = (quantity, max) => (max == null ? quantity : Math.min(quantity, Math.max(0, max)));

function withoutEmpty(items) {
  return Object.fromEntries(Object.entries(items).filter(([, quantity]) => quantity > 0));
}

/**
 * Carrito del usuario con sesión (`ownerId`). Sin sesión no hay carrito: el
 * catálogo del backend exige iniciar sesión.
 * @param {{ ownerId: string | null, children: import("react").ReactNode }} props
 */
export function CartProvider({ ownerId, children }) {
  const [state, setState] = useState(() => ({ ownerId, items: ownerId ? loadCart(ownerId) : {} }));

  // Al cambiar de usuario (login, logout) se carga el carrito que le corresponde.
  if (state.ownerId !== ownerId) {
    setState({ ownerId, items: ownerId ? loadCart(ownerId) : {} });
  }

  useEffect(() => {
    if (state.ownerId) saveCart(state.ownerId, state.items);
  }, [state]);

  const update = useCallback((change) => {
    setState((current) => (current.ownerId ? { ...current, items: withoutEmpty(change(current.items)) } : current));
  }, []);

  const add = useCallback(
    (id, max) => update((items) => ({ ...items, [id]: clamp((items[id] ?? 0) + 1, max) })),
    [update],
  );
  const decrement = useCallback(
    (id) => update((items) => ({ ...items, [id]: Math.max(0, (items[id] ?? 0) - 1) })),
    [update],
  );
  const setQuantity = useCallback(
    (id, quantity, max) => update((items) => ({ ...items, [id]: clamp(Math.max(0, Math.trunc(quantity) || 0), max) })),
    [update],
  );
  const remove = useCallback((id) => update((items) => ({ ...items, [id]: 0 })), [update]);
  const clear = useCallback(() => update(() => ({})), [update]);

  /** Ajusta el carrito al catálogo real: quita productos inexistentes y limita al stock. */
  const reconcile = useCallback(
    (products) =>
      update((items) => {
        const stockById = new Map(products.map((product) => [product.id, product.stock]));
        const next = {};
        for (const [id, quantity] of Object.entries(items)) {
          if (stockById.has(id)) next[id] = clamp(quantity, stockById.get(id));
        }
        const same =
          Object.keys(next).length === Object.keys(items).length &&
          Object.entries(next).every(([id, quantity]) => items[id] === quantity);
        return same ? items : next;
      }),
    [update],
  );

  const value = useMemo(() => {
    const count = Object.values(state.items).reduce((sum, quantity) => sum + quantity, 0);
    return {
      items: state.items,
      count,
      enabled: Boolean(state.ownerId),
      persistedRemotely: isPersistedRemotely,
      add,
      decrement,
      setQuantity,
      remove,
      clear,
      reconcile,
    };
  }, [state, add, decrement, setQuantity, remove, clear, reconcile]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
