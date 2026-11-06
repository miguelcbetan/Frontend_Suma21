const UNITS = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
  "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis",
  "veintisiete", "veintiocho", "veintinueve",
];
const TENS = { 3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa" };
const HUNDREDS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

function belowHundred(n) {
  if (n < 30) return UNITS[n];
  const unit = n % 10;
  return unit ? `${TENS[Math.floor(n / 10)]} y ${UNITS[unit]}` : TENS[Math.floor(n / 10)];
}

function belowThousand(n) {
  if (n === 100) return "cien";
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? HUNDREDS[hundreds] : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** «uno» → «un» y «veintiuno» → «veintiún» cuando acompañan a «mil» o «millones». */
function apocope(text) {
  return text.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
}

function words(n) {
  if (n === 0) return "cero";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const units = n % 1000;
  const parts = [];
  if (millions) parts.push(millions === 1 ? "un millón" : `${apocope(words(millions))} millones`);
  if (thousands) parts.push(thousands === 1 ? "mil" : `${apocope(belowThousand(thousands))} mil`);
  if (units) parts.push(belowThousand(units));
  return parts.join(" ");
}

/**
 * Valor en pesos escrito en letras, p. ej. `70000` → «SETENTA MIL PESOS M/CTE».
 * Redondea al peso y admite hasta billones.
 * @param {number} amount
 * @returns {string}
 */
export function amountInWords(amount) {
  const whole = Math.round(Math.abs(amount));
  if (whole === 1) return "UN PESO M/CTE";
  const connector = whole >= 1_000_000 && whole % 1_000_000 === 0 ? " DE" : "";
  return `${words(whole).toUpperCase()}${connector} PESOS M/CTE`;
}
