import { useEffect } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Container } from "@/components/layout/Container";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/ui/Logo";
import { ToastProvider } from "@/components/ui/Toast";
import { TextSizeToggle } from "@/features/accessibility";
import { AdminInKindDonationPage, AdminPage } from "@/features/admin";
import {
  AuthPage,
  AuthProvider,
  DocumentCompletionDialog,
  ProfilePage,
  RequireRole,
  UserMenu,
  isAdmin,
  needsDocumentCompletion,
  useAuth,
} from "@/features/auth";
import { DonationLauncher, InKindDonationPage, SponsorLauncher } from "@/features/donation";
import { HomePage } from "@/features/home";
import { MyDonationsPage, MyPurchasesPage, PaymentResultPage } from "@/features/payment";
import { CartDrawer, CartLink, CartProvider, StorePage, useCart } from "@/features/store";

const PUBLIC_NAV = [
  { label: "Inicio", href: "/" },
  { label: "Tienda", href: "/apoyanos-tienda" },
  { label: "¿Qué puedo donar?", href: "/donaciones-en-especie" },
];

const CUSTOMER_NAV = [
  { label: "Mis compras", href: "/mis-compras" },
  { label: "Mis donaciones", href: "/mis-donaciones" },
];
const ADMIN_NAV = [
  { label: "Donación en especie", href: "/admin/donacion-en-especie" },
  { label: "Panel admin", href: "/admin" },
];

/** Menú según el rol: cliente (DONANTE/CUSTOMER) o administrador. */
function navItemsFor(status, user) {
  if (status !== "authenticated") return PUBLIC_NAV;
  return isAdmin(user) ? [...PUBLIC_NAV, ...ADMIN_NAV] : [...PUBLIC_NAV, ...CUSTOMER_NAV];
}

/** Enlace con la forma `href` que esperan los componentes de layout, resuelto por el router. */
function RouterLink({ href, ...rest }) {
  return <Link to={href} {...rest} />;
}

const SITE_NAME = "SUMA21 by ASISCO";

/** Título de la pestaña del navegador según la ruta. */
const PAGE_TITLES = {
  "/": SITE_NAME,
  "/apoyanos-tienda": "Tienda",
  "/donaciones-en-especie": "¿Qué puedo donar?",
  "/payment-result": "Resultado del pago",
  "/mis-compras": "Mis compras",
  "/mis-donaciones": "Mis donaciones",
  "/login": "Iniciar sesión",
  "/admin": "Panel de administración",
  "/admin/donacion-en-especie": "Registrar donación en especie",
  "/perfil": "Mi perfil",
};

function usePageTitle(pathname) {
  useEffect(() => {
    const title = PAGE_TITLES[pathname] ?? "Página no encontrada";
    document.title = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
  }, [pathname]);
}

function NotFound() {
  return (
    <Container style={{ paddingBlock: "var(--space-8)" }}>
      <EmptyState
        icon="search"
        tone="brand"
        headingLevel={1}
        title="No encontramos esta página"
        description="Puede que el enlace esté incompleto o que la página ya no exista. Te dejamos algunos caminos para continuar."
        actions={
          <>
            <RouterLink href="/" className={buttonClassName()}>
              Ir al inicio
            </RouterLink>
            <RouterLink href="/apoyanos-tienda" className={buttonClassName({ variant: "outline" })}>
              Visitar la tienda
            </RouterLink>
          </>
        }
      />
    </Container>
  );
}

/**
 * El carrito se sincroniza con el servidor solo cuando la cuenta ya completó
 * la verificación de documento; antes, el backend rechaza `/sales/*`.
 */
function CartScope({ children }) {
  const { user } = useAuth();
  const ownerId = user && !needsDocumentCompletion(user) ? (user.id ?? user.email) : null;
  return (
    <CartProvider key={ownerId ?? "guest"} ownerId={ownerId}>
      {children}
    </CartProvider>
  );
}

