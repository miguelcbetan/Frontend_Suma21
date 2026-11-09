/** Estados finales con los que Wompi rechazó o anuló el pago. */
const REJECTED_STATUSES = ["DECLINED", "VOIDED", "ERROR"];

/**
 * Resultado de un pago según `status` de `GET /api/v1/payments/:reference`
 * (`PENDING`, `APPROVED`, `DECLINED`, `VOIDED` o `ERROR`). El backend lo
 * actualiza con el evento firmado de Wompi; volver de Wompi no basta para
 * darlo por aprobado.
 * @param {{ status: string }} payment
 * @returns {"approved" | "rejected" | "pending"}
 */
export function outcomeOf(payment) {
  if (payment.status === "APPROVED") return "approved";
  if (REJECTED_STATUSES.includes(payment.status)) return "rejected";
  return "pending";
}

/** Texto corto en español para cada estado del backend. */
export const STATUS_LABELS = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  DECLINED: "Rechazado",
  VOIDED: "Anulado",
  ERROR: "Error",
};

/** `70000` → `$70.000 COP` */
export function formatCop(amount) {
  return `$${amount.toLocaleString("es-CO")} COP`;
}

/** `24 de febrero, 2025 · 10:42 a. m.` */
export function formatDateTime(isoDate) {
  const date = new Date(isoDate);
  const day = date.toLocaleDateString("es-CO", { day: "numeric" });
  const month = date.toLocaleDateString("es-CO", { month: "long" });
  const year = date.toLocaleDateString("es-CO", { year: "numeric" });
  const time = date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} de ${month}, ${year} · ${time}`;
}

/** `24 de febrero de 2025` */
export function formatLongDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

/** `24-02-2025` */
export function formatNumericDate(isoDate) {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}
