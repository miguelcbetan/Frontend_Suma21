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
 * 
 * @param {import("../api/services/resources.js").WompiCheckout} checkout
 * @param {{
 *   onFinished?: (transaction: { id?: string, status?: string } | null) => void,
 * }} [options]
 * 
 * @returns {Promise<"widget" | "redirect">}
 */
export async function openWompiCheckout(checkout, { onFinished } = {}) {
  let observer = null;

  const cleanupObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

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

    let finishedCalled = false;

    const safeOnFinished = (result) => {
      if (finishedCalled) return;
      finishedCalled = true;
      cleanupObserver();
      onFinished?.(result);
    };

    let targetIframe = null;

    // Monitor de DOM enfocado únicamente en la eliminación del iframe de Wompi
    observer = new MutationObserver((mutations) => {
      if (finishedCalled) return;

      for (const mutation of mutations) {
        // 1. Detectar cuando se añade el iframe de Wompi
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === "IFRAME" && node.src.includes("wompi")) {
              targetIframe = node;
            } else {
              const nestedIframe = node.querySelector?.('iframe[src*="wompi"]');
              if (nestedIframe) targetIframe = nestedIframe;
            }
          }
        });

        // 2. Detectar si ESE iframe específico fue removido
        mutation.removedNodes.forEach((node) => {
          const isTargetRemoved = node === targetIframe || node.contains?.(targetIframe);
          if (targetIframe && isTargetRemoved) {
            // Espera a verificar si Wompi respondió onFinished con una transacción legítima
            setTimeout(() => {
              if (!finishedCalled) {
                safeOnFinished(null);
              }
            }, 600);
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    widget.open((result) => {
      safeOnFinished(result?.transaction ?? null);
    });

    return "widget";
  } catch {
    // Si falla el widget y cae al fallback de redirección, cancelamos el observer inmediatamente
    cleanupObserver();

    const separator = checkout.paymentUrl.includes("?") ? "&" : "?";
    window.location.assign(
      `${checkout.paymentUrl}${separator}redirect-url=${encodeURIComponent(paymentReturnUrl())}`,
    );
    return "redirect";
  }
}