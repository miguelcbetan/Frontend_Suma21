import { useCallback } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Section } from "@/components/layout/Section";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { buttonClassName } from "@/components/ui/Button";
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
  { label: "Semana Down", href: "/semana-down" },
  { label: "Iniciativa Café", href: "/iniciativa-cafe" },
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

function ComingSoon() {
  return (
    <Section
      title="Próximamente"
      description="Estamos preparando esta sección. Mientras tanto, puedes conocer el resto del sitio."
    >
      <RouterLink href="/" className={buttonClassName({ variant: "secondary" })}>
        Volver al inicio
      </RouterLink>
    </Section>
  );
}

function Layout() {
  const { pathname } = useLocation();
  const { status, user } = useAuth();
  const { clear: clearCart } = useCart();

  const navItems = navItemsFor(status, user);
  const items = navItems.map((item) => ({ ...item, current: item.href === pathname }));
  // El backend toma al comprador o donante del token; el ID solo asocia los pagos guardados en este navegador.
  const session = {
    authenticated: status === "authenticated",
    userId: user ? (user.id ?? user.email) : null,
    name: user?.username ?? "",
  };

  const handleSaleApproved = useCallback(() => clearCart(), [clearCart]);

  const header = (
    <SiteHeader
      brand={
        <RouterLink href="/" aria-label="SUMA21 by ASISCO, ir al inicio">
          <Logo />
        </RouterLink>
      }
      items={items}
      linkAs={RouterLink}
      leading={<DonationLauncher session={session} />}
      actions={
        <>
          <CartLink />
          <UserMenu />
          <TextSizeToggle />
        </>
      }
    />
  );

  const footer = (
    <SiteFooter
      brand={
        <>
          <Logo size="lg" />
          <p>[Descripción breve de la asociación]</p>
        </>
      }
      columns={[
        {
          title: "Navegación",
          content: (
            <ul>
              {navItems.map(({ label, href }) => (
                <li key={href}>
                  <RouterLink href={href}>{label}</RouterLink>
                </li>
              ))}
            </ul>
          ),
        },
        { title: "Contacto", content: <p>[Datos de contacto]</p> },
        { title: "Accesibilidad", content: <p>[Información de accesibilidad]</p> },
      ]}
      bottom={<p>© {new Date().getFullYear()} ASISCO</p>}
    />
  );

  return (
    <AppShell header={header} footer={footer}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/apoyanos-tienda" element={<StorePage session={session} />} />
        <Route path="/donaciones-en-especie" element={<InKindDonationPage session={session} />} />
        <Route
          path="/payment-result"
          element={
            <RequireRole>
              <PaymentResultPage onSaleApproved={handleSaleApproved} />
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
        <Route path="*" element={<ComingSoon />} />
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
