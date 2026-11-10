import { Navigate, useLocation, useNavigate } from "react-router-dom";

import muralSrc from "@/assets/images/mural.jpeg";
import { Container } from "@/components/layout/Container";
import { Icon } from "@/components/ui/Icon";

import { useAuth } from "../../context/useAuth.js";
import { isAdmin } from "../../session.js";
import { LoginForm } from "../LoginForm";

import styles from "./AuthPage.module.css";

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

/** Página `/login`: inicio de sesión. El registro de usuarios lo gestiona otro equipo. */
export function AuthPage() {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from;

  if (status === "authenticated") return <Navigate to={destinationFor(user, from)} replace />;

  function handleSuccess(loggedIn) {
    navigate(destinationFor(loggedIn, from), { replace: true });
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
          <div className={styles.panel}>
            <div className={styles.heading}>
              <h1 className={styles.title}>Hola de nuevo</h1>
              <p className={styles.subtitle}>Ingresa con el correo y la contraseña de tu cuenta.</p>
            </div>
            <LoginForm onSuccess={handleSuccess} />
          </div>
        </div>
      </div>
    </Container>
  );
}
