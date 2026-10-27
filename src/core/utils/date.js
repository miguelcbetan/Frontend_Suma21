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
