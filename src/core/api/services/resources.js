import { request } from "../httpClient.js";

const segment = (id) => encodeURIComponent(String(id));

/**
 * El backend devuelve las filas tal cual están en la base de datos, con la
 * clave primaria como `<recurso>_id` (p. ej. `product_id`). Aquí se les añade
 * `id` para que el resto del frontend trabaje con un único nombre.
 * @param {string} idKey
 */
function withId(idKey) {
  const addId = (record) =>
    record && typeof record === "object" && idKey in record ? { id: record[idKey], ...record } : record;
  return (payload) => (Array.isArray(payload) ? payload.map(addId) : addId(payload));
}

/**
 * Servicio de un recurso REST de `/api` (ver API.md). Solo expone las
 * operaciones que el backend define para cada recurso.
 * @param {string} basePath
 * @param {string} idKey Nombre de la clave primaria en las respuestas.
 */
function listAndCreate(basePath, idKey) {
  const normalize = withId(idKey);
  return {
    list: () => request(basePath).then(normalize),
    create: (data) => request(basePath, { method: "POST", body: data }).then(normalize),
  };
}

function fullCrud(basePath, idKey) {
  const normalize = withId(idKey);
  return {
    ...listAndCreate(basePath, idKey),
    get: (id) => request(`${basePath}/${segment(id)}`).then(normalize),
    update: (id, data) =>
      request(`${basePath}/${segment(id)}`, { method: "PATCH", body: data }).then(normalize),
    remove: (id) => request(`${basePath}/${segment(id)}`, { method: "DELETE" }),
  };
}

/** `name`, `description?`, `unit_price`, `stock_qty?` */
export const productsService = fullCrud("/api/products", "product_id");

/** `name`, `document_number`, `email?`, `phone?`, `address?` */
export const customersService = fullCrud("/api/customers", "customer_id");

/** `name`, `description?` */
export const paymentMethodsService = listAndCreate("/api/payment-methods", "payment_method_id");

/** `name`, `opening_balance` */
export const accountsService = listAndCreate("/api/accounts", "account_id");

/** `name`, `description?`, `stock?` */
export const inventoryService = listAndCreate("/api/inventory", "inventory_item_id");

export const salesService = {
  /**
   * Venta completa en una transacción.
   * @param {{
   *   customer_id: string, payment_method_id: string, account_id: string,
   *   sale_date: string, receipt_reference?: string,
   *   items: { product_id: string, quantity: number }[],
   * }} sale
   */
  create: (sale) => request("/api/sales", { method: "POST", body: sale }),
};

export const donationsService = {
  /**
   * Donación monetaria con su movimiento contable.
   * @param {{
   *   donor_id: string, payment_method_id: string, account_id: string,
   *   amount: number, txn_date: string, certificate_issued: boolean,
   *   certificate_number?: string, frequency?: number, end_date?: string,
   *   receipt_reference?: string,
   * }} donation
   */
  createMonetary: (donation) => request("/api/donations/monetary", { method: "POST", body: donation }),

  /**
   * Donación en especie; aumenta el stock del inventario.
   * @param {{
   *   donor_id: string, donation_date: string, notes?: string,
   *   items: { inventory_item_id: string, quantity: number, estimated_unit_value?: number }[],
   * }} donation
   */
  createInKind: (donation) => request("/api/donations/inkind", { method: "POST", body: donation }),
};

export const paymentsService = {
  /**
   * Crea un enlace de pago de Wompi Sandbox. El backend calcula el total de una
   * venta con los precios vigentes; la operación solo se registra cuando Wompi
   * confirma el pago.
   * @param {{
   *   kind: "donation", donor_id: string, payment_method_id: string, account_id: string,
   *   amount: number, certificate_issued?: boolean, certificate_number?: string,
   *   frequency?: number, end_date?: string,
   * } | {
   *   kind: "sale", customer_id: string, payment_method_id: string, account_id: string,
   *   items: { product_id: string, quantity: number }[],
   * }} checkout
   * @returns {Promise<{ reference: string, status: string, currency: string, amount_in_cents: number, checkout_url: string }>}
   */
  createCheckout: (checkout) => request("/api/payments/checkout", { method: "POST", body: checkout }),

  /**
   * Estado de un pago por la referencia que devolvió `createCheckout`.
   * @param {string} reference
   * @param {{ signal?: AbortSignal }} [options]
   * @returns {Promise<{
   *   reference: string, kind: "donation" | "sale", status: string, amount_in_cents: number,
   *   currency: string, checkout_url: string | null, wompi_status: string | null,
   *   payment_method_type: string | null, processing_error: string | null,
   *   created_at: string, completed_at: string | null,
   * }>}
   */
  getStatus: (reference, { signal } = {}) => request(`/api/payments/${segment(reference)}`, { signal }),
};

export const healthService = {
  check: () => request("/health", { auth: false }),
};

/**
 * Extrae el arreglo de registros de una respuesta de listado, sea un arreglo
 * directo o un objeto que lo envuelve (`{ data: [...] }`, `{ products: [...] }`…).
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
