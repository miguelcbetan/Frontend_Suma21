import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Section } from "@/components/layout/Section";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, describeError, productsService, salesService, toList } from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";
import { checkoutUrlWithReturn, isWompiCheckoutUrl, reserveCheckoutTab } from "@/core/utils/wompiWidget";

import { useCart } from "../../cart/useCart.js";
import { CartSummary } from "../CartSummary";
import { ProductCard } from "../ProductCard";

import styles from "./StorePage.module.css";

/*
 * PENDIENTE DE CONTENIDO: la sección «Lo que logras con tu compra» se ocultó
 * hasta contar con cifras reales de impacto de la tienda.
 */

const OPERATIONS_PATH = "/mis-compras";
const LOCKED_MESSAGE =
  "Tienes un pago pendiente. Para seguir comprando, complétalo o cancélalo desde Mis compras.";

const STORE_TITLE = "Tienda SUMA21";
const STORE_DESCRIPTION = "Cada compra apoya los programas de formación y autonomía de la asociación.";

const SORT_COMPARATORS = {
  name: (a, b) => a.name.localeCompare(b.name, "es"),
  "price-asc": (a, b) => a.price - b.price || a.name.localeCompare(b.name, "es"),
  "price-desc": (a, b) => b.price - a.price || a.name.localeCompare(b.name, "es"),
  "stock-desc": (a, b) => b.stock - a.stock || a.name.localeCompare(b.name, "es"),
};

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

/**
 * Tienda: catálogo público, carrito local y checkout autenticado. Al iniciar el
 * pago sincroniza el carrito con el backend, reserva stock y abre Wompi en otra pestaña.
 * @param {{ session?: { authenticated: boolean, userId: string | null } }} props
 */
