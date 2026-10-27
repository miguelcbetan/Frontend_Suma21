import { request } from "../httpClient.js";

const segment = (id) => encodeURIComponent(String(id));

/**
 * Servicio de un recurso REST de `/api` (ver API.md). Solo expone las
 * operaciones que el backend define para cada recurso.
 * @param {string} basePath
 */
function listAndCreate(basePath) {
  return {
    list: () => request(basePath),
    create: (data) => request(basePath, { method: "POST", body: data }),
  };
}

function fullCrud(basePath) {
  return {
    ...listAndCreate(basePath),
    get: (id) => request(`${basePath}/${segment(id)}`),
    update: (id, data) => request(`${basePath}/${segment(id)}`, { method: "PATCH", body: data }),
    remove: (id) => request(`${basePath}/${segment(id)}`, { method: "DELETE" }),
  };
}

/** `name`, `description?`, `unit_price`, `stock_qty?` */
export const productsService = fullCrud("/api/products");

/** `name`, `document_number`, `email?`, `phone?`, `address?` */
export const customersService = fullCrud("/api/customers");

/** `name`, `description?` */
export const paymentMethodsService = listAndCreate("/api/payment-methods");

/** `name`, `opening_balance` */
export const accountsService = listAndCreate("/api/accounts");

/** `name`, `description?`, `stock` */
export const inventoryService = listAndCreate("/api/inventory");

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
