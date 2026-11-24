import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ApiError, describeError, salesService } from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";
import { checkoutUrlWithReturn, isWompiCheckoutUrl, reserveCheckoutTab } from "@/core/utils/wompiWidget";

import { useCart } from "../../cart/useCart.js";
import { CartSummary } from "../CartSummary";

import styles from "./CartDrawer.module.css";

const OPERATIONS_PATH = "/mis-compras";
const LOCKED_MESSAGE =
  "Tienes un pago pendiente. Para seguir comprando, complétalo o cancélalo desde Mis compras.";

/**
 * Cajón lateral deslizante con el carrito completo y el checkout con Wompi.
 * @param {{ session?: { authenticated: boolean, userId: string | null } }} props
 */
export function CartDrawer({ session = { authenticated: false, userId: null } }) {
  const navigate = useNavigate();
  const cart = useCart();
  const [checkout, setCheckout] = useState({ status: "idle", message: "" });
  const { drawerOpen, closeDrawer, lines, total, hasUnavailable, productsById, refreshPendingStatus, count } = cart;
  const locked = session.authenticated && cart.locked;
  const busy = checkout.status === "creating";

  useEffect(() => {
    if (!drawerOpen) return undefined;
    refreshPendingStatus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen, closeDrawer, refreshPendingStatus]);

  if (!drawerOpen) return null;

  async function pay() {
    if (!session.authenticated) {
      closeDrawer();
      navigate("/login", { state: { from: "/apoyanos-tienda#carrito" } });
      return;
    }
    if (busy) return;
    const tab = reserveCheckoutTab();
    setCheckout({ status: "creating", message: "" });
    try {
      await cart.flush();
      const result = await salesService.checkout();
      const reference = result?.checkout?.reference;
      if (!reference) throw new ApiError("El servidor no devolvió la referencia del pago.");
      savePaymentSession({
        reference,
        kind: "sale",
        ...(session.userId ? { personId: session.userId } : {}),
        summary: lines.map(({ product, quantity }) => `${quantity} × ${product.name}`).join(", "),
        items: (result.sale?.items ?? []).map((item) => ({
          productId: String(item.productId),
          quantity: item.quantity,
        })),
      });
      await cart.refreshPendingStatus();
      const url = checkoutUrlWithReturn(result?.checkout?.paymentUrl, reference);
      if (!isWompiCheckoutUrl(url)) {
        throw new ApiError("El enlace de pago recibido no es válido.");
      }
      if (tab.open(url)) {
        setCheckout({ status: "idle", message: "" });
        closeDrawer();
      } else {
        setCheckout({ status: "blocked", url, message: "" });
      }
    } catch (error) {
      tab.close();
      await cart.refreshPendingStatus();
      setCheckout({ status: "error", message: describeError(error).message });
    }
  }

  return (
    <div className={styles.root}>
      <button type="button" className={styles.backdrop} aria-label="Cerrar carrito" onClick={closeDrawer} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            <Icon name="cart" size={20} />
            <h2 id="cart-drawer-title" className={styles.title}>
              Tu carrito
            </h2>
            {count > 0 ? (
              <span className={styles.units}>
                {count} {count === 1 ? "unidad" : "unidades"}
              </span>
            ) : null}
          </div>
          <button type="button" className={styles.close} aria-label="Cerrar carrito" onClick={closeDrawer}>
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className={styles.body}>
          {locked || cart.error || hasUnavailable || checkout.status === "error" || checkout.status === "blocked" ? (
            <div className={styles.alerts}>
              {locked ? (
                <Alert tone="warning">
                  <span>{LOCKED_MESSAGE}</span>{" "}
                  <Link
                    to={OPERATIONS_PATH}
                    className={buttonClassName({ size: "sm", variant: "outline" })}
                    onClick={closeDrawer}
                  >
                    Ir a Mis compras
                  </Link>
                </Alert>
              ) : null}

              {cart.error ? (
                <Alert tone="error">
                  {cart.error}{" "}
                  <Button variant="outline" size="sm" onClick={cart.retry}>
                    Reintentar
                  </Button>
                </Alert>
              ) : null}

              {hasUnavailable ? (
                <Alert tone="error">Quita del carrito los productos que ya no están disponibles para poder pagar.</Alert>
              ) : null}

              {checkout.status === "error" ? <Alert tone="error">{checkout.message}</Alert> : null}

              {checkout.status === "blocked" ? (
                <Alert tone="info">
                  Tu navegador bloqueó la pestaña de pago.{" "}
                  <a href={checkout.url} target="_blank" rel="noopener noreferrer">
                    Abrir el pago en Wompi
                  </a>
                </Alert>
              ) : null}
            </div>
          ) : null}

          <CartSummary
            embedded
            lines={lines}
            total={total}
            onAdd={(id) => cart.add(id, productsById.get(id)?.stock)}
            onRemove={cart.decrement}
            onDelete={cart.remove}
            onCheckout={pay}
            controlsDisabled={cart.status !== "ready" || locked}
            checkoutDisabled={busy || locked || cart.status !== "ready" || cart.syncing || hasUnavailable}
            checkoutLabel={
              locked
                ? "Pago pendiente"
                : busy
                  ? "Preparando el pago…"
                  : session.authenticated
                    ? "Pagar con Wompi"
                    : "Inicia sesión para comprar"
            }
            note={
              locked
                ? LOCKED_MESSAGE
                : cart.syncing
                  ? "Guardando cambios en tu cuenta…"
                  : cart.enabled
                    ? "Tu carrito se guarda en tu cuenta. El stock se reserva al pagar."
                    : "Tu carrito se guarda en este navegador. Inicia sesión cuando quieras completar la compra."
            }
          />
        </div>
      </aside>
    </div>
  );
}
