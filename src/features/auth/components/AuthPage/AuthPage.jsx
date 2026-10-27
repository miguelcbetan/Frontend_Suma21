import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cx } from "@/core/utils/cx";

import { useAuth } from "../../context/useAuth.js";
import { hasRole } from "../../session.js";
import { LoginForm } from "../LoginForm";
import { RegisterForm } from "../RegisterForm";

import styles from "./AuthPage.module.css";

const TABS = [
  { id: "login", label: "Iniciar sesión", title: "Bienvenido de nuevo" },
  { id: "register", label: "Soy donante nuevo", title: "Crea tu cuenta de donante" },
];

/** Destino tras iniciar sesión: la ruta que pidió el usuario o la de su rol. */
function destinationFor(user, from) {
  if (from) return from;
  return hasRole(user, "ADMIN") ? "/admin" : "/";
}

/** Página `/login`: inicio de sesión y registro de donantes. */
export function AuthPage() {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from;
  const [tab, setTab] = useState("login");
  const active = TABS.find(({ id }) => id === tab);

  if (status === "authenticated") return <Navigate to={destinationFor(user, from)} replace />;

  function handleSuccess(loggedIn) {
    navigate(destinationFor(loggedIn, from), { replace: true });
  }

  return (
    <Container className={styles.page}>
      <Card className={styles.card}>
        <CardHeader>
          <div role="tablist" aria-label="Acceso" className={styles.tabs}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`auth-tab-${id}`}
                aria-selected={tab === id}
                aria-controls="auth-panel"
                className={cx(styles.tab, tab === id && styles.selected)}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody>
          <div role="tabpanel" id="auth-panel" aria-labelledby={`auth-tab-${tab}`} className={styles.panel}>
            <h1 className={styles.title}>{active.title}</h1>
            {tab === "login" ? (
              <LoginForm onSuccess={handleSuccess} />
            ) : (
              <RegisterForm onSuccess={handleSuccess} />
            )}
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
