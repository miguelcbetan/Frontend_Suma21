import { Section } from "@/components/layout/Section";
import { Icon } from "@/components/ui/Icon";

import styles from "./HowItWorksSection.module.css";

const STEPS = [
  {
    icon: "user",
    title: "Crea tu cuenta",
    description: "Regístrate con tu correo o inicia sesión. La necesitas para comprar, donar y consultar tus pagos.",
  },
  {
    icon: "heart",
    title: "Elige cómo aportar",
    description: "Haz una donación monetaria o agrega productos de la tienda solidaria a tu carrito.",
  },
  {
    icon: "receipt",
    title: "Paga y consulta tu comprobante",
    description: "Completa el pago con Wompi y revisa el estado y el comprobante de cada operación en «Mis operaciones».",
  },
];

/** Pasos reales para aportar desde la plataforma. */
export function HowItWorksSection() {
  return (
    <Section
      eyebrow="Cómo funciona"
      title="Aportar toma pocos minutos"
      description="El proceso es el mismo para donaciones y compras."
      tone="muted"
    >
      <ol className={styles.steps}>
        {STEPS.map(({ icon, title, description }, index) => (
          <li key={title} className={styles.step}>
            <div className={styles.marker}>
              <span className={styles.number}>{index + 1}</span>
              <Icon name={icon} size={22} />
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
