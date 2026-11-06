import { request } from "../httpClient.js";

const AUTH = { base: "auth" };

/** Endpoints del servicio de autenticación (`/auth/*`). */
export const authService = {
  /** @param {{ email: string, clave: string }} credentials */
  login: ({ email, clave }) =>
    request("/auth/login", { ...AUTH, method: "POST", body: { email, clave }, auth: false }),

  /**
   * Registro público: el servicio solo admite los roles DONANTE y ACUDIENTE.
   * @param {{ username: string, email: string, clave: string, rol: "DONANTE" | "ACUDIENTE" }} data
   */
  register: ({ username, email, clave, rol }) =>
    request("/auth/registro", { ...AUTH, method: "POST", body: { username, email, clave, rol }, auth: false }),

  /** Datos del usuario dueño del token actual. */
  profile: () => request("/auth/perfil", AUTH),

  /** Invalida el token actual en el servidor. */
  logout: () => request("/auth/logout", { ...AUTH, method: "POST" }),

  /**
   * Alta de usuarios con uno o varios roles. Requiere token de ADMIN.
   * @param {{ username: string, email: string, clave: string, roles: string[] }} data
   */
  createUser: ({ username, email, clave, roles }) =>
    request("/auth/usuarios", { ...AUTH, method: "POST", body: { username, email, clave, roles } }),
};
