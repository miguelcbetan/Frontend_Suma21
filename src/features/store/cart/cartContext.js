import { createContext } from "react";

/**
 * @typedef {{
 *   status: "ready" | "error",
 *   error: string,
 *   items: Record<string, number>,
 *   count: number,
 *   add: (id: string, max?: number) => Promise<void>,
 *   decrement: (id: string) => Promise<void>,
 *   setQuantity: (id: string, quantity: number, max?: number) => Promise<void>,
 *   remove: (id: string) => Promise<void>,
 *   clear: () => void,
 *   retry: () => void,
 * }} CartValue
 */

/** @type {import("react").Context<CartValue | null>} */
export const CartContext = createContext(null);
