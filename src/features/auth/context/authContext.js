import { createContext } from "react";

/**
 * @typedef {{ id: string | null, username: string, email: string, roles: string[] }} AuthUser
 * @typedef {{
 *   status: "loading" | "authenticated" | "anonymous",
 *   user: AuthUser | null,
 *   login: (credentials: { email: string, clave: string }) => Promise<AuthUser>,
 *   logout: () => void,
 * }} AuthValue
 */

/** @type {import("react").Context<AuthValue | null>} */
export const AuthContext = createContext(null);
