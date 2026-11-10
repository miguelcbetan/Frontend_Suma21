import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { describeError, salesService } from "@/core/api";

import { CartContext } from "./cartContext.js";

const STORAGE_KEY = "suma21.cart.v1";
const clamp = (quantity, max) => (max == null ? quantity : Math.min(quantity, Math.max(0, max)));

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

function itemsOf(cart) {
  return Object.fromEntries((cart?.items ?? []).map((item) => [String(item.productId), Number(item.quantity)]));
}

function guestState() {
  try {
    return { status: "ready", error: "", items: readItems(), cart: null, pending: 0 };
  } catch {
    return {
      status: "error",
      error: "No pudimos leer el carrito guardado en este navegador.",
      items: {},
      cart: null,
      pending: 0,
    };
  }
}

/**
 * Guarda el carrito del visitante en localStorage y el de la persona autenticada
 * en el backend. Al iniciar sesión, incorpora los productos locales al carrito
 * de la cuenta antes de dejar de usar el almacenamiento local.
 * @param {{ ownerId: string | null, children: import("react").ReactNode }} props
 */
export function CartProvider({ ownerId, children }) {
  const [state, setState] = useState(() =>
    ownerId
      ? { status: "loading", error: "", items: {}, cart: null, pending: 0 }
      : guestState(),
  );
  const [reloadKey, setReloadKey] = useState(0);
  const itemsRef = useRef(state.items);
  const queueRef = useRef(Promise.resolve());
  const pendingRef = useRef(0);
  const errorRef = useRef("");

  useEffect(() => {
    if (!ownerId) return undefined;
    let cancelled = false;

    async function loadCart() {
      let guestItems = {};
      let migrationError = "";
      let guestItemsLoaded = true;
      try {
        guestItems = readItems();
      } catch (error) {
        guestItemsLoaded = false;
        migrationError = describeError(error).message;
      }

      try {
        let cart = await salesService.getCart();
        const accountItems = itemsOf(cart);

        for (const [productId, quantity] of Object.entries(guestItems)) {
          if (quantity > (accountItems[productId] ?? 0)) {
            cart = await salesService.setCartItem(productId, quantity);
          }
        }

        if (guestItemsLoaded) {
          try {
            window.localStorage.removeItem(STORAGE_KEY);
          } catch (error) {
            migrationError = describeError(error).message;
          }
        }
        if (cancelled) return;
        const items = itemsOf(cart);
        itemsRef.current = items;
        errorRef.current = "";
        setState({ status: "ready", error: migrationError, items, cart, pending: 0 });
      } catch (error) {
        if (cancelled) return;
        const message = describeError(error).message;
        errorRef.current = message;
        setState((current) => ({ ...current, status: "error", error: message }));
      }
    }

    loadCart();
    return () => {
      cancelled = true;
    };
  }, [ownerId, reloadKey]);

  const enqueue = useCallback(
    (call) => {
      pendingRef.current += 1;
      setState((current) => ({ ...current, pending: pendingRef.current }));

      queueRef.current = queueRef.current.then(async () => {
        if (errorRef.current) {
          pendingRef.current = Math.max(0, pendingRef.current - 1);
          setState((current) => ({ ...current, pending: pendingRef.current }));
          return;
        }
        try {
          const cart = await call();
          pendingRef.current = Math.max(0, pendingRef.current - 1);
          errorRef.current = "";
          if (pendingRef.current === 0) {
            const items = itemsOf(cart);
            itemsRef.current = items;
            setState({ status: "ready", error: "", items, cart, pending: 0 });
          } else {
            setState((current) => ({ ...current, cart, pending: pendingRef.current }));
          }
        } catch (error) {
          pendingRef.current = Math.max(0, pendingRef.current - 1);
          const message = describeError(error).message;
          errorRef.current = message;
          setState((current) => ({
            ...current,
            status: "error",
            error: message,
            pending: pendingRef.current,
          }));
        }
      });

      return queueRef.current;
    },
    [],
  );

  const setQuantity = useCallback(
    (id, quantity, max) => {
      if (state.status !== "ready") return Promise.resolve();
      const key = String(id);
      const current = itemsRef.current[key] ?? 0;
      const next = clamp(Math.max(0, Math.trunc(quantity) || 0), max);
      if (next === current) return queueRef.current;

      const items = { ...itemsRef.current };
      if (next > 0) items[key] = next;
      else delete items[key];
      itemsRef.current = items;
      setState((currentState) => ({ ...currentState, items, error: "" }));
      errorRef.current = "";

      if (ownerId) {
        return enqueue(() =>
          next > 0 ? salesService.setCartItem(key, next) : salesService.removeCartItem(key),
        );
      }

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return Promise.resolve();
      } catch {
        const message = "No pudimos guardar el carrito en este navegador.";
        errorRef.current = message;
        setState((currentState) => ({ ...currentState, status: "error", error: message }));
        return Promise.resolve();
      }
    },
    [enqueue, ownerId, state.status],
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

  const flush = useCallback(async () => {
    await queueRef.current;
    if (errorRef.current) throw new Error(errorRef.current);
  }, []);

  const refresh = useCallback(() => {
    if (!ownerId) return Promise.resolve();
    return enqueue(() => salesService.getCart());
  }, [enqueue, ownerId]);

  const retry = useCallback(() => {
    errorRef.current = "";
    if (!ownerId) {
      try {
        const items = readItems();
        itemsRef.current = items;
        setState({ status: "ready", error: "", items, cart: null, pending: 0 });
      } catch {
        const message = "No pudimos leer el carrito guardado en este navegador.";
        errorRef.current = message;
        setState((current) => ({ ...current, status: "error", error: message }));
      }
      return;
    }
    setState((current) => ({ ...current, status: "loading", error: "" }));
    setReloadKey((key) => key + 1);
  }, [ownerId]);

  const value = useMemo(() => {
    const count = Object.values(state.items).reduce((sum, quantity) => sum + quantity, 0);
    return {
      status: state.status,
      error: state.error,
      items: state.items,
      syncing: state.pending > 0,
      enabled: Boolean(ownerId),
      count,
      add,
      decrement,
      setQuantity,
      remove,
      flush,
      refresh,
      retry,
    };
  }, [state, ownerId, add, decrement, setQuantity, remove, flush, refresh, retry]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
