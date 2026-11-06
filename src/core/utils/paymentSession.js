const PREFIX = "suma21.payment.";
const LAST_KEY = `${PREFIX}last`;

/**
 * Lo que el backend no devuelve al consultar un pago (quién donó, si era
 * mensual). Se guarda en este navegador al crear el checkout, antes de salir
 * hacia Wompi, para reconstruir el recibo al volver.
 * @typedef {{
 *   reference: string,
 *   kind: "donation" | "sale",
 *   personId: string,
 *   frequency?: "monthly" | "once",
 *   createdAt: string,
 * }} PaymentSession
 */

/** @param {Omit<PaymentSession, "createdAt">} session */
export function savePaymentSession(session) {
  try {
    const value = { ...session, createdAt: new Date().toISOString() };
    localStorage.setItem(`${PREFIX}${session.reference}`, JSON.stringify(value));
    localStorage.setItem(LAST_KEY, session.reference);
  } catch {
    // Almacenamiento no disponible: el recibo se mostrará sin esos datos.
  }
}

/** @returns {string | null} Referencia del último pago iniciado en este navegador. */
export function lastPaymentReference() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

/**
 * @param {string} reference
 * @returns {PaymentSession | null}
 */
export function loadPaymentSession(reference) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${reference}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
