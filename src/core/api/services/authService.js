import { request } from "../httpClient.js";

const AUTH = { base: "auth" };

/** Endpoints del servicio de autenticación (`/auth/*`). */
export const authService = {
  /** @param {{ email: string, clave: string }} credentials */
  login: ({ email, clave }) =>
    request("/auth/login", { ...AUTH, method: "POST", body: { email, clave }, auth: false }),

  /**
   * Registro público de clientes con rol DONANTE (`POST /auth/registro`).
   * @param {{ username: string, email: string, clave: string }} data
   */
  register: ({ username, email, clave }) =>
    request("/auth/registro", {
      ...AUTH,
      method: "POST",
      body: { username, email, clave, rol: "DONANTE" },
      auth: false,
    }),

  /** Datos del usuario dueño del token actual. */
  profile: () => request("/auth/perfil", AUTH),

  /** Invalida el token actual en el servidor. */
  logout: () => request("/auth/logout", { ...AUTH, method: "POST" }),

};
