import { todayISO } from "@/core/utils/date";

const NUMERIC = new Set(["number", "integer"]);

function initialValue(field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "date") return todayISO();
  if (field.type === "checkbox") return false;
  if (field.type === "items") return [emptyRow(field)];
  return "";
}

/** Fila vacía de un campo `items`. */
export function emptyRow(field) {
  return Object.fromEntries(field.itemFields.map((sub) => [sub.name, initialValue(sub)]));
}

/** Valores iniciales de un formulario nuevo. */
export function initialValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, initialValue(field)]));
}

/** Valores de un formulario de edición a partir de un registro existente. */
export function valuesFromRecord(fields, record) {
  return Object.fromEntries(
    fields.map((field) => {
      const raw = record[field.name];
      if (raw == null) return [field.name, initialValue({ ...field, defaultValue: "" })];
      if (field.type === "checkbox") return [field.name, Boolean(raw)];
      if (field.type === "date") return [field.name, String(raw).slice(0, 10)];
      return [field.name, String(raw)];
    }),
  );
}

function parseScalar(field, raw) {
  if (field.type === "checkbox") return { value: Boolean(raw) };

  const text = typeof raw === "string" ? raw.trim() : raw;
  if (text === "" || text == null) {
    return field.required ? { error: "Este campo es obligatorio." } : { skip: true };
  }
  if (!NUMERIC.has(field.type)) return { value: field.type === "password" ? raw : text };

  const number = Number(text);
  if (!Number.isFinite(number)) return { error: "Escribe un número válido." };
  if (field.type === "integer" && !Number.isInteger(number)) return { error: "Escribe un número entero." };
  if (field.min != null && number < field.min) return { error: `El mínimo es ${field.min}.` };
  return { value: number };
}

/**
 * Convierte los valores del formulario en el cuerpo de la petición: números
 * como número, opcionales vacíos omitidos y filas de `items` anidadas.
 * @returns {{ body: Record<string, unknown>, errors: Record<string, string> }}
 */
export function buildBody(fields, values) {
  const body = {};
  const errors = {};

  for (const field of fields) {
    if (field.type === "items") {
      const rows = values[field.name].map((row) => buildBody(field.itemFields, row));
      if (rows.length === 0) errors[field.name] = `Agrega al menos un ${field.itemLabel}.`;
      else if (rows.some((row) => Object.keys(row.errors).length > 0)) {
        errors[field.name] = `Revisa los datos de cada ${field.itemLabel}.`;
      }
      body[field.name] = rows.map((row) => row.body);
      continue;
    }

    const result = parseScalar(field, values[field.name]);
    if (result.error) errors[field.name] = result.error;
    else if (!result.skip) body[field.name] = result.value;
  }

  return { body, errors };
}

/** Deja solo los campos cuyo valor cambió respecto del registro original. */
export function changedFields(body, record) {
  return Object.fromEntries(
    Object.entries(body).filter(([key, value]) => String(value) !== String(record[key] ?? "")),
  );
}
