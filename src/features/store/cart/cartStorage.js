/**
 * Persistencia del carrito: el ÚNICO punto que hay que cambiar cuando el
 * backend publique el endpoint de carrito.
 *
 * Hoy el backend no tiene carrito (`/api/v1/cart` responde 404), así que el
 * contenido se guarda solo en este navegador como apoyo temporal, separado
 * por usuario. La interfaz lo indica: no se presenta como guardado en la cuenta.
 *
 * Contrato pedido al backend (ver docs/integracion-backend.md):
 *   GET /api/v1/cart  → { items: [{ product_id, quantity }] }   (usuario del token)
 *   PUT /api/v1/cart  ← { items: [{ product_id, quantity }] }   → mismo cuerpo
 * Con ese endpoint, `load` y `save` pasan a ser asíncronos contra la API y
 * `isPersistedRemotely` vale `true`.
 */

const PREFIX = "suma21.cart.";

/** `false` mientras el backend no tenga endpoint de carrito. */
export const isPersistedRemotely = false;

/**
 * @param {string} ownerId ID del usuario dueño del carrito.
 * @returns {Record<string, number>} `{ [product_id]: cantidad }`
 */
export function loadCart(ownerId) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${ownerId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0),
    );
  } catch {
    return {};
  }
}

/**
 * @param {string} ownerId
 * @param {Record<string, number>} items
 */
export function saveCart(ownerId, items) {
  try {
    if (Object.keys(items).length === 0) localStorage.removeItem(`${PREFIX}${ownerId}`);
    else localStorage.setItem(`${PREFIX}${ownerId}`, JSON.stringify(items));
  } catch {
    // Sin almacenamiento disponible: el carrito dura lo que la pestaña.
  }
}
