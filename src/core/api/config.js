const DEFAULT_API_ORIGIN = "https://suma21-backend.onrender.com";
const DEFAULT_API_PREFIX = "/api/v1";
const DEFAULT_AUTH_URL = "https://proyecto-integrador-backend-g2.onrender.com";

const withoutTrailingSlash = (url) => url.replace(/\/+$/, "");
const withLeadingSlash = (path) => (path.startsWith("/") ? path : `/${path}`);

/**
 * Origen del backend de datos, sin barra final (`/health` vive aquí, fuera del
 * prefijo de versión). Configurable con `VITE_API_URL`.
 */
export const API_ORIGIN = withoutTrailingSlash(import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN);

/** Prefijo de versión de la API REST. Configurable con `VITE_API_PREFIX`. */
export const API_PREFIX = withoutTrailingSlash(withLeadingSlash(import.meta.env.VITE_API_PREFIX || DEFAULT_API_PREFIX));

/** Base de todos los recursos REST (`/products`, `/sales`…): origen + prefijo. */
export const API_URL = `${API_ORIGIN}${API_PREFIX}`;

/** Servicio de autenticación (`/auth/*`), sin barra final. Configurable con `VITE_AUTH_URL`. */
export const AUTH_URL = withoutTrailingSlash(import.meta.env.VITE_AUTH_URL || DEFAULT_AUTH_URL);
