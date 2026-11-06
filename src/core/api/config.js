const DEFAULT_API_URL = "https://suma21-backend.onrender.com";
const DEFAULT_AUTH_URL = "https://proyecto-integrador-backend-g2.onrender.com";

const withoutTrailingSlash = (url) => url.replace(/\/+$/, "");

/** Backend de datos (`/api/*`, `/health`), sin barra final. Configurable con `VITE_API_URL`. */
export const API_URL = withoutTrailingSlash(import.meta.env.VITE_API_URL || DEFAULT_API_URL);

/** Servicio de autenticación (`/auth/*`), sin barra final. Configurable con `VITE_AUTH_URL`. */
export const AUTH_URL = withoutTrailingSlash(import.meta.env.VITE_AUTH_URL || DEFAULT_AUTH_URL);

/**
 * Registros que el checkout de Wompi exige para asentar el ingreso: el método
 * de pago y la cuenta destino (deben existir en el backend de datos).
 */
export const WOMPI_PAYMENT_METHOD_ID = String(import.meta.env.VITE_WOMPI_PAYMENT_METHOD_ID || "1");
export const WOMPI_ACCOUNT_ID = String(import.meta.env.VITE_WOMPI_ACCOUNT_ID || "2");
