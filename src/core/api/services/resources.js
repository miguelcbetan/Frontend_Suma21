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
 * `/api/v1/products`. Listar y consultar es público; crear, editar y eliminar
 * exigen ADMIN.
 * Cuerpo: `name`, `description?`, `unit_price`, `stock_qty` (entero ≥ 1), `image?` (archivo).
 */
export const productsService = {
  list: () => request("/products", { auth: false }).then(normalizeProduct),
  get: (id) => request(`/products/${segment(id)}`, { auth: false }).then(normalizeProduct),
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

  /**
   * Cancela la compra `PENDING` del usuario del token (sin cuerpo): la
   * transacción pasa a `DECLINED`, se repone el stock y la venta vuelve a `DRAFT`.
   * 400 `NO_PENDING_CHECKOUT` si no hay nada que cancelar; 409
   * `SALE_CHECKOUT_CONFLICT` si el pago ya fue aprobado o cambió de estado.
   * @returns {Promise<Sale>} El carrito `DRAFT` restaurado.
   */
  cancelCheckout: () => request("/sales/checkout/cancel", { method: "POST" }),

  /**
   * Indica si el usuario tiene una compra pendiente de pago. Mientras sea
   * `true`, el backend rechaza cambios al carrito y nuevos checkouts con 409
   * `PENDING_CHECKOUT_CONFLICT`.
   * @returns {Promise<{ hasPendingSale: boolean }>}
   */
  getPendingStatus: () => request("/sales/pending-status"),

  /** Todas las ventas con su estado (`DRAFT`, `PENDING`, `APPROVED`, `DECLINED`). */
  list: () => request("/sales"),

  /**
   * Compras del usuario del token («Mis compras»), sin carritos `DRAFT`. La
   * `PENDING` va primero y es la única con `checkoutUrl` (para retomar el pago).
   * @returns {Promise<MySale[]>}
   */
  listMine: () => request("/sales/me"),
};

