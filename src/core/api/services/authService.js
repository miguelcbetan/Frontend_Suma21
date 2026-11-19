import { request } from "../httpClient.js";

const AUTH = { base: "auth" };

/** Endpoints del servicio de autenticación (`/auth/*`). */
export const authService = {
  /**
   * Login puente del backend de datos (`POST /api/v1/auth/login`): autentica
   * contra el servicio de auth, vincula al donante por correo si ya existía y
   * devuelve el mismo token junto con `requiresDocumentCompletion`.
   * @param {{ email: string, clave: string }} credentials
   * @returns {Promise<{
   *   token: string, expiraEn: string, requiresDocumentCompletion: boolean,
   *   usuario: { usuarioId: string, username: string, email: string, roles: string[] },
   * }>}
   */
  login: ({ email, clave }) => request("/auth/login", { method: "POST", body: { email, clave }, auth: false }),

  /**
   * Registra por única vez el documento del usuario del token y lo vincula a su
   * perfil de donante (`POST /api/v1/auth/complete-document`). 409
   * `DONOR_DOCUMENT_CONFLICT` si el documento ya existe; 409
   * `DONOR_PROFILE_ALREADY_LINKED` si la cuenta ya tenía perfil.
   * @param {{ full_name: string, document_type: string, document_number: string }} data
   */
  completeDocument: ({ full_name, document_type, document_number }) =>
    request("/auth/complete-document", { method: "POST", body: { full_name, document_type, document_number } }),

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