export function StorePage({ session = { authenticated: false, userId: null } }) {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const cart = useCart();
  const [catalog, setCatalog] = useState({ status: "loading", products: [], error: "" });
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [checkout, setCheckout] = useState({ status: "idle", message: "" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    productsService
      .list()
      .then((payload) => {
        if (cancelled) return;
        const products = toList(payload).map(toStoreProduct);
        setCatalog({ status: "ready", products, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setCatalog({ status: "error", products: [], error: describeError(error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Al entrar a la tienda se confirma con el backend si hay un pago pendiente.
  const { refresh: refreshCart, refreshPendingStatus } = cart;
  useEffect(() => {
    refreshPendingStatus();
  }, [refreshPendingStatus]);

  // Al volver a esta pestaña (p. ej. tras pagar en la pestaña de Wompi),
  // sincronizamos tanto el bloqueo como el catálogo. El catálogo puede cambiar
  // porque el checkout reservó stock y un pago aprobado debe dejarlo agotado.
  useEffect(() => {
    const syncAfterCheckout = () => {
      if (document.visibilityState !== "visible") return;
      refreshPendingStatus().then((blocked) => {
        if (!blocked) refreshCart();
      });
      setReloadKey((key) => key + 1);
    };

    document.addEventListener("visibilitychange", syncAfterCheckout);
    window.addEventListener("focus", syncAfterCheckout);
    window.addEventListener("pageshow", syncAfterCheckout);
    return () => {
      document.removeEventListener("visibilitychange", syncAfterCheckout);
      window.removeEventListener("focus", syncAfterCheckout);
      window.removeEventListener("pageshow", syncAfterCheckout);
    };
  }, [refreshCart, refreshPendingStatus]);

  // El enlace «Carrito» de la cabecera apunta a `#carrito`.
  useEffect(() => {
    if (hash === "#carrito" && catalog.status !== "loading") {
      document.getElementById("carrito")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash, catalog.status]);

  const { products } = catalog;
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines =
    catalog.status === "ready"
      ? Object.entries(cart.items).map(([id, quantity]) => ({
          product: byId.get(id) ?? {
            id,
            name: `Producto #${id} · no disponible`,
            price: 0,
            stock: 0,
          },
          quantity,
          unavailable: !byId.has(id),
        }))
      : [];
  const total = lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  const hasUnavailable = lines.some((line) => line.unavailable);
  const term = query.trim().toLowerCase();
  const minPriceValue = minPrice === "" ? null : Number(minPrice);
  const maxPriceValue = maxPrice === "" ? null : Number(maxPrice);
  const hasActiveFilters =
    Boolean(term) || availability !== "all" || minPrice !== "" || maxPrice !== "" || sortBy !== "name";

  const visible = products
    .filter((product) => {
      if (term && !`${product.name} ${product.description}`.toLowerCase().includes(term)) return false;
      if (availability === "low" && product.stock > 5) return false;
      if (availability === "plenty" && product.stock <= 5) return false;
      if (minPriceValue !== null && Number.isFinite(minPriceValue) && product.price < minPriceValue) return false;
      if (maxPriceValue !== null && Number.isFinite(maxPriceValue) && product.price > maxPriceValue) return false;
      return true;
    })
    .slice()
    .sort(SORT_COMPARATORS[sortBy] ?? SORT_COMPARATORS.name);

  function clearFilters() {
    setQuery("");
    setAvailability("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name");
  }

  const busy = checkout.status === "creating";
  const locked = session.authenticated && cart.locked;

  function retry() {
    setCatalog({ status: "loading", products: [], error: "" });
    setReloadKey((key) => key + 1);
  }

  /**
   * Requiere sesión, espera la sincronización del carrito y crea el checkout
   * (`POST /sales/checkout`). El enlace de pago (`checkout.paymentUrl`) se abre
   * en una pestaña aparte; esta pestaña sigue en la tienda.
   */
  async function pay() {
    if (!session.authenticated) {
      navigate("/login", { state: { from: "/apoyanos-tienda#carrito" } });
      return;
    }
    if (busy) return;
    // La pestaña se abre en el mismo clic para que el navegador no la bloquee.
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
        items: (result.sale?.items ?? []).map((item) => ({ productId: String(item.productId), quantity: item.quantity })),
      });
      cart.refresh();
      cart.refreshPendingStatus();

      const paymentUrl = result?.checkout?.paymentUrl;
      if (!isWompiCheckoutUrl(paymentUrl)) {
        throw new ApiError(
          "Tu compra quedó registrada, pero no recibimos el enlace de pago. Continúa el pago desde Mis compras.",
        );
      }
      const url = checkoutUrlWithReturn(paymentUrl, reference);
      if (tab.go(url)) {
        setCheckout({ status: "idle", message: "" });
      } else {
        setCheckout({ status: "blocked", message: "", url });
      }
    } catch (error) {
      tab.close();
      if (error?.code === "PENDING_CHECKOUT_CONFLICT") {
        // El backend confirma que hay un pago pendiente: se activa el bloqueo.
        cart.refreshPendingStatus();
        setCheckout({ status: "idle", message: "" });
        return;
      }
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
      {locked ? (
        <div className={styles.lockNotice} role="status">
          <span className={styles.lockIcon}>
            <Icon name="clock" size={22} />
          </span>
          <div className={styles.lockText}>
            <p className={styles.lockTitle}>Tienes un pago pendiente</p>
            <p>
              Para seguir agregando productos, primero completa o cancela ese pago desde Mis compras. Cuando lo
              resuelvas, tu carrito volverá a funcionar con normalidad.
            </p>
          </div>
          <Link to={OPERATIONS_PATH} className={buttonClassName({ size: "sm" })}>
            Ir a Mis compras
          </Link>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.catalog}>
          {products.length > 0 ? (
            <div className={styles.filtersCard}>
              <div className={styles.toolbar}>
                <Field
                  label="Buscar productos"
                  type="search"
                  placeholder="Nombre o descripción"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={styles.search}
                />
                <div className={styles.toolbarMeta}>
                  <p className={styles.resultCount} aria-live="polite">
                    {hasActiveFilters
                      ? `${visible.length} de ${products.length} productos`
                      : `${products.length} ${products.length === 1 ? "producto" : "productos"}`}
                  </p>
                  {hasActiveFilters ? (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className={styles.filterGrid}>
                <Field
                  as="select"
                  label="Disponibilidad"
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="low">Últimas unidades (≤ 5)</option>
                  <option value="plenty">Stock amplio (&gt; 5)</option>
                </Field>
                <Field
                  label="Precio mínimo (COP)"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
                <Field
                  label="Precio máximo (COP)"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Sin límite"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
                <Field
                  as="select"
                  label="Ordenar por"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="name">Nombre (A–Z)</option>
                  <option value="price-asc">Menor precio</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="stock-desc">Mayor disponibilidad</option>
                </Field>
              </div>
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
              title={term ? `Ningún producto coincide con «${query}»` : "Ningún producto coincide con los filtros"}
              description="Ajusta el rango de precio o la disponibilidad para ver más resultados."
              actions={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpiar filtros
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
                  disabled={cart.status !== "ready" || locked}
                  disabledLabel={locked ? "Pago pendiente" : undefined}
                />
              ))}
            </div>
          ) : null}
        </div>

        <aside className={styles.aside} aria-label="Carrito de compras">
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
          <CartSummary
            lines={lines}
            total={total}
            onAdd={(id) => cart.add(id, byId.get(id)?.stock)}
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
        </aside>
      </div>
    </Section>
  );
}