export const donationsService = {
  /**
   * Donación monetaria del usuario del token; devuelve el checkout de Wompi.
   * @param {{ amount: number }} donation Pesos COP, máximo dos decimales.
   * @returns {Promise<{ donationId: string, checkout: WompiCheckout }>}
   */
  createMonetary: ({ amount }) => request("/donations/monetary", { method: "POST", body: { amount } }),

  /**
   * Cancela una donación monetaria `PENDING` del usuario del token: su
   * transacción pasa a `DECLINED`. 403 si es de otra persona; 404 si no existe;
   * 409 si ya no está pendiente (p. ej. ya se aprobó).
   * @param {string} donationId
   * @returns {Promise<{ message: string }>}
   */
  cancelMonetary: (donationId) => request(`/donations/${segment(donationId)}/cancel`, { method: "POST" }),

  /**
   * Donación en especie registrada por ADMIN sobre artículos de inventario
   * existentes. El backend busca o crea al donante por su documento, suma el
   * stock, emite el certificado y lo envía por correo. 409 si faltan las firmas
   * oficiales; 404 si algún artículo no existe o está inactivo.
   * @param {{
   *   donation_date: string, notes?: string,
   *   donor_name: string, donor_document_type: string, donor_document_number: string, donor_email: string,
   *   items: { inventory_item_id: string, quantity: number, estimated_unit_value?: number }[],
   * }} donation
   * @returns {Promise<{ donationId: string, certificate_number: string, certificate_pdf_base64: string }>}
   */
  createInKind: (donation) => request("/donations/inkind", { method: "POST", body: donation }),

  /**
   * Sube o reemplaza las firmas oficiales de los certificados (solo ADMIN),
   * en `multipart/form-data`. Se puede enviar una sola: solo se reemplaza la
   * enviada. Imágenes PNG o JPEG. 400 si no llega ninguna o el formato no es válido.
   * @param {{ legal_representative?: File | null, tax_auditor?: File | null }} files
   * @returns {Promise<{ updated_roles: ("legal_representative" | "tax_auditor")[], message: string }>}
   */
  uploadSignatures: ({ legal_representative, tax_auditor }) => {
    const form = new FormData();
    if (legal_representative) form.append("legal_representative", legal_representative);
    if (tax_auditor) form.append("tax_auditor", tax_auditor);
    return request("/donations/signatures", { method: "POST", body: form });
  },

  /**
   * Donaciones monetarias únicas del usuario del token, de la más reciente a
   * la más antigua (excluye las cuotas del Plan Padrino).
   * @returns {Promise<{
   *   donation_id: string, status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR",
   *   amount: number, transaction_reference: string | null, checkout_url: string | null,
   *   created_at: string, tax_year: number, certificate_issued: boolean,
   *   certificate_number: string | null, can_download_certificate: boolean,
   * }[]>}
   */
  listMyMonetary: () => request("/donations/monetary/me"),

  /**
   * Donaciones en especie asociadas al perfil del usuario del token (incluye
   * las que registró un ADMIN antes de vincular la cuenta).
   * @returns {Promise<{
   *   inkind_id: string, donation_date: string, tax_year: number, notes: string | null,
   *   total_estimated_amount: number, certificate_issued: boolean, certificate_number: string | null,
   *   can_download_certificate: boolean,
   *   items: { inventory_item_id: string, item_name: string, quantity: number, estimated_unit_value: number | null }[],
   * }[]>}
   */
  listMyInKind: () => request("/donations/inkind/me"),

  /**
   * Certificado PDF oficial de una donación monetaria `APPROVED` (titular o
   * ADMIN). El backend lo genera con los datos del perfil de donante. 409 si
   * la donación no está aprobada o faltan las firmas oficiales.
   * @param {string} donationId
   * @returns {Promise<Blob>}
   */
  monetaryCertificate: (donationId) =>
    request(`/donations/monetary/${segment(donationId)}/certificate`, { responseType: "blob" }),

  /**
   * Certificado PDF de una donación en especie (titular o ADMIN).
   * @param {string} inkindId
   * @returns {Promise<Blob>}
   */
  inKindCertificate: (inkindId) =>
    request(`/donations/inkind/${segment(inkindId)}/certificate`, { responseType: "blob" }),

  /**
   * Crea la suscripción al Plan Padrino del usuario del token: queda `ACTIVE`
   * durante 12 meses con su primera cuota `PENDING` (no trae checkout: la cuota
   * se paga con `checkoutSponsorCycle`). 409 si ya tiene un plan `ACTIVE`.
   * @param {{ amount: number, frequency: SponsorFrequency }} plan `amount` en pesos, por cuota.
   * @returns {Promise<SponsorPlan>}
   */
  createSponsorPlan: ({ amount, frequency }) =>
    request("/donations/sponsor-plans", { method: "POST", body: { amount, frequency } }),

  /**
   * Planes del usuario con sus cuotas. El backend recalcula al consultar
   * (cuotas `OVERDUE`, cierre al cumplir el año).
   * @returns {Promise<SponsorPlan[]>}
   */
  listSponsorPlans: () => request("/donations/sponsor-plans/me"),

  /**
   * Crea la donación `DON-*` y el checkout de Wompi para una cuota `PENDING`
   * u `OVERDUE`. 409 si la cuota no está por pagar o ya tiene un checkout
   * `PENDING` vigente; 403 si es de otra persona.
   * @param {string} cycleId
   * @returns {Promise<{ cycleId: string, donationId: string, checkout: WompiCheckout }>}
   */
  checkoutSponsorCycle: (cycleId) =>
    request(`/donations/sponsor-plans/cycles/${segment(cycleId)}/checkout`, { method: "POST" }),

  /**
   * Cancela el plan `ACTIVE` y sus cuotas `PENDING`/`OVERDUE`. 409 si el plan
   * ya no está activo.
   * @param {string} planId
   */
  cancelSponsorPlan: (planId) => request(`/donations/sponsor-plans/${segment(planId)}/cancel`, { method: "POST" }),
};

/**
 * @typedef {"MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL"} SponsorFrequency
 * @typedef {{
 *   cycleId: string, cycleNumber: number, dueDate: string, amount: number,
 *   status: string, emailNotified: boolean, donationId: string | null,
 *   paidAt: string | null, certificateIssued: boolean, certificateNumber: string | null,
 * }} SponsorCycle
 * @typedef {{
 *   sponsorPlanId: string, donorId: string, amount: number, frequency: SponsorFrequency,
 *   status: string, startDate: string, endDate: string, createdAt: string, cycles: SponsorCycle[],
 * }} SponsorPlan
 */

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

/**
 * Compra de `GET /sales/me`.
 * @typedef {{
 *   saleId: string, status: "PENDING" | "APPROVED" | "DECLINED",
 *   paymentStatus: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR",
 *   transactionReference: string | null, paymentMethod: string | null,
 *   totalPrice: number, amountInCents: number, currency: "COP",
 *   checkoutUrl: string | null, createdAt: string,
 *   items: { productId: string, name: string, quantity: number, unitPrice: number, subtotal: number }[],
 * }} MySale
 */

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
