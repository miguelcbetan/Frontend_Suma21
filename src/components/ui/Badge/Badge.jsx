import { cx } from "@/core/utils/cx";

import styles from "./Badge.module.css";

/**
 * Etiqueta corta.
 * @param {import("react").ComponentPropsWithRef<"span"> & {
 *   tone?: "neutral" | "green" | "orange" | "danger",
 * }} props
 */
export function Badge({ tone = "neutral", className, ...rest }) {
  return <span className={cx(styles.badge, styles[tone], className)} {...rest} />;
}
