import { Navigate, useLocation } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { Alert } from "@/components/ui/Alert";

import { useAuth } from "../../context/useAuth.js";
import { hasRole } from "../../session.js";

import styles from "./RequireRole.module.css";

/**
 * Protege una ruta: exige sesión y, si se indica, el rol requerido.
 * @param {{ requiredRole?: string, children: import("react").ReactNode }} props
 */
export function RequireRole({ requiredRole, children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <Container className={styles.container}>
        <p role="status">Verificando tu sesión…</p>
      </Container>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole && !hasRole(user, requiredRole)) {
    return (
      <Container className={styles.container}>
        <Alert tone="error">
          No tienes permisos para ver esta sección. Si crees que es un error, cierra sesión e ingresa con una
          cuenta de administración.
        </Alert>
      </Container>
    );
  }

  return children;
}
