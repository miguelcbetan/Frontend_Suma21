import { ApiError } from "./ApiError.js";
import { API_URL, AUTH_URL } from "./config.js";
import { getToken } from "./tokenStorage.js";

/** Servicios del backend: datos (`api`) y autenticación (`auth`). */
const BASES = { api: API_URL, auth: AUTH_URL };

const STATUS_MESSAGES = {
  401: "Tu sesión no es válida o expiró. Inicia sesión de nuevo.",
  403: "No tienes permisos para realizar esta acción.",
  404: "No se encontró el recurso solicitado.",
  429: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
};

let unauthorizedHandler = null;

/**
 * Registra qué hacer cuando una petición autenticada recibe 401
 * (normalmente, cerrar la sesión local).
 * @param {(() => void) | null} handler
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Llamada JSON al backend. `base` elige el servicio: `api` (datos, por defecto)
 * o `auth` (autenticación). Solo `auth` recibe el token como `Bearer` (salvo
 * `auth: false`); la API de datos no lo usa. Lanza `ApiError` ante cualquier
 * respuesta no exitosa.
 * @param {string} path Ruta con barra inicial, p. ej. `/api/products`.
 * @param {{
 *   method?: string, body?: unknown, auth?: boolean, base?: "api" | "auth", signal?: AbortSignal,
 * }} [options]
 * @returns {Promise<any>}
 */
export async function request(path, { method = "GET", body, auth = true, base = "api", signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth && base === "auth" ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASES[base]}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiError(
      "No se pudo conectar con el servidor. Si acaba de despertar, espera unos segundos e inténtalo otra vez.",
    );
  }

  const data = await readBody(response);

  if (!response.ok) {
    if (response.status === 401 && token && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(
      data?.error || STATUS_MESSAGES[response.status] || `Error del servidor (${response.status}).`,
      { status: response.status, code: data?.code, details: data?.detalles ?? [] },
    );
  }

  return data;
}
