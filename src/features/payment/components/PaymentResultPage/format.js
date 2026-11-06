const WOMPI_METHOD_LABELS = {
  CARD: "Tarjeta Débito/Crédito",
  NEQUI: "Nequi",
  PSE: "PSE",
  BANCOLOMBIA_TRANSFER: "Transferencia Bancolombia",
  BANCOLOMBIA_COLLECT: "Bancolombia",
  DAVIPLATA: "Daviplata",
};

/** Estados de Wompi con los que un pago `PENDING` en realidad ya fue rechazado. */
const REJECTED_WOMPI_STATUSES = ["DECLINED", "ERROR", "VOIDED"];

/**
 * Resultado de un pago a partir de lo que devuelve `GET /api/payments/:reference`.
 * El backend deja `status` en `PENDING` cuando Wompi rechaza la transacción y
 * guarda el motivo en `wompi_status`.
 * @param {{ status: string, wompi_status: string | null }} payment
 * @returns {"approved" | "review" | "failed" | "rejected" | "pending"}
 */
export function outcomeOf(payment) {
  if (payment.status === "APPROVED") return "approved";
  if (payment.status === "APPROVED_ACTION_REQUIRED") return "review";
  if (payment.status === "FAILED") return "failed";
  if (REJECTED_WOMPI_STATUSES.includes(payment.wompi_status)) return "rejected";
  return "pending";
}

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

/** Etiqueta legible del método con el que pagó el donante (`payment_method_type` de Wompi). */
export function paymentMethodLabel(type) {
  if (!type) return "—";
  return WOMPI_METHOD_LABELS[type] ?? type;
}
