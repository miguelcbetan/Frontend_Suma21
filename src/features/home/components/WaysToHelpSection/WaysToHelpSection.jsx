import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Section } from "@/components/layout/Section";
import { buttonClassName } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { inventoryService, toList } from "@/core/api";

import styles from "./WaysToHelpSection.module.css";

/** Número real de artículos que la fundación solicita hoy (`GET /inventory/needed`, público). */
function useNeededCount() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService
      .listNeeded()
      .then((payload) => !cancelled && setCount(toList(payload).length))
      .catch(() => !cancelled && setCount(null));
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}

/**
 * Las tres formas reales de apoyar desde la plataforma.
 * @param {{ donateButton?: import("react").ReactNode }} props
 */
export function WaysToHelpSection({ donateButton }) {
  const neededCount = useNeededCount();

  const ways = [
    {
      icon: "heart",
      tone: "orange",
      title: "Donación monetaria",
      description:
        "Elige un monto sugerido o escribe el tuyo y paga en línea con Wompi. Al aprobarse el pago puedes descargar tu certificado de donación.",
      action: donateButton,
    },
    {
      icon: "bag",
      tone: "green",
      title: "Tienda solidaria",
      description:
        "Compra productos de la tienda SUMA21. Agrega lo que quieras al carrito y paga de forma segura; cada compra apoya los programas de la asociación.",
      action: (
        <Link to="/apoyanos-tienda" className={buttonClassName({ variant: "outline" })}>
          Ver la tienda
          <Icon name="arrowRight" size={18} />
        </Link>
      ),
    },
    {
      icon: "package",
      tone: "green",
      title: "Donación en especie",
      description:
        "Consulta la lista de artículos que la fundación está solicitando, elige los que puedes aportar e indica la cantidad.",
      meta:
        neededCount > 0
          ? neededCount === 1
            ? "Hoy se solicita 1 artículo"
            : `Hoy se solicitan ${neededCount} artículos`
          : null,
      action: (
        <Link to="/donaciones-en-especie" className={buttonClassName({ variant: "outline" })}>
          Ver qué se necesita
          <Icon name="arrowRight" size={18} />
        </Link>
      ),
    },
  ];

  return (
    <Section
      id="como-apoyar"
      eyebrow="Formas de apoyar"
      title="Elige cómo quieres sumar"
      description="Tres maneras de aportar desde SUMA21. Para registrar tu aporte solo necesitas crear una cuenta."
    >
      <ul className={styles.grid}>
        {ways.map(({ icon, tone, title, description, meta, action }) => (
          <li key={title} className={styles.card}>
            <span className={`${styles.icon} ${styles[tone]}`}>
              <Icon name={icon} size={26} />
            </span>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
            {meta ? <p className={styles.meta}>{meta}</p> : null}
            {action ? <div className={styles.action}>{action}</div> : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
