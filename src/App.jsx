import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Section } from "@/components/layout/Section";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TopBar } from "@/components/layout/TopBar";
import { buttonClassName } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { TextSizeToggle } from "@/features/accessibility";
import { AdminPage } from "@/features/admin";
import { AuthPage, AuthProvider, RequireRole, UserMenu, useAuth } from "@/features/auth";
import { DonationLauncher } from "@/features/donation";
import { HomePage } from "@/features/home";

const NAV_ITEMS = [
  { label: "Inicio", href: "/" },
  { label: "Semana Down", href: "/semana-down" },
  { label: "Iniciativa Café", href: "/iniciativa-cafe" },
  { label: "Apóyanos / Tienda", href: "/apoyanos-tienda" },
  { label: "Acceso Admin", href: "/admin" },
];

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

  const items = NAV_ITEMS.map((item) => ({ ...item, current: item.href === pathname }));
  const donationSession = { authenticated: status === "authenticated", donorId: user?.donorId ?? null };

  const header = (
    <>
      <TopBar>
        <span>Modo accesibilidad</span>
        <span>Lectura fácil</span>
      </TopBar>
      <SiteHeader
        brand={
          <RouterLink href="/" aria-label="SUMA21 by ASISCO, ir al inicio">
            <Logo />
          </RouterLink>
        }
        items={items}
        linkAs={RouterLink}
        leading={<DonationLauncher session={donationSession} />}
        actions={
          <>
            <UserMenu />
            <TextSizeToggle />
          </>
        }
      />
    </>
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
              {NAV_ITEMS.map(({ label, href }) => (
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
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole requiredRole="ADMIN">
              <AdminPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}
