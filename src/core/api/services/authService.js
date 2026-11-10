import { request } from "../httpClient.js";

const AUTH = { base: "auth" };

/** Endpoints del servicio de autenticación (`/auth/*`). */
export const authService = {
  /** @param {{ email: string, clave: string }} credentials */
  login: ({ email, clave }) =>
    request("/auth/login", { ...AUTH, method: "POST", body: { email, clave }, auth: false }),

  /** Datos del usuario dueño del token actual. */
  profile: () => request("/auth/perfil", AUTH),

  /** Invalida el token actual en el servidor. */
  logout: () => request("/auth/logout", { ...AUTH, method: "POST" }),

};
