const PREFIX = "suma21.payment.";
const LAST_KEY = `${PREFIX}last`;

/**
 * Lo que el backend no devuelve al consultar un pago (los datos del donante
 * para el certificado y el resumen de lo comprado). Se guarda en este
 * navegador al crear el checkout, antes de abrir Wompi, para reconstruir el
 * recibo al volver. No es la fuente del estado del pago: ese siempre se
 * consulta al backend.
 * @typedef {{
 *   reference: string,
 *   kind: "donation" | "sale",
 *   personId?: string,
 *   donorName?: string,
 *   donorDocument?: string,
 *   summary?: string,
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

/**
 * Pagos iniciados en este navegador, del más reciente al más antiguo.
 * Con `personId` se filtran los del usuario indicado.
 * @param {string | null} [personId]
 * @returns {PaymentSession[]}
 */
export function listPaymentSessions(personId) {
  try {
    const sessions = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(PREFIX) || key === LAST_KEY) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key) ?? "null");
        if (value?.reference) sessions.push(value);
      } catch {
        // Entrada corrupta: se ignora.
      }
    }
    return sessions
      .filter((session) => !personId || !session.personId || session.personId === personId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  } catch {
    return [];
  }
}

/**
 * Tipo de operación a partir de la referencia que genera el backend.
 * @param {string | null | undefined} reference
 * @returns {"sale" | "donation" | null}
 */
export function paymentKindOf(reference) {
  if (!reference) return null;
  if (reference.startsWith("SALE-")) return "sale";
  if (reference.startsWith("DON-")) return "donation";
  return null;
}
