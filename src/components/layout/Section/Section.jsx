import { useId } from "react";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { cx } from "@/core/utils/cx";

import styles from "./Section.module.css";

/**
 * Bloque de página con encabezado opcional (etiqueta, título y descripción).
 * @param {Omit<import("react").ComponentPropsWithRef<"section">, "title"> & {
 *   title: string,
 *   eyebrow?: string,
 *   description?: string,
 *   tone?: "default" | "muted" | "brand",
 *   align?: "start" | "center",
 *   headingLevel?: 1 | 2,
 * }} props
 */
export function Section({
  title,
  eyebrow,
  description,
  tone = "default",
  align = "center",
  headingLevel = 2,
  className,
  children,
  ...rest
}) {
  const titleId = useId();
  const Heading = `h${headingLevel}`;

  return (
    <section
      aria-labelledby={titleId}
      className={cx(styles.section, styles[tone], className)}
      {...rest}
    >
      <Container className={styles.inner}>
        <header className={cx(styles.header, styles[align])}>
          {eyebrow ? <Badge tone="green">{eyebrow}</Badge> : null}
          <Heading id={titleId} className={styles.title}>
            {title}
          </Heading>
          {description ? <p className={styles.description}>{description}</p> : null}
        </header>
        {children}
      </Container>
    </section>
  );
}
