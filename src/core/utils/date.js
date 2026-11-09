/**
 * Fecha local de hoy en formato `YYYY-MM-DD` (el que esperan `<input type="date">` y la API).
 * @returns {string}
 */
export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

/**
 * Fecha y hora legibles, p. ej. `9 nov 2026, 10:42 a. m.`; `—` si no hay fecha válida.
 * @param {string | null | undefined} isoDate
 * @returns {string}
 */
export function formatDateTimeShort(isoDate) {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}
