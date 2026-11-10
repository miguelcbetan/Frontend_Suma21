import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import muralSrc from "@/assets/images/mural.jpeg";
import { Container } from "@/components/layout/Container";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/core/utils/cx";

import { useAuth } from "../../context/useAuth.js";
import { isAdmin } from "../../session.js";
import { LoginForm } from "../LoginForm";
import { RegisterForm } from "../RegisterForm";

import styles from "./AuthPage.module.css";

const TABS = [
  {
    id: "login",
    label: "Iniciar sesión",
    title: "Hola de nuevo",
    subtitle: "Ingresa con el correo y la contraseña de tu cuenta.",
  },
  {
    id: "register",
    label: "Crear cuenta",
    title: "Crea tu cuenta",
    subtitle: "Regístrate para comprar en la tienda y hacer donaciones.",
  },
];

/** Lo que la cuenta permite hacer hoy en la plataforma. */
const BENEFITS = [
  { icon: "bag", text: "Comprar en la tienda solidaria" },
  { icon: "heart", text: "Donar en línea y obtener tu certificado" },
  { icon: "receipt", text: "Consultar el estado de tus pagos" },
];

/** Destino tras iniciar sesión: la ruta que pidió el usuario o la de su rol. */
function destinationFor(user, from) {
  if (from) return from;
  return isAdmin(user) ? "/admin" : "/apoyanos-tienda";
}

/** Página `/login`: inicio de sesión y registro de clientes (DONANTE). */
export function AuthPage() {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const [tab, setTab] = useState(location.state?.tab === "register" ? "register" : "login");
  const active = TABS.find(({ id }) => id === tab);

  if (status === "authenticated") return <Navigate to={destinationFor(user, from)} replace />;

  function handleSuccess(loggedIn) {
    navigate(destinationFor(loggedIn, from), { replace: true });
  }

  /** Navegación por teclado entre pestañas (flechas, Inicio y Fin). */
  function handleTabKeyDown(event) {
    const index = TABS.findIndex(({ id }) => id === tab);
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = TABS[(moves[event.key] + TABS.length) % TABS.length];
    setTab(next.id);
    document.getElementById(`auth-tab-${next.id}`)?.focus();
  }

  return (
    <Container className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.brand} aria-label="Beneficios de tu cuenta">
          <img src={muralSrc} alt="" className={styles.brandImage} />
          <div className={styles.brandContent}>
            <p className={styles.brandEyebrow}>SUMA21 by ASISCO</p>
            <p className={styles.brandTitle}>Con tu cuenta puedes:</p>
            <ul className={styles.benefits}>
              {BENEFITS.map(({ icon, text }) => (
                <li key={text}>
                  <span className={styles.benefitIcon}>
                    <Icon name={icon} size={18} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className={styles.formSide}>
          <div role="tablist" aria-label="Acceso a tu cuenta" className={styles.tabs}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`auth-tab-${id}`}
                aria-selected={tab === id}
                aria-controls="auth-panel"
                tabIndex={tab === id ? 0 : -1}
                className={cx(styles.tab, tab === id && styles.selected)}
                onClick={() => setTab(id)}
                onKeyDown={handleTabKeyDown}
              >
                {label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="auth-panel" aria-labelledby={`auth-tab-${tab}`} className={styles.panel}>
            <div className={styles.heading}>
              <h1 className={styles.title}>{active.title}</h1>
              <p className={styles.subtitle}>{active.subtitle}</p>
            </div>
            {tab === "login" ? (
              <LoginForm key="login" onSuccess={handleSuccess} />
            ) : (
              <RegisterForm key="register" onSuccess={handleSuccess} />
            )}
            <p className={styles.switch}>
              {tab === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"}{" "}
              <button
                type="button"
                className={styles.switchButton}
                onClick={() => setTab(tab === "login" ? "register" : "login")}
              >
                {tab === "login" ? "Crear cuenta" : "Iniciar sesión"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
