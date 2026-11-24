/**
 * Datos compartidos del Plan Padrino (`/donations/sponsor-plans`). El plan dura
 * 12 meses y el monto es el de cada cuota.
 */

/** Periodicidades que acepta el backend, con cuántas cuotas suman en un año. */
export const SPONSOR_FREQUENCIES = {
  MONTHLY: { label: "Mensual", every: "cada mes", cycles: 12 },
  QUARTERLY: { label: "Trimestral", every: "cada 3 meses", cycles: 4 },
  SEMIANNUAL: { label: "Semestral", every: "cada 6 meses", cycles: 2 },
  ANNUAL: { label: "Anual", every: "cada año", cycles: 1 },
};

/** @param {string} frequency */
export function frequencyInfo(frequency) {
  return SPONSOR_FREQUENCIES[frequency] ?? { label: frequency, every: "", cycles: null };
}

/** Cuotas que se pueden pagar: pendientes o vencidas. */
export const PAYABLE_CYCLE_STATUSES = ["PENDING", "OVERDUE"];

/**
 * Una cuota está pagada si el backend registró `paidAt` o la marca como pagada.
 * @param {{ status: string, paidAt: string | null }} cycle
 */
export function isCyclePaid(cycle) {
  return Boolean(cycle.paidAt) || ["PAID", "APPROVED"].includes(cycle.status);
}

/** `70000` → `$70.000` */
export function formatPesos(amount) {
  return `$${Number(amount).toLocaleString("es-CO")}`;
}

/**
 * Fecha sin hora del backend (`2026-11-18`) como fecha local, p. ej.
 * `18 de noviembre de 2026`. Se arma con año, mes y día para evitar el
 * corrimiento de zona horaria de `new Date("YYYY-MM-DD")`.
 * @param {string | null | undefined} isoDate
 */
export function formatPlanDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate ?? "");
  if (!match) return "—";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}
