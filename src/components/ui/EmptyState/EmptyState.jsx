import { Icon } from "@/components/ui/Icon";
import { cx } from "@/core/utils/cx";

import styles from "./EmptyState.module.css";

/**
 * Estado vacío o informativo: icono, título, texto y acciones opcionales.
 * @param {Omit<import("react").ComponentPropsWithRef<"div">, "title"> & {
 *   icon?: string,
 *   title: string,
 *   description?: import("react").ReactNode,
 *   actions?: import("react").ReactNode,
 *   tone?: "neutral" | "brand" | "danger",
 *   compact?: boolean,
 *   headingLevel?: 1 | 2 | 3,
 * }} props
 */
export function EmptyState({
  icon = "info",
  title,
  description,
  actions,
  tone = "neutral",
  compact = false,
  headingLevel = 3,
  className,
  ...rest
}) {
  const Heading = `h${headingLevel}`;
  return (
    <div className={cx(styles.empty, styles[tone], compact && styles.compact, className)} {...rest}>
      <span className={styles.icon}>
        <Icon name={icon} size={compact ? 22 : 28} />
      </span>
      <Heading className={styles.title}>{title}</Heading>
      {description ? <div className={styles.description}>{description}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
