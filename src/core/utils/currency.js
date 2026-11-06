const formatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/**
 * Valor en pesos colombianos, p. ej. `$ 25.000`.
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  return formatter.format(value);
}
