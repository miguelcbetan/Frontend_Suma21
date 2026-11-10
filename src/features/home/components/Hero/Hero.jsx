import { Link } from "react-router-dom";

import muralSrc from "@/assets/images/mural.jpeg";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

import styles from "./Hero.module.css";

/** Garantías que la plataforma cumple hoy (pago con Wompi, comprobante y certificado). */
const TRUST = [
  { icon: "lock", text: "Pagos seguros con Wompi" },
  { icon: "receipt", text: "Comprobante de cada operación" },
  { icon: "checkCircle", text: "Certificado de donación" },
];

/**
 * Portada: propósito de SUMA21 y acciones principales.
 * @param {{ donateButton?: import("react").ReactNode }} props
 */
export function Hero({ donateButton }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Container className={styles.inner}>
        <div className={styles.intro}>
          <Badge tone="green">Asociación de Interés Social Comunitario · ASISCO</Badge>
          <h1 id="hero-title" className={styles.title}>
            Súmate a la inclusión de jóvenes con <span className={styles.highlight}>síndrome de Down</span>
          </h1>
        </div>
        <div className={styles.content}>
          {/* PENDIENTE DE CONTENIDO: confirmar la frase oficial de propósito de SUMA21. */}
          <p className={styles.lead}>
            SUMA21 es la plataforma de ASISCO para donar, comprar en la tienda solidaria y aportar los artículos
            que la fundación necesita. Tus aportes apoyan sus programas de formación laboral, arte, barismo
            inclusivo y autonomía.
          </p>
          <div className={styles.actions}>
            {donateButton}
            <Link to="/apoyanos-tienda" className={buttonClassName({ variant: "secondary", size: "lg" })}>
              <Icon name="bag" />
              Visitar la tienda
            </Link>
            <Link to="/donaciones-en-especie" className={buttonClassName({ variant: "outline", size: "lg" })}>
              Donar en especie
            </Link>
          </div>
          <ul className={styles.trust}>
            {TRUST.map(({ icon, text }) => (
              <li key={text}>
                <Icon name={icon} size={18} />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <figure className={styles.media}>
          <img
            src={muralSrc}
            alt="Mural colorido con el lema «¡No somos Down, somos UP!», manos pintadas y un avión de papel"
            width={2383}
            height={900}
            fetchPriority="high"
          />
        </figure>
      </Container>
    </section>
  );
}
