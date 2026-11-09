import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { describeError, salesService } from "@/core/api";

import { CartContext } from "./cartContext.js";

const clamp = (quantity, max) => (max == null ? quantity : Math.min(quantity, Math.max(0, max)));

/** `{ [productId]: cantidad }` a partir del carrito del servidor (o `null`). */
function itemsOf(cart) {
  return Object.fromEntries((cart?.items ?? []).map((item) => [String(item.productId), Number(item.quantity)]));
}

const EMPTY = { status: "idle", error: "", cart: null, items: {}, pending: 0 };

/**
 * Carrito persistido en el backend: es la venta `DRAFT` del usuario del token
 * (`GET/POST/DELETE /api/v1/sales/cart…`). Sobrevive a recargas, cierres de
 * sesión y cambios de navegador.
 *
 * Los cambios se muestran al instante y se envían en una cola serializada
 * (cada llamada fija la cantidad absoluta, así que el orden importa). Cuando la
 * cola se vacía, el estado del servidor reemplaza al local; si una llamada
 * falla, se recarga el carrito del servidor y se informa el error.
 * @param {{ ownerId: string | null, children: import("react").ReactNode }} props
 */
export function CartProvider({ ownerId, children }) {
  const [state, setState] = useState(() => ({ ...EMPTY, ownerId, status: ownerId ? "loading" : "idle" }));
  const [reloadKey, setReloadKey] = useState(0);
  const itemsRef = useRef({});
  const ownerRef = useRef(ownerId);
  const queueRef = useRef(Promise.resolve());
  const pendingRef = useRef(0);

  // Al cambiar de usuario (login, logout) se descarta el carrito anterior.
  if (state.ownerId !== ownerId) {
    setState({ ...EMPTY, ownerId, status: ownerId ? "loading" : "idle" });
  }

  useEffect(() => {
    ownerRef.current = ownerId;
    itemsRef.current = {};
    pendingRef.current = 0;
    queueRef.current = Promise.resolve();
  }, [ownerId]);

  /** Aplica una respuesta del servidor si sigue siendo el mismo usuario. */
  const applyServer = useCallback((owner, cart, error = "") => {
    if (ownerRef.current !== owner) return;
    if (pendingRef.current === 0) itemsRef.current = itemsOf(cart);
    setState((current) => ({
      ...current,
      status: "ready",
      error,
      cart,
      ...(pendingRef.current === 0 ? { items: itemsOf(cart) } : {}),
      pending: pendingRef.current,
    }));
  }, []);

  // Carga inicial (y «Reintentar») del carrito del usuario.
  useEffect(() => {
    if (!ownerId) return undefined;
    let cancelled = false;
    salesService
      .getCart()
      .then((cart) => {
        if (!cancelled) applyServer(ownerId, cart);
      })
      .catch((error) => {
        if (!cancelled) {
          setState((current) => ({ ...current, status: "error", error: describeError(error).message }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, reloadKey, applyServer]);

  /** Encola una llamada al servidor; devuelve la promesa de toda la cola. */
  const enqueue = useCallback(
    (call) => {
      const owner = ownerRef.current;
      pendingRef.current += 1;
      setState((current) => ({ ...current, pending: pendingRef.current }));
      // Tras un cambio de usuario el contador se reinicia: solo descuenta quien sigue vigente.
      const settle = () => {
        if (ownerRef.current === owner) pendingRef.current = Math.max(0, pendingRef.current - 1);
      };
      queueRef.current = queueRef.current.then(async () => {
        try {
          const cart = await call();
          settle();
          applyServer(owner, cart);
        } catch (error) {
          settle();
          const message = describeError(error).message;
          try {
            applyServer(owner, await salesService.getCart(), message);
          } catch {
            if (ownerRef.current === owner) {
              setState((current) => ({ ...current, error: message, pending: pendingRef.current }));
            }
          }
        }
      });
      return queueRef.current;
    },
    [applyServer],
  );

  /** Fija la cantidad de un producto (0 lo quita) y la sincroniza con el servidor. */
  const setQuantity = useCallback(
    (id, quantity, max) => {
      if (!ownerRef.current) return Promise.resolve();
      const key = String(id);
      const current = itemsRef.current[key] ?? 0;
      const next = clamp(Math.max(0, Math.trunc(quantity) || 0), max);
      if (next === current) return queueRef.current;

      const items = { ...itemsRef.current };
      if (next > 0) items[key] = next;
      else delete items[key];
      itemsRef.current = items;
      setState((state) => ({ ...state, items, error: "" }));

      return enqueue(() => (next > 0 ? salesService.setCartItem(key, next) : salesService.removeCartItem(key)));
    },
    [enqueue],
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

  /** Espera a que se envíen todos los cambios pendientes. */
  const flush = useCallback(() => queueRef.current, []);

  /** Vuelve a leer el carrito del servidor (p. ej. después de un checkout). */
  const refresh = useCallback(() => enqueue(() => salesService.getCart()), [enqueue]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    setReloadKey((key) => key + 1);
  }, []);

  const value = useMemo(() => {
    const count = Object.values(state.items).reduce((sum, quantity) => sum + quantity, 0);
    return {
      status: state.status,
      error: state.error,
      items: state.items,
      serverItems: state.cart?.items ?? [],
      serverTotal: state.cart ? Number(state.cart.totalPrice) : 0,
      syncing: state.pending > 0,
      count,
      enabled: Boolean(state.ownerId),
      add,
      decrement,
      setQuantity,
      remove,
      flush,
      refresh,
      retry,
    };
  }, [state, add, decrement, setQuantity, remove, flush, refresh, retry]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
