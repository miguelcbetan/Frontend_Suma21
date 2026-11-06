import { useEffect, useState } from "react";

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
  resolveCustomer,
  toList,
} from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";

import { BuyerForm } from "../BuyerForm";
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
  };
}

/** Pantalla de la tienda: catálogo de `GET /api/products` y pago con Wompi Sandbox. */
export function StorePage() {
  const [catalog, setCatalog] = useState({ status: "loading", products: [], error: "" });
  const [cart, setCart] = useState({});
  const [buying, setBuying] = useState(false);

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

  function add(id) {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  }

  function remove(id) {
    setCart((current) => {
      const { [id]: quantity = 0, ...rest } = current;
      return quantity > 1 ? { ...rest, [id]: quantity - 1 } : rest;
    });
  }

  /** Crea el cliente (si hace falta) y el enlace de pago, y envía al comprador a Wompi. */
  async function pay(buyer) {
    const customer = await resolveCustomer(buyer);
    const checkout = await paymentsService.createCheckout({
      kind: "sale",
      customer_id: String(customer.id),
      payment_method_id: WOMPI_PAYMENT_METHOD_ID,
      account_id: WOMPI_ACCOUNT_ID,
      items: lines.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
    });
    savePaymentSession({ reference: checkout.reference, kind: "sale", personId: String(customer.id) });
    window.location.assign(checkout.checkout_url);
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
            <CartSummary
              lines={lines}
              total={total}
              onAdd={add}
              onRemove={remove}
              onCheckout={() => setBuying(true)}
              checkoutDisabled={buying}
            />
            {buying && lines.length > 0 ? (
              <BuyerForm onSubmit={pay} onCancel={() => setBuying(false)} />
            ) : null}
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
