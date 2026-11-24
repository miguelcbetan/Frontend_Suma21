import { createElement } from "react";

import { ProductChips } from "@/components/ui/ProductChips";
import { inventoryService, productsService, salesService, toList } from "@/core/api";
import { formatCurrency } from "@/core/utils/currency";
import { formatDateTimeShort } from "@/core/utils/date";
import { groupSaleItems } from "@/core/utils/groupSaleItems";
import { IMAGE_ACCEPT, IMAGE_FORMATS_LABEL, validateImageFile } from "@/core/utils/imageFile";

const SALE_STATUS_LABELS = {
  PENDING: "Pendiente de pago",
  APPROVED: "Aprobada",
  DECLINED: "Rechazada",
};
const SALE_STATUS_TONES = { PENDING: "orange", APPROVED: "green", DECLINED: "danger" };

const money = (value) => (value == null || value === "" ? "—" : formatCurrency(Number(value)));

function toLocalDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compareText(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "es");
}

/**
 * Añade nombres legibles a las líneas de venta consultando el catálogo.
 * El listado de ventas conserva todos sus datos originales.
 */
async function listSalesWithProductNames() {
  const [salesPayload, productsPayload] = await Promise.all([salesService.list(), productsService.listAll()]);
  const productsById = new Map(
    toList(productsPayload).map((product) => [String(product.id), product.name]),
  );

  return toList(salesPayload)
    .filter((sale) => sale.status !== "DRAFT")
    .map((sale) => ({
      ...sale,
      items: (sale.items ?? []).map((item) => {
        const productId = String(item.productId ?? item.product_id ?? "");
        const name =
          item.name ??
          item.productName ??
          item.product_name ??
          item.product?.name ??
          productsById.get(productId) ??
          null;
        return { ...item, productId, name };
      }),
    }));
}
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
 * `stockFlow` añade la opción «ajustar stock de un registro existente»;
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
      "Productos de la tienda. Para aumentar o disminuir las unidades de un producto que ya existe usa «Ajustar stock» en lugar de crear uno nuevo.",
    list: productsService.listAll,
    create: productsService.create,
    update: productsService.update,
    remove: productsService.remove,
    searchKeys: ["name", "description"],
    primaryFilter: {
      label: "Estado de stock",
      options: [
        { value: "all", label: "Todos" },
        { value: "available", label: "Con stock (> 5)", match: (record) => Number(record.stock_qty) > 5 },
        {
          value: "low",
          label: "Stock bajo",
          match: (record) => Number(record.stock_qty) >= 1 && Number(record.stock_qty) <= 5,
        },
        { value: "out", label: "Agotados", match: (record) => Number(record.stock_qty) === 0 },
      ],
    },
    filters: [
      {
        id: "price",
        type: "numberRange",
        minLabel: "Precio mín. (COP)",
        maxLabel: "Precio máx. (COP)",
        getValue: (record) => Number(record.unit_price),
      },
    ],
    sortOptions: [
      { value: "name", label: "Ordenar: Nombre", compare: (a, b) => compareText(a.name, b.name) },
      { value: "stock-asc", label: "Stock: menor a mayor", compare: (a, b) => Number(a.stock_qty) - Number(b.stock_qty) },
      { value: "stock-desc", label: "Stock: mayor a menor", compare: (a, b) => Number(b.stock_qty) - Number(a.stock_qty) },
      { value: "price-asc", label: "Precio: menor a mayor", compare: (a, b) => Number(a.unit_price) - Number(b.unit_price) },
      { value: "price-desc", label: "Precio: mayor a menor", compare: (a, b) => Number(b.unit_price) - Number(a.unit_price) },
    ],
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
    editFields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "unit_price", label: "Precio unitario (COP)", type: "number", required: true, min: 0, step: "any" },
      { name: "description", label: "Descripción", type: "textarea", full: true },
      { ...imageField, full: true },
    ],
    stockFlow: {
      stockKey: "stock_qty",
      allowDecrease: true,
      describe: (record) => `${record.name} · stock ${record.stock_qty}`,
      apply: (record, operation, quantity) => productsService.adjustStock(record.id, { operation, quantity }),
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
    primaryFilter: {
      label: "Visibilidad",
      options: [
        { value: "all", label: "Todos" },
        { value: "yes", label: "Solicitados", match: (record) => Boolean(record.is_needed) },
        { value: "no", label: "No solicitados", match: (record) => !record.is_needed },
      ],
    },
    filters: [
      {
        id: "stock",
        label: "Nivel de stock",
        type: "select",
        options: [
          { value: "all", label: "Todos" },
          { value: "with-stock", label: "Con stock (> 0)", match: (record) => Number(record.stock) > 0 },
          {
            value: "low",
            label: "Stock bajo (1–5)",
            match: (record) => Number(record.stock) >= 1 && Number(record.stock) <= 5,
          },
          { value: "empty", label: "Sin stock (0)", match: (record) => Number(record.stock) === 0 },
        ],
      },
    ],
    sortOptions: [
      { value: "name", label: "Ordenar: Nombre", compare: (a, b) => compareText(a.name, b.name) },
      { value: "stock-asc", label: "Stock: menor a mayor", compare: (a, b) => Number(a.stock) - Number(b.stock) },
      { value: "stock-desc", label: "Stock: mayor a menor", compare: (a, b) => Number(b.stock) - Number(a.stock) },
    ],
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
    label: "Historial de ventas",
    icon: "receipt",
    singular: "venta",
    description: "Compras realizadas en la tienda: aprobadas, pendientes de pago y rechazadas.",
    list: listSalesWithProductNames,
    searchKeys: ["id", "customerId", "customerName", "status"],
    searchPlaceholder: "Buscar por venta, cliente o producto…",
    getSearchText: (record) =>
      `${record.customerName ?? ""} ${SALE_STATUS_LABELS[record.status] ?? ""} ${(record.items ?? [])
        .map((item) => item.name ?? item.productId)
        .join(" ")}`,
    primaryFilter: {
      label: "Estado de venta",
      options: [
        { value: "all", label: "Todas" },
        { value: "APPROVED", label: "Aprobadas", match: (record) => record.status === "APPROVED" },
        { value: "PENDING", label: "Pendientes", match: (record) => record.status === "PENDING" },
        { value: "DECLINED", label: "Rechazadas", match: (record) => record.status === "DECLINED" },
      ],
    },
    filters: [
      {
        id: "date",
        type: "dateRange",
        fromLabel: "Desde",
        toLabel: "Hasta",
        getDate: (record) => toLocalDateKey(record.createdAt),
      },
    ],
    sortOptions: [
      {
        value: "newest",
        label: "Ordenar: Más recientes",
        compare: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      },
      {
        value: "oldest",
        label: "Más antiguas",
        compare: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      },
      {
        value: "total-desc",
        label: "Total: mayor a menor",
        compare: (a, b) => Number(b.totalPrice) - Number(a.totalPrice),
      },
      {
        value: "total-asc",
        label: "Total: menor a mayor",
        compare: (a, b) => Number(a.totalPrice) - Number(b.totalPrice),
      },
    ],
    columns: [
      { key: "id", label: "Venta" },
      { key: "createdAt", label: "Fecha", format: (record) => formatDateTimeShort(record.createdAt) },
      {
        key: "customerName",
        label: "Usuario",
        format: (record) => record.customerName || (record.customerId ? `Usuario #${record.customerId}` : null),
      },
      {
        key: "items",
        label: "Productos",
        render: (record) => {
          const grouped = groupSaleItems(record.items).map((item) => ({
            ...item,
            name: item.name ?? `Producto #${item.productId}`,
          }));
          return grouped.length > 0 ? createElement(ProductChips, { items: grouped }) : null;
        },
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
