import {
  authService,
  inventoryService,
  productsService,
  salesService,
  transactionsService,
} from "@/core/api";
import { formatCurrency } from "@/core/utils/currency";
import { formatDateTimeShort } from "@/core/utils/date";
import { IMAGE_ACCEPT, IMAGE_FORMATS_LABEL, validateImageFile } from "@/core/utils/imageFile";

const ROLE_OPTIONS = ["ADMIN", "DONANTE", "ESTUDIANTE", "ACUDIENTE", "TALLERISTA"];

const SALE_STATUS_LABELS = { PENDING: "Pendiente", APPROVED: "Aprobada", DECLINED: "Rechazada" };

const money = (value) => (value == null || value === "" ? "—" : formatCurrency(Number(value)));
const centsToMoney = (cents) => money(Number(cents) / 100);

const imageField = {
  name: "image",
  label: "Imagen del producto",
  type: "file",
  accept: IMAGE_ACCEPT,
  validate: validateImageFile,
  hint: `Formatos permitidos: ${IMAGE_FORMATS_LABEL}. Máximo 5 MB. Al editar, déjala vacía para conservar la actual.`,
};

/**
 * Secciones del panel, una por grupo de endpoints de `/api/v1` (y el alta de
 * usuarios del servicio de autenticación). Cada operación usa un endpoint real.
 *
 * Campo: `{ name, label, type, required?, hint?, min?, step?, options?,
 * defaultValue?, accept?, validate?, full? }`. Tipos: text, email, password,
 * textarea, number, integer, date, checkbox, select, file.
 *
 * Sección de recurso: con `list` muestra una tabla con búsqueda; `create` +
 * `fields` el alta (`editFields` si la edición admite otros campos);
 * `update`/`remove` activan editar y eliminar (con confirmación);
 * `stockFlow` añade la opción «aumentar stock de un registro existente»;
 * `rowActions` agrega acciones por fila. Una columna puede traer `format(record)`.
 *
 * Sección de reporte (`report`): tabla paginada en el servidor con filtros de fecha.
 */
