import {
  accountsService,
  authService,
  customersService,
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
  customers: { service: customersService, label: (record) => record.name },
  products: { service: productsService, label: (record) => record.name },
  paymentMethods: { service: paymentMethodsService, label: (record) => record.name },
  accounts: { service: accountsService, label: (record) => record.name },
  inventory: { service: inventoryService, label: (record) => record.name },
};

const ROLE_OPTIONS = ["ADMIN", "DONANTE", "ESTUDIANTE", "ACUDIENTE", "TALLERISTA"];

/**
 * Secciones del panel, una por grupo de endpoints de API.md.
 *
 * Campo: `{ name, label, type, required?, hint?, min?, step?, source?, options?,
 * defaultValue?, serialize?, itemFields? }`. Tipos: text, email, password,
 * textarea, number, integer, date, checkbox, select, ref, items.
 * Sección: con `list` muestra una tabla; `update`/`remove` activan editar y borrar.
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
    ],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea" },
      { name: "unit_price", label: "Precio unitario", type: "number", required: true, min: 0, step: "any" },
      { name: "stock_qty", label: "Cantidad en stock", type: "integer", min: 0 },
    ],
  },
  {
    id: "customers",
    label: "Clientes",
    singular: "cliente",
    list: customersService.list,
    create: customersService.create,
    update: customersService.update,
    remove: customersService.remove,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "document_number", label: "Documento" },
      { key: "email", label: "Correo" },
      { key: "phone", label: "Teléfono" },
      { key: "address", label: "Dirección" },
    ],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "document_number", label: "Número de documento", type: "text", required: true },
      { name: "email", label: "Correo electrónico", type: "email" },
      { name: "phone", label: "Teléfono", type: "text" },
      { name: "address", label: "Dirección", type: "text" },
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
      { name: "opening_balance", label: "Saldo inicial", type: "number", required: true, step: "any" },
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
      { name: "stock", label: "Stock", type: "integer", required: true, min: 0 },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    singular: "venta",
    create: salesService.create,
    fields: [
      { name: "customer_id", label: "Cliente", type: "ref", source: "customers", required: true },
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
    fields: [
      { name: "donor_id", label: "Donante", type: "ref", source: "customers", required: true },
      { name: "payment_method_id", label: "Método de pago", type: "ref", source: "paymentMethods", required: true },
      { name: "account_id", label: "Cuenta", type: "ref", source: "accounts", required: true },
      { name: "amount", label: "Monto", type: "number", required: true, min: 0, step: "any" },
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
    fields: [
      { name: "donor_id", label: "Donante", type: "ref", source: "customers", required: true },
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
          { name: "quantity", label: "Cantidad", type: "number", required: true, min: 0, step: "any", defaultValue: "1" },
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
