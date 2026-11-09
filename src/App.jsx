import { useCallback, useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Container } from "@/components/layout/Container";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/ui/Logo";
import { TextSizeToggle } from "@/features/accessibility";
import { AdminPage } from "@/features/admin";
import { AuthPage, AuthProvider, ProfilePage, RequireRole, UserMenu, isAdmin, useAuth } from "@/features/auth";
import { DonationLauncher, InKindDonationPage } from "@/features/donation";
import { HomePage } from "@/features/home";
import { MyOperationsPage, PaymentResultPage } from "@/features/payment";
import { CartLink, CartProvider, StorePage, useCart } from "@/features/store";

const PUBLIC_NAV = [
  { label: "Inicio", href: "/" },
  { label: "Tienda", href: "/apoyanos-tienda" },
  { label: "Donar en especie", href: "/donaciones-en-especie" },
];

const CUSTOMER_NAV = [{ label: "Mis operaciones", href: "/mis-operaciones" }];
const ADMIN_NAV = [{ label: "Panel admin", href: "/admin" }];

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
  "/donaciones-en-especie": "Donar en especie",
  "/payment-result": "Resultado del pago",
  "/mis-operaciones": "Mis operaciones",
  "/login": "Iniciar sesión",
  "/admin": "Panel de administración",
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

function Layout() {
  const { pathname } = useLocation();
  const { status, user } = useAuth();
  const { refresh: refreshCart } = useCart();

  const navItems = navItemsFor(status, user);
  const items = navItems.map((item) => ({ ...item, current: item.href === pathname }));
  // El backend toma al comprador o donante del token; el ID solo asocia los pagos guardados en este navegador.
  const session = {
    authenticated: status === "authenticated",
    userId: user ? (user.id ?? user.email) : null,
    name: user?.username ?? "",
  };

  const handleCartChanged = useCallback(() => refreshCart(), [refreshCart]);
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
        isAdmin(user)
          ? { label: "Panel de administración", href: "/admin" }
          : { label: "Mis operaciones", href: "/mis-operaciones" },
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
    <AppShell header={header} footer={footer}>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              authenticated={session.authenticated}
              renderDonateButton={(options) => <DonationLauncher session={session} {...options} />}
            />
          }
        />
        <Route path="/apoyanos-tienda" element={<StorePage session={session} />} />
        <Route path="/donaciones-en-especie" element={<InKindDonationPage />} />
        <Route
          path="/payment-result"
          element={
            <RequireRole>
              <PaymentResultPage onSaleApproved={handleCartChanged} onCartChanged={handleCartChanged} />
            </RequireRole>
          }
        />
        <Route
          path="/mis-operaciones"
          element={
            <RequireRole>
              <MyOperationsPage userId={session.userId} />
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
  );
}

/** El carrito pertenece al usuario con sesión: se recarga al iniciar o cerrar sesión. */
function CartScope({ children }) {
  const { user } = useAuth();
  return <CartProvider ownerId={user ? (user.id ?? user.email) : null}>{children}</CartProvider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartScope>
          <Layout />
        </CartScope>
      </AuthProvider>
    </BrowserRouter>
  );
}
