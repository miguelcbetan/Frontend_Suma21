import { Badge } from "@/components/ui/Badge";
import { cx } from "@/core/utils/cx";

import styles from "./PageHeader.module.css";

/**
 * Encabezado de una página interna: etiqueta, título (`h1`), descripción y
 * acciones a la derecha.
 * @param {Omit<import("react").ComponentPropsWithRef<"header">, "title"> & {
 *   title: import("react").ReactNode,
 *   eyebrow?: string,
 *   description?: import("react").ReactNode,
 *   actions?: import("react").ReactNode,
 *   titleId?: string,
 * }} props
 */
export function PageHeader({ title, eyebrow, description, actions, titleId, className, ...rest }) {
  return (
    <header className={cx(styles.header, className)} {...rest}>
      <div className={styles.text}>
        {eyebrow ? <Badge tone="green">{eyebrow}</Badge> : null}
        <h1 id={titleId} className={styles.title}>
          {title}
        </h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
