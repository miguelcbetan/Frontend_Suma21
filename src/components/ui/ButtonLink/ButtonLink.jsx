import { buttonClassName } from "@/components/ui/Button";
import { cx } from "@/core/utils/cx";

import styles from "./ButtonLink.module.css";

/**
 * Enlace con el aspecto de `Button`.
 * @param {import("react").ComponentPropsWithRef<"a"> & {
 *   variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerSolid",
 *   size?: "sm" | "md" | "lg",
 *   block?: boolean,
 * }} props
 */
export function ButtonLink({ variant, size, block, className, children, ...rest }) {
  return (
    <a
      className={buttonClassName({ variant, size, block, className: cx(styles.link, className) })}
      {...rest}
    >
      {children}
    </a>
  );
}
