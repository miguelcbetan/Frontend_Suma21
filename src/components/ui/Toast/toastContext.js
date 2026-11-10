import { createContext } from "react";

/**
 * @typedef {{ tone?: "success" | "info", duration?: number }} ToastOptions
 * @typedef {{
 *   show: (text: string, options?: ToastOptions) => void,
 *   success: (text: string) => void,
 *   info: (text: string) => void,
 * }} ToastValue
 */

/** @type {import("react").Context<ToastValue | null>} */
export const ToastContext = createContext(null);
