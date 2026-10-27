import { request } from "../httpClient.js";

/** Endpoints de autenticación (`/auth/*`). */
export const authService = {
  /** @param {{ email: string, clave: string }} credentials */
  login: ({ email, clave }) => request("/auth/login", { method: "POST", body: { email, clave }, auth: false }),

  /**
   * Registro público: el backend solo admite los roles DONANTE y ACUDIENTE.
   * @param {{ username: string, email: string, clave: string, rol: "DONANTE" | "ACUDIENTE" }} data
   */
  register: ({ username, email, clave, rol }) =>
    request("/auth/registro", { method: "POST", body: { username, email, clave, rol }, auth: false }),

  /** Datos del usuario dueño del token actual. */
  profile: () => request("/auth/perfil"),

  /**
   * Alta de usuarios con cualquier rol. Requiere token de ADMIN.
   * @param {{ username: string, email: string, clave: string, roles: string[] }} data
   */
  createUser: ({ username, email, clave, roles }) =>
    request("/auth/usuarios", { method: "POST", body: { username, email, clave, roles } }),
};
