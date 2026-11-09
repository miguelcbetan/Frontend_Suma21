import { Link, Navigate, useLocation } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { Button, buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

import { useAuth } from "../../context/useAuth.js";
import { hasRole } from "../../session.js";

import styles from "./RequireRole.module.css";

/**
 * Protege una ruta: exige sesión y, si se indica, el rol requerido.
 * @param {{ requiredRole?: string, children: import("react").ReactNode }} props
 */
export function RequireRole({ requiredRole, children }) {
  const { status, user, logout } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <Container className={styles.container}>
        <p role="status" className="sr-only">
          Verificando tu sesión…
        </p>
        <div className={styles.loading} aria-hidden="true">
          <Skeleton height="2.25rem" width="40%" />
          <Skeleton height="1rem" width="65%" />
          <Skeleton height="12rem" radius="lg" />
        </div>
      </Container>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole && !hasRole(user, requiredRole)) {
    return (
      <Container className={styles.container}>
        <EmptyState
          icon="lock"
          tone="danger"
          headingLevel={1}
          title="No tienes permisos para ver esta sección"
          description="Si crees que es un error, cierra sesión e ingresa con una cuenta de administración."
          actions={
            <>
              <Link to="/" className={buttonClassName()}>
                Ir al inicio
              </Link>
              <Button variant="outline" onClick={logout}>
                Cerrar sesión
              </Button>
            </>
          }
        />
      </Container>
    );
  }

  return children;
}
