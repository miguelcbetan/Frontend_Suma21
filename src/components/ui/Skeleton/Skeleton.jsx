import { cx } from "@/core/utils/cx";

import styles from "./Skeleton.module.css";

/**
 * Bloque de carga. Es decorativo: quien lo usa anuncia la carga con un texto
 * `role="status"` (p. ej. dentro de un `<span className="sr-only">`).
 * @param {import("react").ComponentPropsWithRef<"div"> & {
 *   height?: string,
 *   width?: string,
 *   radius?: "sm" | "md" | "lg",
 * }} props
 */
export function Skeleton({ height = "1rem", width = "100%", radius = "md", className, style, ...rest }) {
  return (
    <div
      aria-hidden="true"
      className={cx(styles.skeleton, styles[radius], className)}
      style={{ height, width, ...style }}
      {...rest}
    />
  );
}
