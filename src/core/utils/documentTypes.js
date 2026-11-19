/**
 * Tipos de documento de identidad que se registran en `donors`
 * (`POST /auth/complete-document` y `POST /donations/inkind`).
 */
export const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "PPT", label: "Permiso por protección temporal" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "NIT", label: "NIT (empresas)" },
];

/** Ayuda para el campo del número de documento. */
export const DOCUMENT_NUMBER_HINT = "Si es NIT, inclúyelo con el dígito de verificación (p. ej. 900111222-3).";
