import { request } from "../httpClient.js";

const segment = (id) => encodeURIComponent(String(id));

/**
 * El backend devuelve la clave primaria como `<recurso>_id` (p. ej.
 * `product_id`). Aquí se les añade `id` para que el resto del frontend trabaje
 * con un único nombre.
 * @param {string} idKey
 */
function withId(idKey) {
  const addId = (record) =>
    record && typeof record === "object" && idKey in record ? { id: record[idKey], ...record } : record;
  return (payload) => (Array.isArray(payload) ? payload.map(addId) : addId(payload));
}

const isFile = (value) => typeof File !== "undefined" && value instanceof File;

/**
 * Los productos aceptan JSON, o `multipart/form-data` cuando se envía la
 * imagen en el campo `image` (ver `core/utils/imageFile.js`).
 */
function productBody(data) {
  if (!Object.values(data).some(isFile)) return data;
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) form.append(key, isFile(value) ? value : String(value));
  }
  return form;
}

const normalizeProduct = withId("product_id");

/**
 * `/api/v1/products`. Listar y consultar exige sesión (cualquier rol); crear,
 * editar y eliminar exigen ADMIN.
 * Cuerpo: `name`, `description?`, `unit_price`, `stock_qty` (entero ≥ 1), `image?` (archivo).
 */
export const productsService = {
  list: () => request("/products").then(normalizeProduct),
  get: (id) => request(`/products/${segment(id)}`).then(normalizeProduct),
  create: (data) => request("/products", { method: "POST", body: productBody(data) }).then(normalizeProduct),
  update: (id, data) =>
    request(`/products/${segment(id)}`, { method: "PATCH", body: productBody(data) }).then(normalizeProduct),
  /** Borrado lógico. */
  remove: (id) => request(`/products/${segment(id)}`, { method: "DELETE" }).then(normalizeProduct),

  /**
   * Suma unidades al stock de un producto existente sin crear otro registro.
   * El backend no tiene un ajuste atómico para productos (sí para inventario):
   * se lee el stock vigente justo antes y se escribe `stock_qty` con el total.
   * @param {string} id
   * @param {number} quantity Entero positivo.
   */
  increaseStock: async (id, quantity) => {
    const current = await productsService.get(id);
    return productsService.update(id, { stock_qty: Number(current.stock_qty) + quantity });
  },
};

const normalizeInventory = withId("inventory_item_id");

/**
 * `/api/v1/inventory`. Todo exige ADMIN salvo `listNeeded`, que es público.
 * Alta: `name`, `description?`, `stock` (entero ≥ 1), `is_needed` (booleano).
 * Edición: `name?`, `description?`, `is_needed?` (el stock se cambia con `adjustStock`).
 */
export const inventoryService = {
  list: () => request("/inventory").then(normalizeInventory),
  /** Artículos que la fundación necesita recibir (`is_needed: true`). Público. */
  listNeeded: () => request("/inventory/needed", { auth: false }).then(normalizeInventory),
  create: (data) => request("/inventory", { method: "POST", body: data }).then(normalizeInventory),
  update: (id, data) => request(`/inventory/${segment(id)}`, { method: "PATCH", body: data }).then(normalizeInventory),
  /** Desactiva el artículo; el backend responde 409 si aún tiene stock. */
  remove: (id) => request(`/inventory/${segment(id)}`, { method: "DELETE" }).then(normalizeInventory),
  /**
   * Ajuste atómico del stock.
   * @param {string} id
   * @param {{ operation: "increase" | "decrease", quantity: number }} adjustment
   */
  adjustStock: (id, adjustment) =>
    request(`/inventory/${segment(id)}/stock`, { method: "PATCH", body: adjustment }).then(normalizeInventory),
};

/**
 * Checkout que devuelven ventas y donaciones monetarias para abrir Wompi.
 * @typedef {{
 *   reference: string, amountInCents: number, currency: string, customerEmail: string,
 *   publicKey: string, integritySignature: string, paymentUrl: string,
 * }} WompiCheckout
 */

