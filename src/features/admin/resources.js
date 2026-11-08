import {
  accountsService,
  authService,
  donationsService,
  inventoryService,
  paymentMethodsService,
  productsService,
  salesService,
} from "@/core/api";

/**
 * Fuentes de las listas desplegables de IDs (`type: "ref"`): de qué servicio
 * salen las opciones y cómo se muestra cada una.
 */
export const REF_SOURCES = {
  products: {
    service: productsService,
    label: (record) => `${record.name} · $${record.unit_price} · stock ${record.stock_qty}`,
  },
  paymentMethods: { service: paymentMethodsService, label: (record) => record.name },
  accounts: { service: accountsService, label: (record) => record.name },
  inventory: { service: inventoryService, label: (record) => `${record.name} · stock ${record.stock}` },
};

const ROLE_OPTIONS = ["ADMIN", "DONANTE", "ESTUDIANTE", "ACUDIENTE", "TALLERISTA"];

/** `customer_id` y `donor_id` son el ID del usuario del servicio de seguridad (el backend ya no tiene clientes). */
const USER_ID_HINT = "ID del usuario en el servicio de seguridad.";

/**
 * Secciones del panel, una por grupo de endpoints del backend de datos.
 *
 * Campo: `{ name, label, type, required?, hint?, min?, step?, source?, options?,
 * defaultValue?, serialize?, itemFields? }`. Tipos: text, email, password,
 * textarea, number, integer, date, checkbox, select, ref, items, file.
 * Sección: con `list` muestra una tabla; `update`/`remove` activan editar y borrar;
 * `describeResult` redacta el aviso con la respuesta del alta. Una columna puede
 * traer `format(record)` para mostrar algo distinto de su valor.
 */
export const SECTIONS = [
  {
    id: "products",
    label: "Productos",
    singular: "producto",
    list: productsService.list,
    create: productsService.create,
    update: productsService.update,
    remove: productsService.remove,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
      { key: "unit_price", label: "Precio" },
      { key: "stock_qty", label: "Stock" },
      { key: "image_url", label: "Imagen", format: (record) => (record.image_url ? "Sí" : "—") },
    ],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea" },
      { name: "unit_price", label: "Precio unitario", type: "number", required: true, min: 0, step: "any" },
      {
        name: "stock_qty",
        label: "Cantidad en stock",
        type: "integer",
        min: 0,
        hint: "El servidor solo acepta enteros positivos al escribir una cantidad. Si lo dejas vacío empieza en 0.",
      },
      {
        name: "image",
        label: "Imagen del producto",
        type: "file",
        hint: "JPG, PNG, WEBP, GIF o AVIF de hasta 5 MB. Al editar, déjala vacía para conservar la actual.",
      },
    ],
  },
  {
    id: "payment-methods",
    label: "Métodos de pago",
    singular: "método de pago",
    list: paymentMethodsService.list,
    create: paymentMethodsService.create,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
    ],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea" },
    ],
  },
  {
    id: "accounts",
    label: "Cuentas",
    singular: "cuenta",
    list: accountsService.list,
    create: accountsService.create,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "opening_balance", label: "Saldo inicial" },
    ],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "opening_balance", label: "Saldo inicial", type: "number", required: true, min: 0, step: "any" },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    singular: "artículo",
    list: inventoryService.list,
    create: inventoryService.create,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
      { key: "stock", label: "Stock" },
    ],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea" },
      { name: "stock", label: "Stock inicial", type: "integer", min: 1, hint: "Entero positivo. Si lo dejas vacío empieza en 0." },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    singular: "venta",
    create: salesService.create,
    describeResult: ({ saleId, total }) => `Se registró la venta #${saleId} por un total de $${total}.`,
    fields: [
      { name: "customer_id", label: "Comprador (ID de usuario)", type: "text", required: true, hint: USER_ID_HINT },
      { name: "payment_method_id", label: "Método de pago", type: "ref", source: "paymentMethods", required: true },
      { name: "account_id", label: "Cuenta", type: "ref", source: "accounts", required: true },
      { name: "sale_date", label: "Fecha de la venta", type: "date", required: true },
      { name: "receipt_reference", label: "Referencia del recibo", type: "text" },
      {
        name: "items",
        label: "Productos vendidos",
        type: "items",
        required: true,
        itemLabel: "producto",
        itemFields: [
          { name: "product_id", label: "Producto", type: "ref", source: "products", required: true },
          { name: "quantity", label: "Cantidad", type: "integer", required: true, min: 1, defaultValue: "1" },
        ],
      },
    ],
  },
  {
    id: "donations-monetary",
    label: "Donación monetaria",
    singular: "donación monetaria",
    create: donationsService.createMonetary,
    describeResult: ({ donationId, amount }) => `Se registró la donación #${donationId} por $${amount}.`,
    fields: [
      { name: "donor_id", label: "Donante (ID de usuario)", type: "text", required: true, hint: USER_ID_HINT },
      { name: "payment_method_id", label: "Método de pago", type: "ref", source: "paymentMethods", required: true },
      { name: "account_id", label: "Cuenta", type: "ref", source: "accounts", required: true },
      { name: "amount", label: "Monto", type: "number", required: true, min: 0.01, step: "any" },
      { name: "txn_date", label: "Fecha", type: "date", required: true },
      { name: "certificate_issued", label: "Certificado emitido", type: "checkbox" },
      { name: "certificate_number", label: "Número de certificado", type: "text" },
      { name: "frequency", label: "Frecuencia", type: "integer", min: 1 },
      { name: "end_date", label: "Fecha de finalización", type: "date", defaultValue: "" },
      { name: "receipt_reference", label: "Referencia del recibo", type: "text" },
    ],
  },
  {
    id: "donations-inkind",
    label: "Donación en especie",
    singular: "donación en especie",
    create: donationsService.createInKind,
    describeResult: ({ donationId }) => `Se registró la donación en especie #${donationId} y se actualizó el inventario.`,
    fields: [
      { name: "donor_id", label: "Donante (ID de usuario)", type: "text", required: true, hint: USER_ID_HINT },
      { name: "donation_date", label: "Fecha", type: "date", required: true },
      { name: "notes", label: "Notas", type: "textarea" },
      {
        name: "items",
        label: "Artículos donados",
        type: "items",
        required: true,
        itemLabel: "artículo",
        itemFields: [
          { name: "inventory_item_id", label: "Artículo", type: "ref", source: "inventory", required: true },
          { name: "quantity", label: "Cantidad", type: "number", required: true, min: 0.01, step: "any", defaultValue: "1" },
          { name: "estimated_unit_value", label: "Valor unitario estimado", type: "number", min: 0, step: "any" },
        ],
      },
    ],
  },
  {
    id: "users",
    label: "Usuarios",
    singular: "usuario",
    create: ({ roles, ...rest }) => authService.createUser({ ...rest, roles: [roles] }),
    fields: [
      { name: "username", label: "Nombre de usuario", type: "text", required: true },
      { name: "email", label: "Correo electrónico", type: "email", required: true },
      { name: "clave", label: "Contraseña", type: "password", required: true, hint: "Mínimo 12 caracteres." },
      {
        name: "roles",
        label: "Rol",
        type: "select",
        required: true,
        options: ROLE_OPTIONS.map((role) => ({ value: role, label: role })),
        defaultValue: "DONANTE",
      },
    ],
  },
];
