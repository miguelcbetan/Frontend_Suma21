import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { Section } from "@/components/layout/Section";
import { Button, buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { SortMenu } from "@/components/ui/SortMenu";
import { describeError, productsService, toList } from "@/core/api";
import { cx } from "@/core/utils/cx";

import { useCart } from "../../cart/useCart.js";
import { ProductCard } from "../ProductCard";

import styles from "./StorePage.module.css";

/*
 * PENDIENTE DE CONTENIDO: la sección «Lo que logras con tu compra» se ocultó
 * hasta contar con cifras reales de impacto de la tienda.
 */

const OPERATIONS_PATH = "/mis-compras";

const STORE_TITLE = "Tienda SUMA21";
const STORE_DESCRIPTION = "Cada compra apoya los programas de formación y autonomía de la asociación.";

const SORT_OPTIONS = [
  { value: "name", label: "Ordenar: Nombre" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "stock-desc", label: "Mayor disponibilidad" },
];

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
 * Tienda: catálogo público a ancho completo; el carrito vive en la cabecera
 * (hover con resumen y clic para abrir el cajón lateral).
 * @param {{ session?: { authenticated: boolean, userId: string | null } }} props
 */
export function StorePage({ session = { authenticated: false, userId: null } }) {
  const { hash } = useLocation();
  const cart = useCart();
  const searchId = useId();
  const priceWrapRef = useRef(null);
  const [catalog, setCatalog] = useState({ status: "loading", products: [], error: "" });
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [priceOpen, setPriceOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { refresh: refreshCart, refreshPendingStatus, setCatalogProducts, openDrawer } = cart;

  useEffect(() => {
    let cancelled = false;
    productsService
      .list()
      .then((payload) => {
        if (cancelled) return;
        const products = toList(payload).map(toStoreProduct);
        setCatalog({ status: "ready", products, error: "" });
        setCatalogProducts(products);
      })
      .catch((error) => {
        if (!cancelled) setCatalog({ status: "error", products: [], error: describeError(error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, setCatalogProducts]);

  // Al entrar a la tienda se confirma con el backend si hay un pago pendiente.
  useEffect(() => {
    refreshPendingStatus();
  }, [refreshPendingStatus]);

  // Al volver a esta pestaña (p. ej. tras pagar en Wompi), se sincroniza estado y catálogo.
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

  // Si llega con `#carrito` (p. ej. tras iniciar sesión), abre el cajón del carrito.
  useEffect(() => {
    if (hash === "#carrito") openDrawer();
  }, [hash, openDrawer]);

  useEffect(() => {
    if (!priceOpen) return undefined;
    function onPointerDown(event) {
      if (priceWrapRef.current && !priceWrapRef.current.contains(event.target)) {
        setPriceOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setPriceOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [priceOpen]);

  const { products } = catalog;
  const term = query.trim().toLowerCase();
  const minPriceValue = minPrice === "" ? null : Number(minPrice);
  const maxPriceValue = maxPrice === "" ? null : Number(maxPrice);
  const hasPriceFilter = minPrice !== "" || maxPrice !== "";
  const hasActiveFilters = Boolean(term) || hasPriceFilter || sortBy !== "name";

  const visible = products
    .filter((product) => {
      if (term && !`${product.name} ${product.description}`.toLowerCase().includes(term)) return false;
      if (minPriceValue !== null && Number.isFinite(minPriceValue) && product.price < minPriceValue) return false;
      if (maxPriceValue !== null && Number.isFinite(maxPriceValue) && product.price > maxPriceValue) return false;
      return true;
    })
    .slice()
    .sort(SORT_COMPARATORS[sortBy] ?? SORT_COMPARATORS.name);

  function clearFilters() {
    setQuery("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name");
    setPriceOpen(false);
  }

  function retry() {
    setCatalog({ status: "loading", products: [], error: "" });
    setReloadKey((key) => key + 1);
  }

  const locked = session.authenticated && cart.locked;

  return (
    <Section eyebrow="Tienda solidaria" title={STORE_TITLE} description={STORE_DESCRIPTION} headingLevel={1}>
      {locked ? (
        <div className={styles.lockNotice} role="status">
          <span className={styles.lockIcon} aria-hidden="true">
            <Icon name="clock" size={20} />
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

      <div className={styles.catalog}>
        {products.length > 0 ? (
          <div className={styles.toolbarWrap}>
            <div className={styles.toolbar}>
              <div className={styles.searchWrap}>
                <label htmlFor={searchId} className="sr-only">
                  Buscar productos
                </label>
                <Icon name="search" size={17} className={styles.searchIcon} />
                <input
                  id={searchId}
                  type="search"
                  className={styles.searchInput}
                  placeholder="Buscar productos…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <div className={styles.rightControls}>
                <div className={styles.popoverWrap} ref={priceWrapRef}>
                  <button
                    type="button"
                    aria-expanded={priceOpen}
                    className={cx(styles.controlBtn, hasPriceFilter && styles.controlBtnActive)}
                    onClick={() => setPriceOpen((open) => !open)}
                  >
                    <Icon name="sliders" size={16} />
                    <span>Precio</span>
                    {hasPriceFilter ? <span className={styles.activeDot} aria-hidden="true" /> : null}
                  </button>

                  {priceOpen ? (
                    <div className={styles.popover} role="dialog" aria-label="Filtrar por rango de precio">
                      <div className={styles.popoverGrid}>
                        <Field
                          label="Mínimo (COP)"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={minPrice}
                          onChange={(event) => setMinPrice(event.target.value)}
                        />
                        <Field
                          label="Máximo (COP)"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Sin límite"
                          value={maxPrice}
                          onChange={(event) => setMaxPrice(event.target.value)}
                        />
                      </div>
                      <div className={styles.popoverActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMinPrice("");
                            setMaxPrice("");
                          }}
                        >
                          Limpiar
                        </Button>
                        <Button size="sm" onClick={() => setPriceOpen(false)}>
                          Listo
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <SortMenu
                  label="Ordenar productos"
                  options={SORT_OPTIONS}
                  value={sortBy}
                  onChange={setSortBy}
                />
              </div>
            </div>

            <div className={styles.metaRow}>
              <p className={styles.resultCount} aria-live="polite">
                {hasActiveFilters
                  ? `${visible.length} de ${products.length} productos`
                  : `${products.length} ${products.length === 1 ? "producto" : "productos"}`}
              </p>
              {hasActiveFilters ? (
                <button type="button" className={styles.clearLink} onClick={clearFilters}>
                  Limpiar filtros
                </button>
              ) : null}
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
            description="Prueba ajustando el rango de precio."
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
    </Section>
  );
}