/**
 * Venta tal como la devuelve el backend. El carrito es la venta en estado
 * `DRAFT` del usuario del token.
 * @typedef {{
 *   id: string, customerId: string, totalPrice: number, createdAt: string,
 *   status: "DRAFT" | "PENDING" | "APPROVED" | "DECLINED",
 *   items: { productId: string, quantity: number, unitPrice: number, subtotal: number }[],
 * }} Sale
 */

export const salesService = {
  /**
   * Carrito (`DRAFT`) del usuario del token, o `null` si aún no tiene. No toca el stock.
   * @returns {Promise<Sale | null>}
   */
  getCart: () => request("/sales/cart"),

  /**
   * Agrega un producto al carrito o **reemplaza** su cantidad (valor absoluto).
   * Crea el carrito si no existe. No valida ni reserva stock.
   * @param {string} productId
   * @param {number} quantity Entero positivo.
   * @returns {Promise<Sale>}
   */
  setCartItem: (productId, quantity) =>
    request("/sales/cart/items", { method: "POST", body: { productId: String(productId), quantity } }),

  /**
   * Quita un producto del carrito (404 si no estaba).
   * @param {string} productId
   * @returns {Promise<Sale | null>}
   */
  removeCartItem: (productId) => request(`/sales/cart/items/${segment(productId)}`, { method: "DELETE" }),

  /**
   * Finaliza el carrito: valida y reserva stock, pasa la venta de `DRAFT` a
   * `PENDING` y devuelve el checkout de Wompi. Si falla, el backend repone el
   * stock y la venta vuelve a `DRAFT`.
   * @returns {Promise<{ sale: Sale, checkout: WompiCheckout }>}
   */
  checkout: () => request("/sales/checkout", { method: "POST" }),

  /** Todas las ventas con su estado (`DRAFT`, `PENDING`, `APPROVED`, `DECLINED`). */
  list: () => request("/sales"),
};

export const donationsService = {
  /**
   * Donación monetaria del usuario del token; devuelve el checkout de Wompi.
   * @param {{ amount: number }} donation Pesos COP, máximo dos decimales.
   * @returns {Promise<{ donationId: string, checkout: WompiCheckout }>}
   */
  createMonetary: ({ amount }) => request("/donations/monetary", { method: "POST", body: { amount } }),

  /**
   * Donación en especie del usuario del token sobre artículos de inventario existentes.
   * @param {{
   *   donation_date: string, notes?: string,
   *   items: { inventory_item_id: string, quantity: number, estimated_unit_value?: number }[],
   * }} donation
   * @returns {Promise<{ donationId: string }>}
   */
  createInKind: (donation) => request("/donations/inkind", { method: "POST", body: donation }),
};

/**
 * Reportes de ingresos aprobados, paginados.
 * Filtros: `from` y `to` (`YYYY-MM-DD`), `page` y `limit` (máx. 100).
 * @typedef {{ from?: string, to?: string, page?: number, limit?: number }} ReportQuery
 * @typedef {{ data: any[], pagination: { page: number, limit: number, total: number, total_pages: number } }} ReportPage
 */
export const transactionsService = {
  /** @param {ReportQuery} [query] @returns {Promise<ReportPage>} */
  sales: (query) => request("/transactions/sales", { query }),
  /** @param {ReportQuery} [query] @returns {Promise<ReportPage>} */
  donations: (query) => request("/transactions/donations", { query }),
};

export const paymentsService = {
  /**
   * Estado de un pago por la referencia del checkout (`SALE-…` o `DON-…`).
   * @param {string} reference
   * @param {{ signal?: AbortSignal }} [options]
   * @returns {Promise<{
   *   id: string, reference: string, amount_in_cents: number, currency: string,
   *   status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR",
   *   customer_email: string, payment_method?: string | null,
   *   wompi_transaction_id?: string, created_at: string,
   * }>}
   */
  getStatus: (reference, { signal } = {}) => request(`/payments/${segment(reference)}`, { signal }),
};

export const healthService = {
  check: () => request("/health", { base: "root", auth: false }),
};

/**
 * Extrae el arreglo de registros de una respuesta de listado, sea un arreglo
 * directo o un objeto que lo envuelve (`{ data: [...] }`).
 * @param {unknown} payload
 * @returns {any[]}
 */
export function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const found = Object.values(payload).find(Array.isArray);
    if (found) return found;
  }
  return [];
}
