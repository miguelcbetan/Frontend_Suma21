import { createContext } from "react";

/**
 * @typedef {{
 *   status: "loading" | "ready" | "error",
 *   error: string,
 *   items: Record<string, number>,
 *   syncing: boolean,
 *   enabled: boolean,
 *   locked: boolean,
 *   lockStatus: "checking" | "ready" | "error",
 *   lockError: string,
 *   refreshPendingStatus: () => Promise<boolean>,
 *   count: number,
 *   add: (id: string, max?: number) => Promise<void>,
 *   decrement: (id: string) => Promise<void>,
 *   setQuantity: (id: string, quantity: number, max?: number) => Promise<void>,
 *   remove: (id: string) => Promise<void>,
 *   flush: () => Promise<void>,
 *   refresh: () => Promise<void>,
 *   retry: () => void,
 * }} CartValue
 */

/** @type {import("react").Context<CartValue | null>} */
export const CartContext = createContext(null);