export const SECTIONS = [
  {
    id: "products",
    label: "Productos",
    singular: "producto",
    description:
      "Productos de la tienda. Para reponer unidades de un producto que ya existe usa «Aumentar stock» en lugar de crear uno nuevo.",
    list: productsService.list,
    create: productsService.create,
    update: productsService.update,
    remove: productsService.remove,
    searchKeys: ["name", "description"],
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
      { key: "unit_price", label: "Precio", format: (record) => money(record.unit_price) },
      { key: "stock_qty", label: "Stock" },
      { key: "image_url", label: "Imagen", type: "image" },
    ],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "unit_price", label: "Precio unitario (COP)", type: "number", required: true, min: 0, step: "any" },
      {
        name: "stock_qty",
        label: "Unidades en stock",
        type: "integer",
        required: true,
        min: 1,
        defaultValue: "1",
        hint: "Entero mayor o igual a 1.",
      },
      { name: "description", label: "Descripción", type: "textarea", full: true },
      { ...imageField, full: true },
    ],
    stockFlow: {
      stockKey: "stock_qty",
      allowDecrease: false,
      describe: (record) => `${record.name} · stock ${record.stock_qty}`,
      apply: (record, _operation, quantity) => productsService.increaseStock(record.id, quantity),
    },
  },
  {
    id: "inventory",
    label: "Inventario",
    singular: "artículo de inventario",
    description:
      "Artículos de la fundación. Marca «Solicitado por la fundación» para que aparezca en la lista de donaciones en especie que ven los clientes.",
    list: inventoryService.list,
    create: inventoryService.create,
    update: inventoryService.update,
    remove: inventoryService.remove,
    removeHint: "Solo se pueden desactivar artículos con stock 0.",
    searchKeys: ["name", "description"],
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
      { key: "stock", label: "Stock" },
      { key: "is_needed", label: "Solicitado", type: "flag", trueLabel: "Solicitado", falseLabel: "No" },
    ],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      {
        name: "stock",
        label: "Stock inicial",
        type: "integer",
        required: true,
        min: 1,
        defaultValue: "1",
        hint: "Entero mayor o igual a 1.",
      },
      { name: "description", label: "Descripción", type: "textarea", full: true },
      {
        name: "is_needed",
        label: "Solicitado por la fundación (se muestra en donaciones en especie)",
        type: "checkbox",
        full: true,
      },
    ],
    editFields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea", full: true },
      {
        name: "is_needed",
        label: "Solicitado por la fundación (se muestra en donaciones en especie)",
        type: "checkbox",
        full: true,
      },
    ],
    rowActions: [
      {
        label: (record) => (record.is_needed ? "Dejar de solicitar" : "Marcar solicitado"),
        run: (record) => inventoryService.update(record.id, { is_needed: !record.is_needed }),
        notice: (record) =>
          record.is_needed
            ? `«${record.name}» ya no aparece en la lista de donaciones.`
            : `«${record.name}» ahora aparece en la lista de donaciones.`,
      },
    ],
    stockFlow: {
      stockKey: "stock",
      allowDecrease: true,
      describe: (record) => `${record.name} · stock ${record.stock}`,
      apply: (record, operation, quantity) => inventoryService.adjustStock(record.id, { operation, quantity }),
    },
  },
  {
    id: "sales-report",
    label: "Ingresos por ventas",
    singular: "venta",
    description: "Ventas cuyo pago aprobó Wompi (GET /transactions/sales).",
    report: transactionsService.sales,
    columns: [
      { key: "completed_at", label: "Fecha", format: (record) => formatDateTimeShort(record.completed_at) },
      { key: "reference", label: "Referencia" },
      { key: "sale_id", label: "Venta" },
      {
        key: "items",
        label: "Productos",
        format: (record) => (record.items ?? []).map((item) => `${item.quantity} × ${item.name}`).join(", "),
      },
      { key: "amount_in_cents", label: "Monto", format: (record) => centsToMoney(record.amount_in_cents) },
      { key: "payment_method", label: "Medio de pago" },
    ],
    amountKey: "amount_in_cents",
  },
  {
    id: "sales",
    label: "Ventas registradas",
    singular: "venta",
    description: "Todas las ventas creadas desde la tienda, incluidas las pendientes de pago (GET /sales).",
    list: salesService.list,
    searchKeys: ["id", "customerId", "status"],
    columns: [
      { key: "id", label: "Venta" },
      { key: "createdAt", label: "Fecha", format: (record) => formatDateTimeShort(record.createdAt) },
      { key: "customerId", label: "Usuario" },
      {
        key: "items",
        label: "Productos",
        format: (record) => (record.items ?? []).map((item) => `${item.quantity} × #${item.productId}`).join(", "),
      },
      { key: "totalPrice", label: "Total", format: (record) => money(record.totalPrice) },
      { key: "status", label: "Estado", format: (record) => SALE_STATUS_LABELS[record.status] ?? record.status },
    ],
  },
  {
    id: "donations-report",
    label: "Donaciones monetarias",
    singular: "donación",
    description:
      "Donaciones monetarias aprobadas por Wompi (GET /transactions/donations). El backend aún no ofrece un listado de donaciones en especie.",
    report: transactionsService.donations,
    columns: [
      { key: "completed_at", label: "Fecha", format: (record) => formatDateTimeShort(record.completed_at) },
      { key: "reference", label: "Referencia" },
      { key: "donation_id", label: "Donación" },
      { key: "amount_in_cents", label: "Monto", format: (record) => centsToMoney(record.amount_in_cents) },
      { key: "payment_method", label: "Medio de pago" },
    ],
    amountKey: "amount_in_cents",
  },
  {
    id: "users",
    label: "Usuarios",
    singular: "usuario",
    description:
      "Alta de usuarios en el servicio de autenticación (POST /auth/usuarios). Desde aquí solo se crean cuentas; el listado y la edición no están integrados.",
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
        hint: "DONANTE es la cuenta de cliente (compras y donaciones); ADMIN accede a este panel.",
      },
    ],
  },
];
