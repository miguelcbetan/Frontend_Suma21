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

const isFile = (value) => typeof File !== "undefined" && value instanceof File;

/**
 * Los productos aceptan JSON, o `multipart/form-data` cuando se envía la
 * imagen en el campo `image` (JPG, PNG, WEBP, GIF o AVIF, máx. 5 MB).
 */
function productBody(data) {
  if (!Object.values(data).some(isFile)) return data;
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) form.append(key, isFile(value) ? value : String(value));
  }
  return form;
}

const products = fullCrud("/api/products", "product_id");
const normalizeProduct = withId("product_id");

/** `name`, `description?`, `unit_price`, `stock_qty?`, `image?` (archivo); responde con `image_url`. */
export const productsService = {
  ...products,
  create: (data) =>
    request("/api/products", { method: "POST", body: productBody(data) }).then(normalizeProduct),
  update: (id, data) =>
    request(`/api/products/${segment(id)}`, { method: "PATCH", body: productBody(data) }).then(normalizeProduct),
};

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
   * Crea la venta o donación pendiente y su enlace de pago de Wompi Sandbox. El
   * backend calcula el total de una venta con los precios vigentes; el efecto
   * financiero y el descuento de inventario solo ocurren cuando Wompi aprueba.
   * `customer_id` y `donor_id` son el ID del usuario del servicio de seguridad.
   * Para reintentar un pago fallido se envía `sale_id` o `donation_id` (y, en
   * donaciones, el mismo `amount`) sin repetir los datos del comprador o donante.
   * @param {{
   *   kind: "donation", donor_id: string, payment_method_id: string, account_id: string,
   *   amount: number, certificate_issued?: boolean, certificate_number?: string,
   *   frequency?: number, end_date?: string,
   * } | {
   *   kind: "donation", donation_id: string, payment_method_id: string, account_id: string,
   *   amount: number,
   * } | {
   *   kind: "sale", customer_id: string, payment_method_id: string, account_id: string,
   *   items: { product_id: string, quantity: number }[],
   * } | {
   *   kind: "sale", sale_id: string, payment_method_id: string, account_id: string,
   * }} checkout
   * @returns {Promise<{ reference: string, status: string, currency: string, amount_in_cents: number, checkout_url: string, sale_id?: string, donation_id?: string }>}
   */
  createCheckout: (checkout) => request("/api/payments/checkout", { method: "POST", body: checkout }),

  /**
   * Estado de un pago por la referencia que devolvió `createCheckout`.
   * @param {string} reference
   * @param {{ signal?: AbortSignal }} [options]
   * @returns {Promise<{
   *   reference: string, kind: "donation" | "sale", status: string, amount_in_cents: number,
   *   currency: string, checkout_url: string | null, wompi_status: string | null,
   *   payment_method: string, processing_error: string | null,
   *   created_at: string, completed_at: string | null,
   *   sale_id?: string, donation_id?: string,
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
