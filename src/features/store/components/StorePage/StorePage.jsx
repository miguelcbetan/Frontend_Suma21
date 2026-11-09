import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Grid } from "@/components/layout/Grid";
import { Section } from "@/components/layout/Section";
import { Alert } from "@/components/ui/Alert";
import { buttonClassName } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Stat } from "@/components/ui/Stat";
import { describeError, productsService, salesService, toList } from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";
import { PAYMENT_RESULT_PATH, openWompiCheckout } from "@/core/utils/wompiWidget";

import { useCart } from "../../cart/useCart.js";
import { CartSummary } from "../CartSummary";
import { ProductCard } from "../ProductCard";

import styles from "./StorePage.module.css";

const IMPACT = [1, 2, 3].map((n) => ({ id: n, value: "[Cifra]", label: "[Descripción]" }));

/** Producto del backend (`GET /api/v1/products`) con los nombres que usa la tienda. */
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
 * Tienda: catálogo de `GET /api/v1/products` (exige sesión), carrito y compra
 * con `POST /api/v1/sales`, que devuelve el checkout de Wompi. El backend toma
 * al comprador del token.
 * @param {{ session?: { authenticated: boolean, userId: string | null } }} props
 */
export function StorePage({ session = { authenticated: false, userId: null } }) {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const cart = useCart();
  const { reconcile } = cart;
  const [catalog, setCatalog] = useState({ status: "loading", products: [], error: "" });
  const [query, setQuery] = useState("");
  const [checkout, setCheckout] = useState({ status: "idle", message: "" });

  useEffect(() => {
    if (!session.authenticated) return undefined;
    let cancelled = false;
    productsService
      .list()
      .then((payload) => {
        if (cancelled) return;
        const products = toList(payload).map(toStoreProduct);
        setCatalog({ status: "ready", products, error: "" });
        reconcile(products);
      })
      .catch((error) => {
        if (!cancelled) setCatalog({ status: "error", products: [], error: describeError(error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [session.authenticated, reconcile]);

  // El enlace «Carrito» de la cabecera apunta a `#carrito`.
  useEffect(() => {
    if (hash === "#carrito" && catalog.status !== "loading") {
      document.getElementById("carrito")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash, catalog.status]);

  if (!session.authenticated) {
    return (
      <Section
        eyebrow="Apóyanos"
        title="Tienda SUMA21"
        description="Cada compra apoya los programas de formación y autonomía de la asociación."
      >
        <div className={styles.gate}>
          <Alert tone="info">Para ver el catálogo y comprar necesitas iniciar sesión con tu cuenta.</Alert>
          <Link to="/login" state={{ from: "/apoyanos-tienda" }} className={buttonClassName({ size: "lg" })}>
            Iniciar sesión o crear cuenta
          </Link>
        </div>
      </Section>
    );
  }

  const { products } = catalog;
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines = Object.entries(cart.items)
    .filter(([id]) => byId.has(id))
    .map(([id, quantity]) => ({ product: byId.get(id), quantity }));
  const total = lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  const term = query.trim().toLowerCase();
  const visible = term
    ? products.filter(({ name, description }) => `${name} ${description}`.toLowerCase().includes(term))
    : products;
  const busy = checkout.status === "creating";

  /** Crea la venta pendiente y abre el widget de Wompi con el checkout del backend. */
  async function pay() {
    setCheckout({ status: "creating", message: "" });
    try {
      const result = await salesService.create({
        items: lines.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
      });
      const { reference } = result.checkout;
      savePaymentSession({
        reference,
        kind: "sale",
        ...(session.userId ? { personId: session.userId } : {}),
        summary: lines.map(({ product, quantity }) => `${quantity} × ${product.name}`).join(", "),
      });
      const mode = await openWompiCheckout(result.checkout, {
        onFinished: () => navigate(`${PAYMENT_RESULT_PATH}?reference=${encodeURIComponent(reference)}`),
      });
      if (mode === "widget") {
        setCheckout({
          status: "waiting",
          message: `Completa el pago en la ventana de Wompi (referencia ${reference}). Si la cerraste sin pagar, puedes consultar el estado en «Mis operaciones».`,
        });
      }
    } catch (error) {
      setCheckout({ status: "error", message: describeError(error).message });
    }
  }

  return (
    <>
      <Section
        eyebrow="Apóyanos"
        title="Tienda SUMA21"
        description="Cada compra apoya los programas de formación y autonomía de la asociación."
      >
        <div className={styles.layout}>
          <div className={styles.catalog}>
            {products.length > 0 ? (
              <Field
                label="Buscar productos"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={styles.search}
              />
            ) : null}
            {catalog.status === "loading" ? <p role="status">Cargando productos…</p> : null}
            {catalog.status === "error" ? <Alert tone="error">{catalog.error}</Alert> : null}
            {catalog.status === "ready" && products.length === 0 ? (
              <p role="status">Por ahora no hay productos disponibles.</p>
            ) : null}
            {products.length > 0 && visible.length === 0 ? <p role="status">Ningún producto coincide con «{query}».</p> : null}
            {visible.length > 0 ? (
              <Grid columns={2}>
                {visible.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantity={cart.items[product.id] ?? 0}
                    onAdd={(id) => cart.add(id, product.stock)}
                  />
                ))}
              </Grid>
            ) : null}
          </div>

          <aside className={styles.aside} aria-label="Carrito de compras">
            {checkout.status === "error" ? <Alert tone="error">{checkout.message}</Alert> : null}
            {checkout.status === "waiting" ? <Alert tone="info">{checkout.message}</Alert> : null}
            <CartSummary
              lines={lines}
              total={total}
              onAdd={(id) => cart.add(id, byId.get(id)?.stock)}
              onRemove={cart.decrement}
              onDelete={cart.remove}
              onCheckout={pay}
              checkoutDisabled={busy}
              checkoutLabel={busy ? "Preparando el pago…" : "Pagar con Wompi"}
              note={
                cart.persistedRemotely
                  ? "Tu carrito se guarda en tu cuenta."
                  : "Tu carrito se guarda en este navegador. El total final lo calcula el servidor con los precios vigentes."
              }
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
