import { customersService, toList } from "./resources.js";

const normalizeDocument = (value) => String(value ?? "").replace(/\s+/g, "").toLowerCase();

/**
 * Obtiene el cliente (donante o comprador) que corresponde a un documento: si
 * ya existe en `GET /api/customers` lo reutiliza; si no, lo crea con
 * `POST /api/customers`. El backend no tiene usuarios ni búsqueda por documento,
 * por eso la coincidencia se hace aquí sobre el listado de clientes activos.
 * @param {{ name: string, document_number: string, email?: string }} person
 * @returns {Promise<{ id: string, name: string, document_number: string }>}
 */
export async function resolveCustomer({ name, document_number, email }) {
  const wanted = normalizeDocument(document_number);
  const existing = toList(await customersService.list()).find(
    (customer) => normalizeDocument(customer.document_number) === wanted,
  );
  if (existing) return existing;

  return customersService.create({
    name: name.trim(),
    document_number: document_number.trim(),
    ...(email?.trim() ? { email: email.trim() } : {}),
  });
}
