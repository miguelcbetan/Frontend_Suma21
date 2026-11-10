import { useCallback, useMemo, useRef, useState } from "react";

import { CartContext } from "./cartContext.js";

const clamp = (quantity, max) => (max == null ? quantity : Math.min(quantity, Math.max(0, max)));
const STORAGE_KEY = "suma21.cart.v1";

function readItems() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return {};
  const parsed = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("El formato del carrito guardado no es válido.");
  }
  for (const [id, quantity] of Object.entries(parsed)) {
    if (!id || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("El formato del carrito guardado no es válido.");
    }
  }
  return parsed;
}

/**
 * El carrito se conserva en este navegador para visitantes y usuarios con sesión.
 * El backend solo recibe las cantidades cuando la persona autenticada inicia el pago.
 * @param {{ children: import("react").ReactNode }} props
 */
export function CartProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      return { status: "ready", error: "", items: readItems() };
    } catch {
      return { status: "error", error: "No pudimos leer el carrito guardado en este navegador.", items: {} };
    }
  });
  const itemsRef = useRef(state.items);

  /** Fija la cantidad de un producto (0 lo quita) y la guarda localmente. */
  const setQuantity = useCallback(
    (id, quantity, max) => {
      const key = String(id);
      const current = itemsRef.current[key] ?? 0;
      const next = clamp(Math.max(0, Math.trunc(quantity) || 0), max);
      if (next === current) return Promise.resolve();

      const items = { ...itemsRef.current };
      if (next > 0) items[key] = next;
      else delete items[key];
      itemsRef.current = items;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        setState({ status: "ready", error: "", items });
      } catch {
        setState({ status: "error", error: "No pudimos guardar el carrito en este navegador.", items });
      }
      return Promise.resolve();
    },
    [],
  );

  const add = useCallback(
    (id, max) => setQuantity(id, (itemsRef.current[String(id)] ?? 0) + 1, max),
    [setQuantity],
  );
  const decrement = useCallback(
    (id) => setQuantity(id, (itemsRef.current[String(id)] ?? 0) - 1),
    [setQuantity],
  );
  const remove = useCallback((id) => setQuantity(id, 0), [setQuantity]);

  const clear = useCallback(() => {
    itemsRef.current = {};
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setState({ status: "ready", error: "", items: {} });
    } catch {
      setState({ status: "error", error: "No pudimos limpiar el carrito guardado en este navegador.", items: {} });
    }
  }, []);

  const retry = useCallback(() => {
    try {
      const items = readItems();
      itemsRef.current = items;
      setState({ status: "ready", error: "", items });
    } catch {
      setState({ status: "error", error: "No pudimos leer el carrito guardado en este navegador.", items: {} });
    }
  }, []);

  const value = useMemo(() => {
    const count = Object.values(state.items).reduce((sum, quantity) => sum + quantity, 0);
    return {
      status: state.status,
      error: state.error,
      items: state.items,
      count,
      add,
      decrement,
      setQuantity,
      remove,
      clear,
      retry,
    };
  }, [state, add, decrement, setQuantity, remove, clear, retry]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
