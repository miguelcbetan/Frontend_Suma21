import { ApiError } from "./ApiError.js";
import { API_ORIGIN, API_URL, AUTH_URL } from "./config.js";
import { getToken } from "./tokenStorage.js";

/**
 * Servicios del backend: datos versionados (`api`, `/api/v1`), raíz del backend
 * de datos (`root`, solo `/health`) y autenticación (`auth`).
 */
const BASES = { api: API_URL, root: API_ORIGIN, auth: AUTH_URL };

const STATUS_MESSAGES = {
  401: "Tu sesión no es válida o expiró. Inicia sesión de nuevo.",
  403: "No tienes permisos para realizar esta acción.",
  404: "No se encontró el recurso solicitado.",
  409: "La operación entra en conflicto con el estado actual del registro.",
  429: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
};

let unauthorizedHandler = null;

/**
 * Registra qué hacer cuando el servicio de autenticación rechaza el token
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
 * Llamada JSON al backend. `base` elige el servicio (`api` por defecto, `root`
 * o `auth`). Con `auth: true` (por defecto) se adjunta el token `Bearer` si hay
 * sesión: el backend de datos lo valida contra el servicio de autenticación.
 * Lanza `ApiError` ante cualquier respuesta no exitosa.
 *
 * Solo un 401 del servicio de autenticación cierra la sesión: el backend de
 * datos puede responder 401 transitorio si el servicio de seguridad está
 * despertando en Render, y eso no debe expulsar al usuario.
 * @param {string} path Ruta con barra inicial, p. ej. `/products`.
 * @param {{
 *   method?: string, body?: unknown, auth?: boolean, base?: "api" | "root" | "auth",
 *   query?: Record<string, string | number | undefined | null>, signal?: AbortSignal,
 * }} [options]
 * @returns {Promise<any>}
 */
export async function request(path, { method = "GET", body, auth = true, base = "api", query, signal } = {}) {
  const headers = { Accept: "application/json" };
  // `FormData` (subida de archivos) lleva su propio Content-Type con el boundary.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const search = query
    ? new URLSearchParams(
        Object.entries(query)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => [key, String(value)]),
      ).toString()
    : "";

  let response;
  try {
    response = await fetch(`${BASES[base]}${path}${search ? `?${search}` : ""}`, {
      method,
      headers,
      body: body === undefined || isForm ? body : JSON.stringify(body),
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
    if (response.status === 401 && token && base === "auth" && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(
      data?.error || STATUS_MESSAGES[response.status] || `Error del servidor (${response.status}).`,
      { status: response.status, code: data?.code, details: data?.detalles ?? [] },
    );
  }

  return data;
}
