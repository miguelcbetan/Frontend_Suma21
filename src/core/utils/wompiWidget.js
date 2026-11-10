/**
 * Integración con el Widget de Wompi (https://docs.wompi.co/docs/colombia/widget-checkout-web/).
 *
 * El frontend no firma nada: la llave pública y la firma de integridad llegan
 * del backend en el `checkout` de `POST /sales/checkout` o `POST /donations/monetary`.
 * Abrir el widget no confirma el pago: el estado real se consulta siempre en
 * el backend (`GET /payments/:reference`), que lo actualiza con el evento de Wompi.
 */

const WIDGET_SRC = "https://checkout.wompi.co/widget.js";
const LOAD_TIMEOUT_MS = 15000;

/** Ruta del frontend a la que vuelve el comprador. */
export const PAYMENT_RESULT_PATH = "/payment-result";

let loading = null;

/** Carga el script del widget una sola vez. */
function loadWidget() {
  if (typeof window === "undefined") return Promise.reject(new Error("Sin navegador"));
  if (window.WidgetCheckout) return Promise.resolve(window.WidgetCheckout);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    const timer = setTimeout(() => reject(new Error("El widget de Wompi tardó demasiado en cargar.")), LOAD_TIMEOUT_MS);
    script.onload = () => {
      clearTimeout(timer);
      if (window.WidgetCheckout) resolve(window.WidgetCheckout);
      else reject(new Error("El widget de Wompi no está disponible."));
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("No se pudo cargar el widget de Wompi."));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    loading = null;
    throw error;
  });

  return loading;
}

/** URL absoluta de retorno (funciona igual en localhost y en producción). */
export function paymentReturnUrl() {
  return `${window.location.origin}${PAYMENT_RESULT_PATH}`;
}

/**
 * Abre el pago de Wompi con los datos que devolvió el backend.
 * - Widget: `onFinished` recibe la transacción cuando Wompi cierra el flujo.
 * - Si el widget no carga, se usa el Web Checkout (`paymentUrl`) con
 *   `redirect-url` hacia `/payment-result` (ese parámetro no forma parte de la firma).
 * @param {import("../api/services/resources.js").WompiCheckout} checkout
 * @param {{
 *   onFinished?: (transaction: { id?: string, status?: string } | null) => void,
 * }} [options]
 * @returns {Promise<"widget" | "redirect">}
 */
export async function openWompiCheckout(checkout, { onFinished } = {}) {
  try {
    const WidgetCheckout = await loadWidget();
    const widget = new WidgetCheckout({
      currency: checkout.currency,
      amountInCents: checkout.amountInCents,
      reference: checkout.reference,
      publicKey: checkout.publicKey,
      signature: { integrity: checkout.integritySignature },
      redirectUrl: paymentReturnUrl(),
      ...(checkout.customerEmail ? { customerData: { email: checkout.customerEmail } } : {}),
    });
    widget.open((result) => onFinished?.(result?.transaction ?? null));
    return "widget";
  } catch {
    const separator = checkout.paymentUrl.includes("?") ? "&" : "?";
    window.location.assign(
      `${checkout.paymentUrl}${separator}redirect-url=${encodeURIComponent(paymentReturnUrl())}`,
    );
    return "redirect";
  }
}