function Layout() {
  const { pathname } = useLocation();
  const { status, user } = useAuth();
  const cart = useCart();

  const navItems = navItemsFor(status, user);
  const items = navItems.map((item) => ({ ...item, current: item.href === pathname }));
  // El backend toma al comprador o donante del token; el ID solo asocia los pagos guardados en este navegador.
  const session = {
    authenticated: status === "authenticated",
    userId: user ? (user.id ?? user.email) : null,
    name: user?.username ?? "",
  };
  const restoreCart = async (saleItems) => {
    for (const { productId, quantity } of saleItems) {
      await cart.setQuantity(productId, (cart.items[String(productId)] ?? 0) + quantity);
    }
    await cart.flush();
  };
  // Tras pagar, cancelar o consultar operaciones se revisa con el backend el bloqueo del carrito.
  const syncPendingStatus = () => {
    cart.refreshPendingStatus();
  };

  usePageTitle(pathname);

  const header = (
    <SiteHeader
      brand={
        <RouterLink href="/" aria-label="SUMA21 by ASISCO, ir al inicio">
          <Logo />
        </RouterLink>
      }
      items={items}
      linkAs={RouterLink}
      cta={<DonationLauncher session={session} withIcon />}
      actions={
        <>
          <TextSizeToggle />
          <CartLink />
          <UserMenu />
        </>
      }
    />
  );

  const accountLinks = !session.authenticated
    ? [{ label: "Iniciar sesión o crear cuenta", href: "/login" }]
    : [
        { label: "Mi perfil", href: "/perfil" },
        ...(isAdmin(user)
          ? [
              { label: "Donación en especie", href: "/admin/donacion-en-especie" },
              { label: "Panel de administración", href: "/admin" },
            ]
          : [
              { label: "Mis compras", href: "/mis-compras" },
              { label: "Mis donaciones", href: "/mis-donaciones" },
            ]),
      ];

  const footer = (
    <SiteFooter
      brand={
        <>
          <Logo size="md" />
          {/* PENDIENTE DE CONTENIDO: reemplazar por la descripción oficial de SUMA21 y ASISCO. */}
          <p>
            Plataforma de la Asociación de Interés Social Comunitario ASISCO para apoyar, con donaciones y
            compras solidarias, sus programas con jóvenes con síndrome de Down.
          </p>
        </>
      }
      columns={[
        {
          title: "Navegación",
          content: (
            <ul>
              {PUBLIC_NAV.map(({ label, href }) => (
                <li key={href}>
                  <RouterLink href={href}>{label}</RouterLink>
                </li>
              ))}
            </ul>
          ),
        },
        {
          title: "Tu cuenta",
          content: (
            <ul>
              {accountLinks.map(({ label, href }) => (
                <li key={href}>
                  <RouterLink href={href}>{label}</RouterLink>
                </li>
              ))}
            </ul>
          ),
        },
        {
          title: "Accesibilidad",
          content: (
            <ul>
              <li>Tamaño de texto ajustable con los botones A y A+ de la cabecera.</li>
              <li>Navegación completa con teclado y enlace «Saltar al contenido».</li>
            </ul>
          ),
        },
      ]}
      bottom={
        <>
          <p>© {new Date().getFullYear()} ASISCO · ¡No somos Down, somos UP!</p>
          <p>Pagos procesados de forma segura por Wompi.</p>
        </>
      }
    />
  );

  return (
    <>
      <AppShell header={header} footer={footer}>
        <Routes>
        <Route
          path="/"
          element={
            <HomePage
              authenticated={session.authenticated}
              renderDonateButton={(options) => <DonationLauncher session={session} {...options} />}
              renderSponsorButton={(options) => <SponsorLauncher session={session} {...options} />}
            />
          }
        />
        <Route path="/apoyanos-tienda" element={<StorePage session={session} />} />
        <Route path="/donaciones-en-especie" element={<InKindDonationPage />} />
        <Route
          path="/payment-result"
          element={
            <RequireRole>
              <PaymentResultPage onRestoreCart={restoreCart} onStatusChange={syncPendingStatus} />
            </RequireRole>
          }
        />
        <Route
          path="/mis-compras"
          element={
            <RequireRole>
              <MyPurchasesPage onOperationsChange={syncPendingStatus} />
            </RequireRole>
          }
        />
        {/* Rutas anteriores: se conservan para enlaces y marcadores viejos. */}
        <Route path="/mis-operaciones" element={<Navigate to="/mis-compras" replace />} />
        <Route path="/mis-planes" element={<Navigate to="/mis-donaciones?tipo=plan-padrino" replace />} />
        <Route
          path="/mis-donaciones"
          element={
            <RequireRole>
              <MyDonationsPage renderSponsorButton={() => <SponsorLauncher session={session} withIcon />} />
            </RequireRole>
          }
        />
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole requiredRole="ADMIN">
              <AdminPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/donacion-en-especie"
          element={
            <RequireRole requiredRole="ADMIN">
              <AdminInKindDonationPage />
            </RequireRole>
          }
        />
        <Route
          path="/perfil"
          element={
            <RequireRole>
              <ProfilePage />
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
    <CartDrawer session={session} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartScope>
            <Layout />
            {/* Verificación de documento obligatoria tras el login (requiresDocumentCompletion). */}
            <DocumentCompletionDialog />
          </CartScope>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
