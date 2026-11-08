import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Grid } from "@/components/layout/Grid";
import { Section } from "@/components/layout/Section";
import { Alert } from "@/components/ui/Alert";
import { Stat } from "@/components/ui/Stat";
import {
  WOMPI_ACCOUNT_ID,
  WOMPI_PAYMENT_METHOD_ID,
  describeError,
  paymentsService,
  productsService,
  toList,
} from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";

import { CartSummary } from "../CartSummary";
import { ProductCard } from "../ProductCard";

import styles from "./StorePage.module.css";

const IMPACT = [1, 2, 3].map((n) => ({ id: n, value: "[Cifra]", label: "[Descripción]" }));

/** Producto del backend (`GET /api/products`) con los nombres que usa la tienda. */
function toStoreProduct(record) {
  return {
    id: String(record.id),
    name: record.name,
    description: record.description ?? "",
    price: Number(record.unit_price),
    stock: Number(record.stock_qty ?? 0),
    imageUrl: record.image_url ?? null,
  };
}

/**
 * Pantalla de la tienda: catálogo de `GET /api/products` y pago con Wompi Sandbox.
 * `session.donorId` es el ID del usuario con sesión iniciada, que el backend
 * registra como `customer_id` de la venta.
 * @param {{ session?: { authenticated: boolean, donorId: string | null } }} props
 */
export function StorePage({ session = { authenticated: false, donorId: null } }) {
  const [catalog, setCatalog] = useState({ status: "loading", products: [], error: "" });
  const [cart, setCart] = useState({});
  const [paying, setPaying] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    let cancelled = false;
    productsService
      .list()
      .then((payload) => {
        if (!cancelled) setCatalog({ status: "ready", products: toList(payload).map(toStoreProduct), error: "" });
      })
      .catch((error) => {
        if (!cancelled) setCatalog({ status: "error", products: [], error: describeError(error).message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { products } = catalog;
  const lines = products.filter(({ id }) => cart[id]).map((product) => ({ product, quantity: cart[product.id] }));
  const total = lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  const canPay = session.authenticated && Boolean(session.donorId);

  function add(id) {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  }

  function remove(id) {
    setCart((current) => {
      const { [id]: quantity = 0, ...rest } = current;
      return quantity > 1 ? { ...rest, [id]: quantity - 1 } : rest;
    });
  }

  /** Crea la venta pendiente y el enlace de pago, y envía al comprador a Wompi. */
  async function pay() {
    setPaying(true);
    setCheckoutError("");
    try {
      const checkout = await paymentsService.createCheckout({
        kind: "sale",
        customer_id: session.donorId,
        payment_method_id: WOMPI_PAYMENT_METHOD_ID,
        account_id: WOMPI_ACCOUNT_ID,
        items: lines.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
      });
      savePaymentSession({ reference: checkout.reference, kind: "sale", personId: session.donorId });
      window.location.assign(checkout.checkout_url);
    } catch (error) {
      setCheckoutError(describeError(error).message);
      setPaying(false);
    }
  }

  return (
    <>
      <Section
        eyebrow="Apóyanos"
        title="Tienda SUMA21"
        description="[Descripción breve de la tienda y de cómo cada compra apoya a la asociación]"
      >
        <div className={styles.layout}>
          <div>
            {catalog.status === "loading" ? <p role="status">Cargando productos…</p> : null}
            {catalog.status === "error" ? <Alert tone="error">{catalog.error}</Alert> : null}
            {catalog.status === "ready" && products.length === 0 ? (
              <p role="status">Por ahora no hay productos disponibles.</p>
            ) : null}
            {products.length > 0 ? (
              <Grid columns={2}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} quantity={cart[product.id] ?? 0} onAdd={add} />
                ))}
              </Grid>
            ) : null}
          </div>

          <aside className={styles.aside} aria-label="Resumen del pedido">
            {!session.authenticated ? (
              <Alert tone="info">
                Para pagar tu pedido <Link to="/login">inicia sesión o crea tu cuenta</Link>.
              </Alert>
            ) : null}
            {session.authenticated && !session.donorId ? (
              <Alert tone="error">
                Tu cuenta no tiene un identificador de usuario disponible para registrar la compra. Contacta a
                ASISCO.
              </Alert>
            ) : null}
            {checkoutError ? <Alert tone="error">{checkoutError}</Alert> : null}
            <CartSummary
              lines={lines}
              total={total}
              onAdd={add}
              onRemove={remove}
              onCheckout={pay}
              checkoutDisabled={!canPay || paying}
              checkoutLabel={paying ? "Preparando el pago…" : undefined}
            />
          </aside>
        </div>
      </Section>

      <Section
        eyebrow="Impacto"
        title="Lo que logras con tu compra"
        description="[Descripción breve del impacto de la tienda]"
        tone="muted"
      >
        <Grid columns={3}>
          {IMPACT.map(({ id, value, label }) => (
            <Stat key={id} value={value} label={label} />
          ))}
        </Grid>
      </Section>
    </>
  );
}
