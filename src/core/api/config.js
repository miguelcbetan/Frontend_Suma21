const DEFAULT_API_URL = "https://proyecto-integrador-backend-g2.onrender.com";

/** URL base del backend, sin barra final. Configurable con `VITE_API_URL`. */
export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
