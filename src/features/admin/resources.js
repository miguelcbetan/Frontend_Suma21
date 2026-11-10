import { inventoryService, productsService, salesService } from "@/core/api";
import { formatCurrency } from "@/core/utils/currency";
import { formatDateTimeShort } from "@/core/utils/date";
import { IMAGE_ACCEPT, IMAGE_FORMATS_LABEL, validateImageFile } from "@/core/utils/imageFile";

const SALE_STATUS_LABELS = {
  DRAFT: "Carrito (sin pagar)",
  PENDING: "Pendiente de pago",
  APPROVED: "Aprobada",
  DECLINED: "Rechazada",
};
const SALE_STATUS_TONES = { DRAFT: "neutral", PENDING: "orange", APPROVED: "green", DECLINED: "danger" };

const money = (value) => (value == null || value === "" ? "—" : formatCurrency(Number(value)));
const imageField = {
  name: "image",
  label: "Imagen del producto",
  type: "file",
  accept: IMAGE_ACCEPT,
  validate: validateImageFile,
  hint: `Formatos permitidos: ${IMAGE_FORMATS_LABEL}. Máximo 5 MB. Al editar, déjala vacía para conservar la actual.`,
};

/**
 * Secciones del panel, una por grupo de endpoints de `/api/v1`.
 * Cada operación usa un endpoint real.
 *
 * Campo: `{ name, label, type, required?, hint?, min?, step?, options?,
 * defaultValue?, accept?, validate?, full? }`. Tipos: text, email, password,
 * textarea, number, integer, date, checkbox, select, file.
 *
 * Sección de recurso: con `list` muestra una tabla con búsqueda; `create` +
 * `fields` el alta (`editFields` si la edición admite otros campos);
 * `update`/`remove` activan editar y eliminar (con confirmación);
 * `stockFlow` añade la opción «aumentar stock de un registro existente»;
 * `rowActions` agrega acciones por fila. Una columna puede traer `format(record)`,
 * o `type: "toggle"` con `toggle: { label, run, notice }` para cambiarla con un interruptor.
 *
 * Sección de reporte (`report`): tabla paginada en el servidor con filtros de fecha.
 */
export const SECTIONS = [
  {
    id: "products",
    label: "Productos",
    icon: "bag",
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
    icon: "package",
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
      {
        key: "is_needed",
        label: "Solicitado",
        type: "toggle",
        toggle: {
          label: (record) => `Solicitado por la fundación: ${record.name}`,
          run: (record) => inventoryService.update(record.id, { is_needed: !record.is_needed }),
          notice: (record) =>
            record.is_needed
              ? `«${record.name}» ya no aparece en la lista de donaciones.`
              : `«${record.name}» ahora aparece en la lista de donaciones.`,
        },
      },
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
    stockFlow: {
      stockKey: "stock",
      allowDecrease: true,
      describe: (record) => `${record.name} · stock ${record.stock}`,
      apply: (record, operation, quantity) => inventoryService.adjustStock(record.id, { operation, quantity }),
    },
  },
  {
    id: "sales",
    label: "Ventas registradas",
    icon: "receipt",
    singular: "venta",
    description: "Todas las ventas de la tienda: carritos sin pagar (DRAFT), pendientes de pago, aprobadas y rechazadas.",
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
      {
        key: "status",
        label: "Estado",
        type: "status",
        tones: SALE_STATUS_TONES,
        format: (record) => SALE_STATUS_LABELS[record.status] ?? record.status,
      },
    ],
  },
];
