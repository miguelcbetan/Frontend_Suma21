/**
 * Pago con Wompi en una pestaña aparte.
 *
 * El frontend no firma nada: el enlace de pago (`paymentUrl` / `checkoutUrl`),
 * con la llave pública y la firma de integridad, llega del backend. Abrir
 * Wompi no confirma el pago: el estado real se consulta siempre en el backend
 * (`GET /payments/:reference`), que lo actualiza con el evento de Wompi.
 */

/** Ruta del frontend a la que vuelve el comprador. */
export const PAYMENT_RESULT_PATH = "/payment-result";

/** URL absoluta de retorno (funciona igual en localhost y en producción). */
export function paymentReturnUrl() {
  return `${window.location.origin}${PAYMENT_RESULT_PATH}`;
}

/* -------------------------------------------------------------------------- */
/* Pago en una pestaña aparte con el enlace (`checkoutUrl`) que guarda el backend */
/* -------------------------------------------------------------------------- */

/** `true` si es un enlace HTTPS de Wompi (p. ej. `https://checkout.wompi.co/p/?…`). */
export function isWompiCheckoutUrl(value) {
  return typeof value === "string" && /^https:\/\/[^/]*wompi\.co\//.test(value);
}

/**
 * Enlace de pago del backend tal cual, más la dirección de regreso a SUMA21
 * (`redirect-url`, que no forma parte de la firma de integridad de Wompi).
 * @param {string} checkoutUrl
 * @param {string | null} [reference]
 */
export function checkoutUrlWithReturn(checkoutUrl, reference) {
  if (/[?&]redirect-url=/.test(checkoutUrl)) return checkoutUrl;
  const back = reference ? `${paymentReturnUrl()}?reference=${encodeURIComponent(reference)}` : paymentReturnUrl();
  const separator = checkoutUrl.includes("?") ? "&" : "?";
  return `${checkoutUrl}${separator}redirect-url=${encodeURIComponent(back)}`;
}

/**
 * Abre una pestaña nueva en el mismo clic del usuario (antes de cualquier
 * `await`, para que el navegador no la bloquee) y la deja esperando el enlace
 * de pago. Si el navegador bloquea la ventana, `blocked` es `true`.
 *
 * Wompi no debe recibir la cabecera `Referer`: su WAF (CloudFront) responde
 * 403 a las peticiones que llegan con `Referer: http(s)://localhost…`. Por eso
 * la pestaña no se lleva a Wompi con `tab.location` desde esta página (eso
 * enviaría nuestro origen como referente), sino haciendo clic en un enlace
 * `rel="noopener noreferrer"` creado dentro de la propia pestaña, que además
 * declara `<meta name="referrer" content="no-referrer">`. Los enlaces de
 * respaldo («Abrir el pago en Wompi») también usan `rel="noopener noreferrer"`.
 * @returns {{ blocked: boolean, go: (url: string) => boolean, close: () => void }}
 */
export function reserveCheckoutTab() {
  let tab = null;
  try {
    tab = window.open("", "_blank");
  } catch {
    tab = null;
  }
  if (tab) {
    try {
      tab.opener = null;
      const { document: doc } = tab;
      const meta = doc.createElement("meta");
      meta.name = "referrer";
      meta.content = "no-referrer";
      doc.head.append(meta);
      doc.title = "Abriendo Wompi…";
      doc.body.style.cssText =
        "margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;color:#1f2a29";
      doc.body.textContent = "Preparando tu pago con Wompi…";
    } catch {
      // Solo es un texto de espera; si no se puede escribir, la pestaña sigue sirviendo.
    }
  }
  return {
    blocked: !tab,
    /**
     * Lleva la pestaña al enlace sin enviar `Referer`. Devuelve `false` si la
     * pestaña no existe, el usuario ya la cerró o no se pudo navegar sin
     * referente (en ese caso se cierra y la app muestra el enlace de respaldo).
     */
    go(url) {
      if (!tab || tab.closed) return false;
      try {
        const doc = tab.document;
        const link = doc.createElement("a");
        link.href = url;
        link.rel = "noopener noreferrer";
        link.referrerPolicy = "no-referrer";
        doc.body.append(link);
        link.click();
        return true;
      } catch {
        // Sin acceso al documento de la pestaña no se puede garantizar que no
        // viaje el `Referer`: se cierra y se ofrece el enlace con `noreferrer`.
        tab.close();
        return false;
      }
    },
    close() {
      if (tab && !tab.closed) tab.close();
    },
  };
}
