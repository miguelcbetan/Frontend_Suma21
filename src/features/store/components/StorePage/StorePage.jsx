import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Section } from "@/components/layout/Section";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError, productsService, salesService, toList } from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";
import { PAYMENT_RESULT_PATH, openWompiCheckout } from "@/core/utils/wompiWidget";

import { useCart } from "../../cart/useCart.js";
import { CartSummary } from "../CartSummary";
import { ProductCard } from "../ProductCard";

import styles from "./StorePage.module.css";

/*
 * PENDIENTE DE CONTENIDO: la sección «Lo que logras con tu compra» se ocultó
 * hasta contar con cifras reales de impacto de la tienda.
 */

const STORE_TITLE = "Tienda SUMA21";
const STORE_DESCRIPTION = "Cada compra apoya los programas de formación y autonomía de la asociación.";

const GATE_STEPS = [
  { icon: "user", title: "Inicia sesión o crea tu cuenta", text: "El catálogo está disponible para usuarios registrados." },
  { icon: "cart", title: "Arma tu pedido", text: "Agrega productos al carrito y ajusta las cantidades." },
  { icon: "lock", title: "Paga con Wompi", text: "Completa el pago seguro y consulta el comprobante en «Mis operaciones»." },
];

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

function CatalogSkeleton() {
  return (
    <div className={styles.grid} aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={styles.skeletonCard}>
          <Skeleton height="10rem" radius="lg" />
          <Skeleton height="1.25rem" width="70%" />
          <Skeleton height="1rem" width="40%" />
          <Skeleton height="2.75rem" width="55%" />
        </div>
      ))}
    </div>
  );
}

/** Bienvenida de la tienda para visitantes sin sesión (el catálogo exige token). */
function StoreGate() {
  return (
    <div className={styles.gate}>
      <div className={styles.gateIntro}>
        <span className={styles.gateIcon}>
          <Icon name="bag" size={28} />
        </span>
        <h2 className={styles.gateTitle}>Inicia sesión para ver el catálogo</h2>
        <p className={styles.gateText}>
          Con tu cuenta puedes ver los productos disponibles, armar tu carrito y pagar en línea.
        </p>
        <Link to="/login" state={{ from: "/apoyanos-tienda" }} className={buttonClassName({ size: "lg" })}>
          Iniciar sesión o crear cuenta
        </Link>
      </div>
      <ol className={styles.gateSteps}>
        {GATE_STEPS.map(({ icon, title, text }) => (
          <li key={title}>
            <span className={styles.stepIcon}>
              <Icon name={icon} size={20} />
            </span>
            <div>
              <p className={styles.stepTitle}>{title}</p>
              <p className={styles.stepText}>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
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
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [session.authenticated, reconcile, reloadKey]);

  // El enlace «Carrito» de la cabecera apunta a `#carrito`.
  useEffect(() => {
    if (hash === "#carrito" && catalog.status !== "loading") {
      document.getElementById("carrito")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash, catalog.status]);

  if (!session.authenticated) {
    return (
      <Section eyebrow="Tienda solidaria" title={STORE_TITLE} description={STORE_DESCRIPTION} headingLevel={1}>
        <StoreGate />
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

  function retry() {
    setCatalog({ status: "loading", products: [], error: "" });
    setReloadKey((key) => key + 1);
  }

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
    <Section
      eyebrow="Tienda solidaria"
      title={STORE_TITLE}
      description={STORE_DESCRIPTION}
      headingLevel={1}
      align="start"
    >
      <div className={styles.layout}>
        <div className={styles.catalog}>
          {products.length > 0 ? (
            <div className={styles.toolbar}>
              <Field
                label="Buscar productos"
                type="search"
                placeholder="Nombre o descripción"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={styles.search}
              />
              <p className={styles.resultCount} aria-live="polite">
                {term
                  ? `${visible.length} de ${products.length} productos`
                  : `${products.length} ${products.length === 1 ? "producto" : "productos"}`}
              </p>
            </div>
          ) : null}

          {catalog.status === "loading" ? (
            <>
              <p role="status" className="sr-only">
                Cargando productos…
              </p>
              <CatalogSkeleton />
            </>
          ) : null}

          {catalog.status === "error" ? (
            <EmptyState
              icon="alert"
              tone="danger"
              title="No pudimos cargar los productos"
              description={catalog.error}
              actions={
                <Button variant="outline" onClick={retry}>
                  <Icon name="refresh" size={18} />
                  Reintentar
                </Button>
              }
            />
          ) : null}

          {catalog.status === "ready" && products.length === 0 ? (
            <EmptyState
              icon="bag"
              title="Por ahora no hay productos disponibles"
              description="Vuelve pronto. Mientras tanto, también puedes apoyar con una donación."
            />
          ) : null}

          {products.length > 0 && visible.length === 0 ? (
            <EmptyState
              compact
              icon="search"
              title={`Ningún producto coincide con «${query}»`}
              actions={
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  Limpiar búsqueda
                </Button>
              }
            />
          ) : null}

          {visible.length > 0 ? (
            <div className={styles.grid}>
              {visible.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={cart.items[product.id] ?? 0}
                  onAdd={(id) => cart.add(id, product.stock)}
                />
              ))}
            </div>
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
  );
}
