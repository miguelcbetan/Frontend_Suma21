import { createContext } from "react";

/**
 * @typedef {{
 *   id: string | null, username: string, email: string, roles: string[],
 *   requiresDocumentCompletion: boolean,
 * }} AuthUser
 * @typedef {{
 *   status: "loading" | "authenticated" | "anonymous",
 *   user: AuthUser | null,
 *   login: (credentials: { email: string, clave: string }) => Promise<AuthUser>,
 *   register: (data: { username: string, email: string, clave: string }) => Promise<AuthUser>,
 *   logout: () => void,
 *   completeDocument: (data: { fullName: string, documentType: string, documentNumber: string }) => Promise<void>,
 * }} AuthValue
 */

/** @type {import("react").Context<AuthValue | null>} */
export const AuthContext = createContext(null);
