import { useContext } from "react";

import { CartContext } from "./cartContext.js";

/** @returns {import("./cartContext.js").CartValue} */
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart debe usarse dentro de <CartProvider>.");
  return value;
}
