import { Link } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { buttonClassName } from "@/components/ui/Button";

import styles from "./ClosingCta.module.css";

/**
 * Cierre de la portada con la acción principal.
 * @param {{ donateButton?: import("react").ReactNode, authenticated?: boolean }} props
 */
export function ClosingCta({ donateButton, authenticated = false }) {
  return (
    <section className={styles.cta} aria-labelledby="closing-title">
      <Container className={styles.inner}>
        <div className={styles.text}>
          <h2 id="closing-title" className={styles.title}>
            Tu aporte suma
          </h2>
          <p className={styles.lead}>
            Dona, compra en la tienda solidaria o aporta los artículos que la fundación necesita.
          </p>
        </div>
        <div className={styles.actions}>
          {donateButton}
          {authenticated ? (
            <Link to="/apoyanos-tienda" className={buttonClassName({ variant: "outline", size: "lg" })}>
              Visitar la tienda
            </Link>
          ) : (
            <Link to="/login" className={buttonClassName({ variant: "outline", size: "lg" })}>
              Crear mi cuenta
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}
