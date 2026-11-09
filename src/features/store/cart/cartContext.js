import { createContext } from "react";

/**
 * @typedef {{
 *   items: Record<string, number>,
 *   count: number,
 *   enabled: boolean,
 *   persistedRemotely: boolean,
 *   add: (id: string, max?: number) => void,
 *   decrement: (id: string) => void,
 *   setQuantity: (id: string, quantity: number, max?: number) => void,
 *   remove: (id: string) => void,
 *   clear: () => void,
 *   reconcile: (products: { id: string, stock: number }[]) => void,
 * }} CartValue
 */

/** @type {import("react").Context<CartValue | null>} */
export const CartContext = createContext(null);
